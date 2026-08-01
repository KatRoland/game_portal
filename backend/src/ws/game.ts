import WebSocket from "ws";
import type http from "http";
import jwt from "jsonwebtoken";
import prisma from "../db/prisma";
import { Lobby } from "../types/Lobby";
import { Game } from "../types/Game";
import { ClientInfo } from "../types/ClientInfo";
import { GameMode } from "../types/GameMode";
import { QA } from "../types/gamemode/QA";
import { IGameModeHandler, GameModeContext } from "../types/GameModeHandler";
import { MusicQuizHandler } from "./gamemodes/mq";
import { UnoHandler } from "./gamemodes/uno";
import { Scoreboard } from "../types/Score";
import { NextGameMode } from "../types/NextGameMode";
import { MUSIC_QUIZ } from "../types/gamemode/MUSIC_QUIZ";
import {
  KaraokePlaylist,
  KaraokeCurrentSong,
  KaraokeFile,
  Karaoke_Solo,
  Karaoke_Duett,
  KaraokePlayerSegment
} from "../types/gamemode/KARAOKE";

import { createGameModeData } from "../factories/GameModeData";

import { JWT_SECRET } from "../config";
import { endGame } from "./handlers";

interface CommandContext {
  id: string;
  gameId: string | null;
  game: Game | null;
  user: { id: string; username?: string | null; avatar?: string | null; isAdmin?: boolean };
  clientInfo: ClientInfo;
  payload: any;
  server: GameServer;
  broadcastToLobby: (msg: any) => void;
  sendToClient: (msg: any) => void;
}

interface ICommand {
  requireHost?: boolean;
  requireGame?: boolean;
  execute: (ctx: CommandContext) => Promise<void> | void;
}

function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// const COMPONENT_HANDLERS: Record<string, Function> = {
//   qa: handleQAMessages,
//   btn: handleBTNMessage,
//   mq: handleMQMessages,
//   ks: handleKSMessages,
//   kd: handleKDMessages,
//   sop: handleSOPMessages,
//   soppl: handleSOPPLMessages,
// };

const COMPONENT_HANDLERS: Record<string, IGameModeHandler> = {
  mq: new MusicQuizHandler(),
  uno: new UnoHandler(),
  // qa: new QAHandler(),
  // btn: new ButtonClickerHandler(),
};

const CoreCommands = new Map<string, ICommand>();

// game:init removed — initialization is now handled by GameServer.initGame() called from lobby via handlers.ts

CoreCommands.set("game:load", {
  requireGame: true,
  execute: (ctx) => {
    const gameCopy = { ...ctx.game! };
    if (gameCopy.mode === GameMode.MUSIC_QUIZ && gameCopy.currentGameModeData) {
      gameCopy.currentGameModeData = { ...gameCopy.currentGameModeData, currentTrack: null, tracks: [] } as any;
    }
    ctx.sendToClient({ type: "game:load:response", payload: { game: gameCopy } });
  }
});

CoreCommands.set("game:increment_score", {
  requireGame: true,
  requireHost: true,
  execute: (ctx) => {
    const playerId = typeof ctx.payload.playerId === "string" ? ctx.payload.playerId : null;
    const increment = typeof ctx.payload.increment === "number" ? ctx.payload.increment : 1;
    if (!playerId || !ctx.game?.currentGameModeData) return;
    const scoreEntry = (ctx.game.currentGameModeData.Scoreboard as Scoreboard).scores.find(s => s.playerId === playerId);
    if (scoreEntry) {
      scoreEntry.score += increment;
      ctx.broadcastToLobby({ type: "game:score_updated", payload: { Scoreboard: ctx.game.currentGameModeData.Scoreboard } });
    }
  }
});

