import type WebSocket from "ws";
import type http from "http";
import jwt from "jsonwebtoken";
import prisma from "../db/prisma";
import { JWT_SECRET } from "../config";
import { ClientInfo } from "../types/ClientInfo";

function formatUser(user: any) {
  return {
    id: Number(user.id),
    username: user.username || "Unknown",
    avatar: user.avatar || null,
    customAvatar: user.customAvatar || false,
    customAvatarUrl: user.customAvatarUrl || null,
    isAdmin: user.isAdmin || false,
  };
}

export class ChatServer {
  private clients = new Map<string, ClientInfo>();

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
      console.error("Chat WS URL parse error:", err);
    }

    if (!accessToken) {
      console.log(`Chat WS connection rejected (no token): ${id}`);
      ws.close(4001, "Token required");
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

      info.user = {
        id: String(dbUser.id),
        username: dbUser.username ?? null,
        avatar: dbUser.avatar ?? null,
        isAdmin: (dbUser as any).isAdmin ?? false,
      };
      info.name = dbUser.username ?? info.name;

      this.clients.set(id, info);

      ws.on("message", (data) => this.handleMessage(id, data));
      ws.on("close", () => this.unregister(id));
      ws.on("error", (err) => console.error("Chat WS error:", err));

      // Send welcome
      this.send(ws, {
        type: "chat:welcome",
        payload: { id, user: formatUser(dbUser) },
      });

      // Send last 100 messages from DB
      const dbMessages = await (prisma as any).chatMessage.findMany({
        where: { channel: "general" },
        orderBy: { createdAt: "asc" },
        take: 100,
        include: { user: true },
      });

      const messages = dbMessages.map((msg: any) => ({
        id: msg.id,
        content: msg.content,
        createdAt: msg.createdAt.toISOString(),
        channel: msg.channel,
        user: formatUser(msg.user),
      }));

      this.send(ws, { type: "chat:history", payload: { messages } });

      this.broadcastOnlineUsers();
      console.log(`chat client connected: ${id} (${info.user.username})`);
    } catch (err: any) {
      console.debug("Chat WS token verification failed for client", id, err);
      const isExpired = err?.name === "TokenExpiredError";
      ws.close(4001, isExpired ? "token_expired" : "invalid_token");
    }
  }

  private async handleMessage(id: string, data: WebSocket.Data) {
    const raw = data.toString();
    let parsed: any = null;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return;
    }

    if (!parsed || typeof parsed.type !== "string") return;

    if (parsed.type === "ping") {
      const client = this.clients.get(id);
      if (client) {
        this.send(client.ws, { type: "pong", payload: { timestamp: Date.now() } });
      }
      return;
    }

    const client = this.clients.get(id);
    if (!client || !client.user) return;

    switch (parsed.type) {
      case "chat:send": {
        const content = parsed.payload?.content;
        if (typeof content !== "string" || !content.trim()) return;
        const text = content.trim();
        if (text.length > 1000) {
          this.send(client.ws, {
            type: "chat:error",
            message: "Message too long (max 1000 characters)",
          });
          return;
        }

        try {
          const dbMsg = await (prisma as any).chatMessage.create({
            data: {
              content: text,
              userId: Number(client.user.id),
              channel: "general",
            },
            include: { user: true },
          });

          const payload = {
            id: dbMsg.id,
            content: dbMsg.content,
            createdAt: dbMsg.createdAt.toISOString(),
            channel: dbMsg.channel,
            user: formatUser(dbMsg.user),
          };

          this.broadcast({ type: "chat:message", payload });
        } catch (err) {
          console.error("Failed to save chat message:", err);
          this.send(client.ws, {
            type: "chat:error",
            message: "Failed to send message",
          });
        }
        break;
      }

      case "chat:delete": {
        // PER USER REVIEW REQUIREMENT: Only admins can delete messages
        if (!client.user.isAdmin) {
          this.send(client.ws, {
            type: "chat:error",
            message: "Only admins can delete messages",
          });
          return;
        }

        const msgId = Number(parsed.payload?.id);
        if (Number.isNaN(msgId)) return;

        try {
          await (prisma as any).chatMessage.deleteMany({ where: { id: msgId } });
          this.broadcast({ type: "chat:deleted", payload: { id: msgId } });
        } catch (err) {
          console.error("Failed to delete chat message:", err);
        }
        break;
      }

      case "chat:clear": {
        // Only admins can clear the chat
        if (!client.user.isAdmin) {
          this.send(client.ws, {
            type: "chat:error",
            message: "Only admins can clear chat",
          });
          return;
        }

        try {
          await (prisma as any).chatMessage.deleteMany({ where: { channel: "general" } });
          this.broadcast({ type: "chat:cleared" });
        } catch (err) {
          console.error("Failed to clear chat messages:", err);
        }
        break;
      }
    }
  }

  private unregister(id: string) {
    const info = this.clients.get(id);
    if (!info) return;
    this.clients.delete(id);
    this.broadcastOnlineUsers();
    console.log(`chat client disconnected: ${id}`);
  }

  getOnlineUsers() {
    const userMap = new Map<number, any>();
    for (const c of this.clients.values()) {
      if (c.user) {
        const userId = Number(c.user.id);
        if (!userMap.has(userId)) {
          userMap.set(userId, {
            id: userId,
            username: c.user.username ?? "Unknown",
            avatar: c.user.avatar ?? null,
            isAdmin: c.user.isAdmin ?? false,
          });
        }
      }
    }
    const users = Array.from(userMap.values());
    return { count: users.length, users };
  }

  broadcastOnlineUsers() {
    this.broadcast({
      type: "chat:online_users",
      payload: this.getOnlineUsers(),
    });
  }

  broadcast(msg: unknown) {
    const text = JSON.stringify(msg);
    for (const c of this.clients.values()) {
      try {
        c.ws.send(text);
      } catch (err) {
        console.error("Chat broadcast error to client", c.id, err);
      }
    }
  }

  send(ws: WebSocket, msg: unknown) {
    try {
      ws.send(JSON.stringify(msg));
    } catch (err) {
      console.error("Chat send error", err);
    }
  }
}

export const chatServer = new ChatServer();
export default ChatServer;
