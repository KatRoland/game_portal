import type WebSocket from "ws";
import type http from "http";
import jwt from "jsonwebtoken";
import prisma from "../db/prisma";
import { Lobby } from "../types/Lobby";
import { gameInit } from "./handlers";
import { JWT_SECRET } from "../config";

type ClientInfo = {
  id: string;
  ws: WebSocket;
  name?: string | null;
  remote?: string | undefined;
  accessToken?: string | undefined;
  user?: { id: string; username?: string | null; avatar?: string | null; isAdmin?: boolean } | undefined;
};

class LobbyServer {
  private clients = new Map<string, ClientInfo>();
  private Lobbies = new Array<Lobby>();

  async register(ws: WebSocket, req: http.IncomingMessage) {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const remote = req.socket.remoteAddress ?? undefined;
    let accessToken: string | undefined = undefined;
    try {
      if (req.url) {
        const base = `http://${req.headers.host ?? "localhost"}`;
        const u = new URL(req.url, base);
        accessToken = u.searchParams.get("token") ?? undefined;
      }
    } catch (err) {
    }

    if (!accessToken) {
      console.log(`WS connection rejected (no token): ${id}`);
      ws.close(1008, "Token required");
      return;
    }

    const info: ClientInfo = { id, ws, remote, accessToken };

    try {
      const payload = (jwt as any).verify(accessToken, JWT_SECRET) as any;
      const sub = payload && (payload.sub ?? payload.userId ?? payload.id);
      if (!sub) throw new Error("No sub in token");

      const userId = Number(sub);
      if (Number.isNaN(userId)) throw new Error("Invalid userId");

      const dbUser = await prisma.user.findUnique({ where: { id: userId } });
      if (!dbUser) throw new Error("User not found");

      info.user = { id: String(dbUser.id), username: dbUser.username ?? null, avatar: dbUser.avatar ?? null, isAdmin: (dbUser as any).isAdmin ?? false };
      info.name = dbUser.username ?? info.name;

    } catch (err) {
      console.debug("WS token verification failed for client", id, err);
      ws.close(1008, "Invalid token");
      return;
    }

    this.clients.set(id, info);

    ws.on("message", (data) => this.handleMessage(id, data));
    ws.on("close", () => this.unregister(id));
    ws.on("error", (err) => console.error("WS error:", err));

    this.send(ws, { type: "lobby:welcome", payload: { id, name: info.name ?? null } });

    console.log(`lobby client connected: ${id}`);
  }