CoreCommands.set("game:decrement_score", {
  requireGame: true,
  requireHost: true,
  execute: (ctx) => {
    const playerId = typeof ctx.payload.playerId === "string" ? ctx.payload.playerId : null;
    const decrement = typeof ctx.payload.decrement === "number" ? ctx.payload.decrement : 1;
    if (!playerId || !ctx.game?.currentGameModeData) return;
    const scoreEntry = (ctx.game.currentGameModeData.Scoreboard as Scoreboard).scores.find(s => s.playerId === playerId);
    if (scoreEntry) {
      scoreEntry.score -= decrement;
      ctx.broadcastToLobby({ type: "game:score_updated", payload: { Scoreboard: ctx.game.currentGameModeData.Scoreboard } });
    }
  }
});

CoreCommands.set("game:end_game_mode", {
  requireGame: true,
  execute: (ctx) => {
    ctx.game!.mode = "NONE" as any; // Játékmódok közötti üres állapot átmenet
    ctx.broadcastToLobby({ type: "game:game_mode_ended", payload: { game: ctx.game } });
  }
});

CoreCommands.set("game:next_game_mode", {
  requireGame: true,
  requireHost: true,
  execute: async (ctx) => {
    const game = ctx.game!;
    if (game.nextGameModes.length > 0) {
      const nextMode = game.nextGameModes.shift()!;
      game.mode = nextMode.type;
      game.currentGameModeData = null;

      if (nextMode.type === GameMode.QA) {
        game.currentGameModeData = { question: null, answers: [], Scoreboard: game.Scoreboard } as any;
      }
      else if (nextMode.type === GameMode.MUSIC_QUIZ) {
        if (!nextMode.playlist) return ctx.sendToClient({ type: "game:error", message: "music_quiz_requires_playlist" });
        const playlist = await prisma.musicQuizPlaylistTrack.findMany({ where: { playlistId: nextMode.playlist }, include: { track: true } });
        if (!playlist || playlist.length === 0) return ctx.sendToClient({ type: "game:error", message: "music_quiz_playlist_not_found" });
        const shuffledTracks = shuffleArray(playlist);
        game.currentGameModeData = { currentTrackIndex: 0, currentTrack: shuffledTracks[0].track, tracks: shuffledTracks.map(t => t.track), Scoreboard: game.Scoreboard, replays: [], answers: [] } as any;
        (game.currentGameModeData as any).trackLength = shuffledTracks.length;
      } else if (nextMode.type === GameMode.SMASH_OR_PASS) {
        const order = shuffleArray(game.lobby.players.map(p => String(p.id)));
        game.currentGameModeData = { order, currentIndex: 0, submissions: [], isVotingOpen: false, Scoreboard: game.Scoreboard } as any;
      } else if (nextMode.type === GameMode.SMASH_OR_PASS_PLAYLIST) {
        game.currentGameModeData = { items: [], currentIndex: 0, currentVotes: [], pickerId: null, Scoreboard: game.Scoreboard } as any;
      }

      const { currentGameModeData, ...safeGame } = game;
      const safeCurrentGameModeData = currentGameModeData ? { ...currentGameModeData, tracks: undefined, currentTrack: undefined } : undefined;
      ctx.broadcastToLobby({ type: "game:next_game_mode_started", payload: { game: { ...safeGame, currentGameModeData: safeCurrentGameModeData } } });
    } else {
      game.mode = GameMode.Ended;
      ctx.broadcastToLobby({ type: "game:game_ended", payload: { game: game } });
    }
  }
});

CoreCommands.set("game:end_game", {
  requireGame: true,
  requireHost: true,
  execute: (ctx) => {
    ctx.game!.mode = GameMode.Ended;
    ctx.broadcastToLobby({ type: "game:game_ended", payload: { game: ctx.game } });
    ctx.server.removeGame(ctx.gameId!);
  }
});

CoreCommands.set("game:finish", {
  requireGame: true,
  requireHost: true,
  execute: (ctx) => {
    ctx.server.removeGame(ctx.gameId!);
    endGame(ctx.gameId!);
    ctx.sendToClient({ type: "game:finished_response_host", payload: { lobbyId: ctx.gameId } });
  }
});

export class GameServer {
  private clients = new Map<string, ClientInfo>();
  private games = new Array<Game>();

  public getGames(): Game[] {
    return this.games;
  }

  public removeGame(gameId: string) {
    const gameIndex = this.games.findIndex((g: any) => g.id === gameId);
    if (gameIndex !== -1) {
      this.games.splice(gameIndex, 1);
      console.log(`[Garbage Collection] Room ${gameId} successfully purged from RAM.`);
    }
  }

  public async initGame(gameId: string, lobby: Lobby): Promise<void> {
    const existingGame = this.games.find((g: any) => g.id === gameId);
    if (existingGame) {
      console.warn(`[GameServer.initGame] Game ${gameId} already exists, skipping init.`);
      return;
    }

    const placeholder = { id: gameId, state: "initializing" } as any;
    this.games.push(placeholder);

    try {
      const ScoreboardObj: Scoreboard = {
        scores: lobby.players.map((p: any) => ({ playerId: String(p.id), playerName: p.username || 'Anonymous', score: 0 }))
      };

      if (!lobby.gameModeOrder || lobby.gameModeOrder.length === 0) {
        this.removeGame(gameId);
        console.error(`[GameServer.initGame] No game modes configured for game ${gameId}`);
        return;
      }

      // Take the first game mode from the order
      const gameModeOrderCopy = [...lobby.gameModeOrder];
      const FirstGameMode = gameModeOrderCopy.shift()!;

      const game: Game = {
        id: gameId,
        lobby: lobby,
        startedAt: new Date().toISOString(),
        mode: FirstGameMode.type,
        nextGameModes: gameModeOrderCopy,
        Scoreboard: ScoreboardObj,
        state: "active" as any
      };

      game.currentGameModeData = await createGameModeData(
        game.mode,
        FirstGameMode.playlist,
        game.lobby.players,
        ScoreboardObj
      );

      const idx = this.games.findIndex((g: any) => g.id === gameId);
      if (idx !== -1) this.games[idx] = game;

      console.log(`[GameServer.initGame] Game ${gameId} initialized with mode ${game.mode}`);

    } catch (error) {
      this.removeGame(gameId);
      console.error(`[GameServer.initGame] Failed to initialize game ${gameId}:`, error);
    }
  }

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
      console.error("Failed to parse URL", err);
    }

    const info: ClientInfo = { id, ws, remote, accessToken };

    if (accessToken) {
      try {
        const payload = (jwt as any).verify(accessToken, JWT_SECRET) as any;
        const sub = payload && (payload.sub ?? payload.userId ?? payload.id);
        if (sub) {
          const userId = Number(sub);
          if (!Number.isNaN(userId)) {
            const dbUser = await prisma.user.findUnique({ where: { id: userId } });
            if (dbUser) {
              info.user = { id: String(dbUser.id), username: dbUser.username ?? null, avatar: dbUser.avatar ?? null, isAdmin: (dbUser as any).isAdmin ?? false };
              info.name = dbUser.username ?? info.name;
            }
          }
        }
      } catch (err) {
        console.debug("WS token verification failed for client", id);
      }
    }

    this.clients.set(id, info);

    ws.on("message", (data) => this.handleMessage(id, data));
    ws.on("close", () => this.unregister(id));
    ws.on("error", (err) => console.error("WS error:", err));

    this.send(ws, { type: "game:welcome", payload: { id } });
    console.log(`game client connected: ${id}`);
  }

  private async handleMessage(id: string, data: WebSocket.Data) {
    const raw = data.toString();
    let parsed: any = null;
    try {
      parsed = JSON.parse(raw);
    } catch { return; }

    if (!parsed || typeof parsed.type !== "string") return;

    const clientInfo = this.clients.get(id);
    const user = clientInfo?.user;
    if (!clientInfo || !user) return;

    const prefix = parsed.type.split(":")[0];
    const moduleHandler = COMPONENT_HANDLERS[prefix];

    if (moduleHandler) {
      const gameId = typeof parsed.payload?.gameId === "string" ? parsed.payload.gameId : null;
      const game = gameId ? (this.games.find(g => g.id === gameId) ?? null) : null;

      if (!game || (game as any).state === "initializing") return;

      const gameModeCtx: GameModeContext = {
        userId: user.id,
        user: user,
        game: game,
        payload: parsed.payload || {},
        dataType: parsed.type,
        broadcast: (msg: any) => this.broadcastToLobby(gameId!, msg),
        send: (msg: any) => this.send(clientInfo.ws, msg),
        sendToUser: (uid: string, msg: any) => this.sendToUser(gameId!, uid, msg)
      };

      try {
        await moduleHandler.handleMessage(gameModeCtx);
      } catch (error) {
        console.error(`[Router Error] Handler for '${prefix}' crashed:`, error);
      }
      return;
    }

    const command = CoreCommands.get(parsed.type);
    if (!command) return;

    const gameId = typeof parsed.payload?.gameId === "string" ? parsed.payload.gameId : null;
    const game = gameId ? (this.games.find(g => g.id === gameId) ?? null) : null;

    if (command.requireGame && (!game || (game as any).state === "initializing")) {
      this.send(clientInfo.ws, { type: "game:not_found", message: "invalid_game_id" });
      return;
    }

    if (command.requireHost && game?.lobby?.host?.id !== user.id) {
      this.send(clientInfo.ws, { type: "game:not_authorized", message: "not_authorized" });
      return;
    }

    const ctx: CommandContext = {
      id,
      gameId,
      game,
      user,
      clientInfo,
      payload: parsed.payload || {},
      server: this,
      broadcastToLobby: (msg) => { if (gameId) this.broadcastToLobby(gameId, msg); },
      sendToClient: (msg) => this.send(clientInfo.ws, msg),
    };

    try {
      await command.execute(ctx);
    } catch (error) {
      console.error(`[Core Router] FATAL Command Crash on '${parsed.type}':`, error);
      this.send(clientInfo.ws, { type: "game:server_error", message: "internal_server_error" });
    }
  }

  private unregister(id: string) {
    const info = this.clients.get(id);
    if (!info) return;
    this.clients.delete(id);

    // BIZTONSÁGI GARBAGE COLLECTION: Ha elszáll a host, takarítjuk az elárvult lobbit a RAM-ból
    const userId = info.user?.id;
    if (userId) {
      this.games.forEach((game) => {
        if (game.lobby?.host?.id === userId) {
          console.log(`[Garbage Collection] Host disconnected. Purging orphaned lobby: ${game.id}`);
          this.broadcastToLobby(game.id, { type: "game:error", message: "host_disconnected" });
          this.removeGame(game.id);
        }
      });
    }

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
    const lobby = this.games.find(l => l.id === lobbyId);
    if (!lobby || (lobby as any).state === "initializing") return;
    const text = JSON.stringify(msg);
    for (const c of this.clients.values()) {
      if (!lobby.lobby.players.find(p => p.id == c.user?.id)) continue;
      try {
        c.ws.send(text);
      } catch (err) {
        console.error("Broadcast error to lobby client", c.id, err);
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

  sendToPlayer(lobbyId: string, uid: string, msg: unknown) {
    const lobby = this.games.find(l => l.id === lobbyId);
    if (!lobby) return;
    const text = JSON.stringify(msg);
    for (const c of this.clients.values()) {
      if (c.id == uid) {
        try {
          c.ws.send(text);
        } catch {
          console.error("failed to send to user");
        }
      }
    }
  }

  sendToUser(lobbyId: string, userId: string, msg: unknown) {
    const lobby = this.games.find(l => l.id === lobbyId);
    if (!lobby) return;
    const text = JSON.stringify(msg);
    for (const c of this.clients.values()) {
      if (c.user?.id == userId) {
        try {
          c.ws.send(text);
        } catch (err) {
          console.error("Failed to send to user", userId, err);
        }
      }
    }
  }

  getUserList() {
    return Array.from(this.clients.values()).map((c) => ({ id: c.id, name: c.name ?? null, remote: c.remote }));
  }
}

export const gameServer = new GameServer();
export default gameServer;