  private handleMessage(id: string, data: WebSocket.Data) {
    const raw = data.toString();
    let parsed: any = null;
    try {
      parsed = JSON.parse(raw);
    } catch {
      const info = this.clients.get(id);
      const text = raw;

      return;
    }

    if (!parsed || typeof parsed.type !== "string") return;

    if (parsed.type === "ping") {
      this.send(this.clients.get(id)!.ws, { type: "pong", payload: { timestamp: Date.now() } });
      return;
    }

    if (!parsed.type.startsWith('lobby:')) return;

    switch (parsed.type) {

      case "lobby:create": {
        const clientInfo = this.clients.get(id);
        if (!clientInfo || !clientInfo.user || !(clientInfo.user as any).isAdmin) {
          this.send(this.clients.get(id)!.ws, { type: "lobby:create:error", message: "insufficient_privileges" });
          break;
        }

        const lobbyName = typeof parsed.payload?.name === "string" ? parsed.payload.name : "Unnamed Lobby";
        const newLobby: Lobby = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          name: lobbyName,
          players: [],
          host: this.clients.get(id)!.user!,
          createdAt: new Date().toISOString(),
          state: 'waiting'
        };
        this.Lobbies.push(newLobby);
        this.send(this.clients.get(id)!.ws, { type: "lobby:create:success", payload: newLobby });
        this.broadcast({ type: "lobby:created", payload: newLobby });
        break;
      }

      case "lobby:update_gameOrder": {
        const lobbyId = typeof parsed.payload?.lobbyId === "string" ? parsed.payload.lobbyId : null;
        const gameModeOrder = Array.isArray(parsed.payload?.gameModeOrder) ? parsed.payload.gameModeOrder : null;
        const lobby = this.Lobbies.find(l => l.id === lobbyId);
        const clientInfo = this.clients.get(id);
        if (!lobby || !clientInfo || !clientInfo.user) {
          if (clientInfo) this.send(clientInfo.ws, { type: "lobby:update_gameOrder:error", message: "lobby_not_found_or_invalid_user" });
          break;
        }
        if (lobby.host.id !== clientInfo.user.id) {
          this.send(clientInfo.ws, { type: "lobby:update_gameOrder:error", message: "insufficient_privileges" });
          break;
        }
        if (gameModeOrder) {
          lobby.gameModeOrder = gameModeOrder;
          this.broadcastToLobby(lobby.id, { type: "lobby:gameOrder_updated", payload: { lobbyId: lobby.id, gameModeOrder: lobby.gameModeOrder } });
        }
        break;
      }

      case "lobby:join": {
        const lobbyId = typeof parsed.payload?.lobbyId === "string" ? parsed.payload.lobbyId : null;
        const lobby = this.Lobbies.find(l => l.id === lobbyId);
        const clientInfo = this.clients.get(id);
        console.log(`lobby:join ${lobbyId} ${clientInfo?.user?.id}`)
        if (lobby && clientInfo && clientInfo.user) {
          console.log("step 1")
          if (lobby.players.find(p => p.id === clientInfo.user!.id)) {
            console.log("step 2")
            if (lobby.state === 'started') {
              this.send(clientInfo.ws, { type: "lobby:join:success:started", payload: { lobbyId: lobbyId } });
              return;
            }
            console.log(`lobby:join:success ${lobbyId} ${clientInfo.user.id}`)
            this.send(clientInfo.ws, { type: "lobby:join:success", payload: lobby });
            break;
          }
          if (lobby.state === 'started') {
            this.send(clientInfo.ws, { type: "lobby:join:error:started", payload: lobbyId });
            return;
          }
          lobby.players.push(clientInfo.user);
          this.broadcast({ type: "lobby:player_joined", payload: { lobbyId: lobby.id, player: clientInfo.user } });
          this.send(clientInfo.ws, { type: "lobby:join:success", payload: lobby });
          this.broadcast({ type: "lobby:update_lobbies", payload: { lobbies: this.Lobbies } });
        } else {
          this.send(clientInfo!.ws, { type: "lobby:join:error", message: "lobby_not_found_or_invalid_user" });
        }
        break;
      }

      case "lobby:leave": {
        const lobbyId = typeof parsed.payload?.lobbyId === "string" ? parsed.payload.lobbyId : null;
        const lobby = this.Lobbies.find(l => l.id === lobbyId);
        const clientInfo = this.clients.get(id);
        if (lobby && clientInfo && clientInfo.user) {

          if (lobby.host.id === clientInfo.user.id) {
            this.Lobbies = this.Lobbies.filter(l => l.id !== lobby.id);
            this.broadcast({ type: "lobby:dissolved", payload: { lobbyId: lobby.id } });
            this.broadcast({ type: "lobby:update_lobbies", payload: { lobbies: this.Lobbies } });
            break;
          }

          lobby.players = lobby.players.filter(p => p.id !== clientInfo.user!.id);
          this.broadcast({ type: "lobby:player_left", payload: { lobbyId: lobby.id, playerId: clientInfo.user.id } });
          this.broadcast({ type: "lobby:update_lobbies", payload: { lobbies: this.Lobbies } });
        }
        break;
      }

      case "lobby:list": {
        const clientInfo = this.clients.get(id);
        if (clientInfo) {
          if (this.Lobbies.find(l => l.players.find(p => p.id === clientInfo.user?.id))) {
            const userLobby = this.Lobbies.find(l => l.players.find(p => p.id === clientInfo.user?.id));
            this.send(clientInfo.ws, { type: "lobby:list:already_joined", payload: { lobbyId: userLobby?.id } });
            break;
          }
          this.send(clientInfo.ws, { type: "lobby:list:response", payload: { lobbies: this.Lobbies } });
        }
        break;
      }

      case "lobby:ping": {
        this.send(this.clients.get(id)!.ws, { type: "lobby:pong", payload: { timestamp: Date.now() } });
        break;
      }

      case "lobby:start": {
        const lobbyId = typeof parsed.payload?.lobbyId === "string" ? parsed.payload.lobbyId : null;
        const lobby = this.Lobbies.find(l => l.id === lobbyId);
        const clientInfo = this.clients.get(id);
        if (!lobby || !clientInfo || !clientInfo.user) {
          if (clientInfo) this.send(clientInfo.ws, { type: "lobby:start:error", message: "lobby_not_found_or_invalid_user" });
          break;
        }

        if (lobby.host.id !== clientInfo.user.id) {
          this.send(clientInfo.ws, { type: "lobby:start:error", message: "insufficient_privileges" });
          break;
        }

        if (lobby.state === 'started') {
          this.send(clientInfo.ws, { type: "lobby:start:error", message: "lobby_already_started" });
          break;
        }

        if (!lobby.gameModeOrder || lobby.gameModeOrder.length === 0) {
          this.send(clientInfo.ws, { type: "lobby:start:error", message: "no_game_modes_configured" });
          break;
        }

        gameInit(id, lobby.id, lobby, this.clients.get(id)!);

        lobby.state = 'started';
        const payload = { lobbyId: lobby.id, startedAt: new Date().toISOString() };
        this.broadcastToLobby(lobby.id, { type: "lobby:started", payload });
        this.broadcast({ type: "lobby:update_lobbies", payload: { lobbies: this.Lobbies } });
        break;
      }

      case "lobby:game_finished": {
        const lobbyId = typeof parsed.payload?.lobbyId === "string" ? parsed.payload.lobbyId : null;
        const lobby = this.Lobbies.find(l => l.id === lobbyId);
        if (lobby) {
          lobby.state = 'waiting';
          this.broadcastToLobby(lobby.id, { type: "lobby:game_finished", payload: { lobbyId: lobbyId } });
        }
        break;
      }

      default:
        if (parsed.type == "ping") return;
        this.send(this.clients.get(id)!.ws, { type: "error", message: "unknown_type" });
    }
  }

  private unregister(id: string) {
    console.log('Unregistering client', id);
    const info = this.clients.get(id);
    if (!info) return;
    this.clients.delete(id);
    this.broadcast({ type: "user_left", payload: { id, name: info.name ?? null } });
    this.broadcast({ type: "user_list", payload: this.getUserList() });
  }

  broadcast(msg: unknown) {
    const text = JSON.stringify(msg);
    for (const c of this.clients.values()) {
      try {
        c.ws.send(text);
      } catch (err) {
        console.error("Broadcast error to client", c.id, err);
      }
    }
  }

  broadcastToLobby(lobbyId: string, msg: unknown) {
    console.log(`clients length: ${this.clients.size}`);
    const lobby = this.Lobbies.find(l => l.id === lobbyId);
    if (!lobby) return;
    const text = JSON.stringify(msg);
    for (const c of this.clients.values()) {
      if (!lobby.players.find(p => p.id == c.user?.id)) continue;
      try {
        c.ws.send(text);
      } catch (err) {
      }
    }
  }

  send(ws: WebSocket, msg: unknown) {
    try {
      ws.send(JSON.stringify(msg));
    } catch (err) {
      console.error("Send error", err);
    }
  }

  getUserList() {
    return Array.from(this.clients.values()).map((c) => ({ id: c.id, name: c.name ?? null, remote: c.remote }));
  }

  public endGame(lobbyId: string) {
    const lobby = this.Lobbies.find(l => l.id === lobbyId);
    if (!lobby) return;
    lobby.state = 'waiting';
    this.broadcastToLobby(lobby.id, { type: "lobby:game_finished", payload: { lobbyId: lobbyId } });
  }
}

export const lobbyServer = new LobbyServer();

export default LobbyServer;
