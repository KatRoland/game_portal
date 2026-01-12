import WebSocket from "ws";
import type http from "http";
import jwt from "jsonwebtoken";
import prisma from "../db/prisma";
import { Lobby } from "../types/Lobby";
import { Game } from "../types/Game";
import { GameMode } from "../types/GameMode";
import { QA } from "../types/gamemode/QA";
import { handleQAMessages } from "./gamemodes/qa";
import { handleBTNMessage } from "./gamemodes/btnclicker";
import { handleMQMessages } from "./gamemodes/mq";
import { handleKSMessages } from "./gamemodes/ks";
import { handleSOPMessages } from "./gamemodes/sop";
import { handleSOPPLMessages } from "./gamemodes/sop_playlist";
import { Scoreboard, Score } from "../types/Score";
import { NextGameMode } from "../types/NextGameMode";
import e from "express";
import { MUSIC_QUIZ } from "../types/gamemode/MUSIC_QUIZ";
import { KaraokeSong, KaraokeSongSegment, KaraokeSongLyrics, KaraokePlaylist, Karaoke, KaraokeCurrentSong, KaraokeFile, Karaoke_Solo, Karaoke_Duett, KaraokeVote, KaraokePlayerSegment } from "../types/gamemode/KARAOKE"
import { handleKDMessages } from "./gamemodes/kd";
import { SMASH_OR_PASS } from "../types/gamemode/SMASH_OR_PASS";

import { JWT_SECRET } from "../config";
import { endGame } from "./handlers";

type ClientInfo = {
  id: string;
  ws: WebSocket;
  name?: string | null;
  remote?: string | undefined;
  accessToken?: string | undefined;
  user?: { id: string; username?: string | null; avatar?: string | null; isAdmin?: boolean } | undefined;
};

class GameServer {
  private clients = new Map<string, ClientInfo>();
  private games = new Array<Game>();

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
    } catch { }

    if (!parsed || typeof parsed.type !== "string") return;

    const user = this.clients.get(id)?.user;
    if (!user) return;

    if (parsed.type.startsWith("qa:")) {
      const gameId = typeof parsed.payload?.gameId === "string" ? parsed.payload.gameId : null;
      const game = this.games.find(g => g.id === gameId);
      const clientInfo = this.clients.get(id);
      if (!clientInfo) return;
      const clientUser = clientInfo.user ?? null;
      (parsed as any).clientUser = clientUser;
      handleQAMessages(clientUser, parsed, (game as Game), (msg) => this.broadcastToLobby(parsed.payload.gameId, msg), (msg) => this.send.bind(this, this.clients.get(id)!.ws, msg));
      console.log("new GameData: ", game);
      return;
    };

    if (parsed.type.startsWith("btn:")) {
      const gameId = typeof parsed.payload?.gameId === "string" ? parsed.payload.gameId : null;
      const game = this.games.find(g => g.id === gameId);
      const clientInfo = this.clients.get(id);
      console.log("btn message received:", parsed);
      if (!clientInfo) return;
      console.log("client info exists");
      const clientUser = clientInfo.user ?? null;
      (parsed as any).clientUser = clientUser;
      handleBTNMessage(clientUser, parsed, (game as Game), (msg) => this.broadcastToLobby(parsed.payload.gameId, msg), (msg) => this.send.bind(this, this.clients.get(id)!.ws, msg));
      console.log("new GameData: ", game);
      return;
    }

    if (parsed.type.startsWith("mq:")) {
      const gameId = typeof parsed.payload?.gameId === "string" ? parsed.payload.gameId : null;
      const game = this.games.find(g => g.id === gameId);
      const clientInfo = this.clients.get(id);
      if (!clientInfo) return;
      const clientUser = clientInfo.user ?? null;
      (parsed as any).clientUser = clientUser;
      handleMQMessages(clientUser, parsed, (game as Game), (msg) => this.broadcastToLobby(parsed.payload.gameId, msg), (msg) => this.sendToPlayer(gameId, clientInfo.id, msg));
      return;
    }

    if (parsed.type.startsWith("ks:")) {
      const gameId = typeof parsed.payload?.gameId === "string" ? parsed.payload.gameId : null;
      const game = this.games.find(g => g.id === gameId);
      const clientInfo = this.clients.get(id);
      if (!clientInfo) return;
      const clientUser = clientInfo.user ?? null;
      (parsed as any).clientUser = clientUser;
      handleKSMessages(clientUser, parsed, (game as Game), (msg) => this.broadcastToLobby(parsed.payload.gameId, msg), (msg) => this.sendToPlayer(gameId, clientInfo.id, msg));
      return;
    }

    if (parsed.type.startsWith("kd:")) {
      const gameId = typeof parsed.payload?.gameId === "string" ? parsed.payload.gameId : null;
      const game = this.games.find(g => g.id === gameId);
      const clientInfo = this.clients.get(id);
      if (!clientInfo) return;
      const clientUser = clientInfo.user ?? null;
      (parsed as any).clientUser = clientUser;
      handleKDMessages(clientUser, parsed, (game as Game), (msg) => this.broadcastToLobby(parsed.payload.gameId, msg), (msg) => this.sendToPlayer(gameId, clientInfo.id, msg));
      return;
    }

    if (parsed.type.startsWith("sop:")) {
      const gameId = typeof parsed.payload?.gameId === "string" ? parsed.payload.gameId : null;
      const game = this.games.find(g => g.id === gameId);
      const clientInfo = this.clients.get(id);
      if (!clientInfo) return;
      const clientUser = clientInfo.user ?? null;
      (parsed as any).clientUser = clientUser;
      handleSOPMessages(clientUser, parsed, (game as Game), (msg) => this.broadcastToLobby(parsed.payload.gameId, msg), (msg) => this.sendToPlayer(gameId, clientInfo.id, msg));
      return;
    }

    if (parsed.type.startsWith("soppl:")) {
      const gameId = typeof parsed.payload?.gameId === "string" ? parsed.payload.gameId : null;
      const game = this.games.find(g => g.id === gameId);
      const clientInfo = this.clients.get(id);
      if (!clientInfo) return;
      const clientUser = clientInfo.user ?? null;
      (parsed as any).clientUser = clientUser;
      handleSOPPLMessages(clientUser, parsed, (game as Game), (msg) => this.broadcastToLobby(parsed.payload.gameId, msg), (msg) => this.sendToPlayer(gameId, clientInfo.id, msg));
      return;
    }



    switch (parsed.type) {

      case "game:init": {
        const gameId = typeof parsed.payload?.gameId === "string" ? parsed.payload.gameId : null;
        const lobby: Lobby = parsed.payload.lobby;
        const clientInfo = this.clients.get(id);
        console.log("GAME INIT")
        console.log(gameId)
        console.log(lobby)
        if (clientInfo) {
          const Scoreboard = { scores: lobby.players.map(p => ({ playerId: p.id, playerName: p.username || 'Anonymous', score: 0 })) };
          if (!lobby.gameModeOrder || lobby.gameModeOrder.length === 0) {
            this.send(clientInfo.ws, { type: "game:init:error", message: "no_game_modes_configured" });
            break;
          }
          const FirstGameMode: NextGameMode = lobby.gameModeOrder[0];
          lobby.gameModeOrder.shift()

          const game: Game = { id: gameId, lobby: lobby, startedAt: new Date().toISOString(), mode: FirstGameMode.type, nextGameModes: [], Scoreboard: Scoreboard };
          game.nextGameModes = lobby.gameModeOrder;
          if (game.mode === GameMode.QA) {
            game.currentGameModeData = { question: null, answers: [], Scoreboard: Scoreboard } as QA;
          }
          else if (game.mode === GameMode.MUSIC_QUIZ) {

            if (!FirstGameMode.playlist) {
              this.send(this.clients.get(id)!.ws, { type: "game:error", message: "music_quiz_requires_playlist" });
              return;
            }

            const playlist = await prisma.musicQuizPlaylistTrack.findMany({
              where: { playlistId: FirstGameMode.playlist },
              include: { track: true },
            }).then(playlist => {
              if (!playlist) {
                this.send(this.clients.get(id)!.ws, { type: "game:error", message: "music_quiz_playlist_not_found" });
                return;
              }
              return playlist;
            });

            if (!playlist) {
              this.send(this.clients.get(id)!.ws, { type: "game:error", message: "music_quiz_playlist_not_found" });
              return;
            }

            const shuffledTracks = playlist.sort(() => 0.5 - Math.random());

            const Scoreboard: Scoreboard = {
              scores: game.lobby.players.map(p => ({ playerId: p.id, playerName: p.username ?? 'Anonymous', score: 0 })),
            };

            const currentGameModeData: MUSIC_QUIZ = {
              currentTrackIndex: 0,
              currentTrack: shuffledTracks[0].track,
              tracks: shuffledTracks.map(t => t.track),
              Scoreboard: Scoreboard,
              replays: [],
              answers: [],
            };


            game.currentGameModeData = currentGameModeData;
            game.currentGameModeData.trackLength = currentGameModeData.tracks.length


          }
          else if (game.mode === GameMode.Karaoke_Solo) {

            if (!FirstGameMode.playlist) {
              this.send(this.clients.get(id)!.ws, { type: "game:error", message: "karaoke_solo_requires_playlist" });
              return;
            }

            const playlist = await prisma.karaokePlaylist.findFirst({
              where: {
                id: Number(FirstGameMode.playlist)
              },
              include: {
                Songs: {
                  include: {
                    Segments: {
                      include: {
                        Rows: {
                          orderBy: {
                            index: 'asc'
                          }
                        }
                      }
                    }
                  }
                }
              }
            })

            if (!playlist) return;

            const kp: KaraokePlaylist = playlist

            const Scoreboard: Scoreboard = {
              scores: game.lobby.players.map(p => ({ playerId: p.id, playerName: p.username ?? 'Anonymous', score: 0 })),
            };

            const pSegments: KaraokePlayerSegment[] = []

            game.lobby.players.forEach(p => {
              pSegments.push({ playerId: Number(p.id), segmentId: 0 })
            })

            const currentSong: KaraokeCurrentSong = {
              Song: playlist.Songs[0],
              pSegments: pSegments
            }


            game.currentGameModeData = { Playlist: (playlist as KaraokePlaylist), Scoreboard: Scoreboard as Scoreboard, currentSong: currentSong, inputs: [] as KaraokeFile[], outputs: [] as KaraokeFile[], state: "pending", isVoteOpen: false, votes: [], currentSongIndex: 0 } as Karaoke_Solo;
          }
          else if (game.mode === GameMode.SMASH_OR_PASS) {
            const order = [...game.lobby.players.map(p => String(p.id))].sort(() => Math.random() - 0.5);
            const Scoreboard: Scoreboard = {
              scores: game.lobby.players.map(p => ({ playerId: p.id, playerName: p.username ?? 'Anonymous', score: 0 })),
            };
            game.currentGameModeData = { order, currentIndex: 0, submissions: [], isVotingOpen: false, Scoreboard } as any;
          }
          else if (game.mode === GameMode.SMASH_OR_PASS_PLAYLIST) {
            const Scoreboard: Scoreboard = {
              scores: game.lobby.players.map(p => ({ playerId: p.id, playerName: p.username ?? 'Anonymous', score: 0 })),
            };

            //load items from database
            const items = await prisma.sopPlaylist.findMany({
              where: { id: FirstGameMode.playlist },
              include: {
                Items: true
              }
            }).then(items => {
              if (!items) {
                this.send(this.clients.get(id)!.ws, { type: "game:error", message: "smash_or_pass_playlist_not_found" });
                return;
              }
              return items;
            });

            if (!items) {
              this.send(this.clients.get(id)!.ws, { type: "game:error", message: "smash_or_pass_playlist_not_found" });
              return;
            }

            console.log(`items:`, items);

            game.currentGameModeData = { items: items[0].Items, currentIndex: 0, currentVotes: [], pickerId: null, Scoreboard } as any;
          }

          else if (game.mode === GameMode.Karaoke_Duett) {

            if (!FirstGameMode.playlist) {
              this.send(this.clients.get(id)!.ws, { type: "game:error", message: "karaoke_duett_requires_playlist" });
              return;
            }

            const playlist = await prisma.karaokePlaylist.findFirst({
              where: {
                id: Number(FirstGameMode.playlist)
              },
              include: {
                Songs: {
                  include: {
                    Segments: {
                      include: {
                        Rows: {
                          orderBy: {
                            index: 'asc'
                          }
                        }
                      }
                    }
                  }
                }
              }
            })

            if (!playlist) return;

            const kp: KaraokePlaylist = playlist

            const Scoreboard: Scoreboard = {
              scores: game.lobby.players.map(p => ({ playerId: p.id, playerName: p.username ?? 'Anonymous', score: 0 })),
            };

            const pSegments: KaraokePlayerSegment[] = []
            const segmentIndices = playlist.Songs[0].Segments.map((_, idx) => idx);
            for (let i = segmentIndices.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [segmentIndices[i], segmentIndices[j]] = [segmentIndices[j], segmentIndices[i]];
            }

            game.lobby.players.forEach((p, idx) => {
              pSegments.push({ playerId: Number(p.id), segmentId: segmentIndices[idx % segmentIndices.length] });
            });

            const currentSong: KaraokeCurrentSong = {
              Song: playlist.Songs[0],
              pSegments: pSegments
            }


            game.currentGameModeData = { Playlist: (playlist as KaraokePlaylist), Scoreboard: Scoreboard as Scoreboard, currentSong: currentSong, inputs: [] as KaraokeFile[], outputs: [] as KaraokeFile[], state: "pending", isVoteOpen: false, votes: [], currentSongIndex: 0 } as Karaoke_Duett;
          }

          this.games.push(game);
          const gameCopy = { ...game };
          if (gameCopy.mode === GameMode.MUSIC_QUIZ) {
            gameCopy.currentGameModeData = { ...gameCopy.currentGameModeData, currentTrackIndex: 0, currentTrack: null, tracks: [] } as MUSIC_QUIZ;
          }
          this.broadcastToLobby(lobby.id, { type: "game:started", payload: { game: gameCopy } });
        };
      }

      case "game:load": {
        const gameId = typeof parsed.payload?.gameId === "string" ? parsed.payload.gameId : "null";
        const game = this.games.find(g => g.id === gameId);
        console.log(game)
        console.log("GameID:  " + gameId)
        if (!game) {
          this.send(this.clients.get(id)!.ws, { type: "game:not_found", message: "invalid_game_id" });
          return;
        };
        const clientInfo = this.clients.get(id);
        if (clientInfo) {
          const gameCopy = { ...game };
          if (gameCopy.mode == GameMode.MUSIC_QUIZ) {
            gameCopy.currentGameModeData = { ...gameCopy.currentGameModeData, currentTrack: null, tracks: [] } as MUSIC_QUIZ;
          }
          this.send(clientInfo.ws, { type: "game:load:response", payload: { game: gameCopy } });
        }
        break;
      }

      case "game:increment_score": {
        const gameId = typeof parsed.payload?.gameId === "string" ? parsed.payload.gameId : null;
        const playerId = typeof parsed.payload?.playerId === "string" ? parsed.payload.playerId : null;
        const increment = typeof parsed.payload?.increment === "number" ? parsed.payload.increment : 1;
        const game = this.games.find(g => g.id === gameId);
        if (!game || !playerId) return;

        if (game.lobby.host.id !== user.id) {
          this.send(this.clients.get(id)!.ws, { type: "game:not_authorized", message: "not_authorized" });
          return;
        }

        const scoreEntry = (game.currentGameModeData.Scoreboard as Scoreboard).scores.find(s => s.playerId === playerId);
        if (scoreEntry) {
          scoreEntry.score += increment;
          this.broadcastToLobby(gameId, { type: "game:score_updated", payload: { Scoreboard: game.currentGameModeData.Scoreboard } });
        }
        break;
      }

      case "game:decrement_score": {
        const gameId = typeof parsed.payload?.gameId === "string" ? parsed.payload.gameId : null;
        const playerId = typeof parsed.payload?.playerId === "string" ? parsed.payload.playerId : null;
        const decrement = typeof parsed.payload?.decrement === "number" ? parsed.payload.decrement : 1;
        const game = this.games.find(g => g.id === gameId);
        if (!game || !playerId) return;

        if (game.lobby.host.id !== user.id) {
          this.send(this.clients.get(id)!.ws, { type: "game:not_authorized", message: "not_authorized" });
          return;
        }

        const scoreEntry = (game.currentGameModeData.Scoreboard as Scoreboard).scores.find(s => s.playerId === playerId);
        if (scoreEntry) {
          scoreEntry.score -= decrement;
          this.broadcastToLobby(gameId, { type: "game:score_updated", payload: { Scoreboard: game.currentGameModeData.Scoreboard } });
        }
        break;
      }

      case "game:end_game_mode": {
        const gameId = typeof parsed.payload?.gameId === "string" ? parsed.payload.gameId : null;
        const game = this.games.find(g => g.id === gameId);
        if (!game) return;
        game.mode = GameMode.Cross;
        this.broadcastToLobby(gameId, { type: "game:game_mode_ended", payload: { game: game } });
        break;
      }

      case "game:next_game_mode": {
        const gameId = typeof parsed.payload?.gameId === "string" ? parsed.payload.gameId : null;
        const game = this.games.find(g => g.id === gameId);
        if (!game) return;
        if (game.lobby.host.id !== user.id) {
          this.send(this.clients.get(id)!.ws, { type: "game:not_authorized", message: "not_authorized" });
          return;
        }
        if (game.nextGameModes.length > 0) {
          const nextMode = game.nextGameModes.shift()!;
          game.mode = nextMode.type;
          game.currentGameModeData = null;
          if (nextMode.type === GameMode.QA) {
            game.currentGameModeData = { question: null, answers: [], Scoreboard: game.Scoreboard } as QA;
          } else if (nextMode.type === GameMode.BTN) {
            game.currentGameModeData = { state: [] } as any;
          } else if (nextMode.type === GameMode.MUSIC_QUIZ) {
            if (!nextMode.playlist) {
              this.send(this.clients.get(id)!.ws, { type: "game:error", message: "music_quiz_requires_playlist" });
              return;
            }

            const playlist = await prisma.musicQuizPlaylistTrack.findMany({
              where: { playlistId: nextMode.playlist },
              include: { track: true },
            }).then(playlist => {
              if (!playlist) {
                this.send(this.clients.get(id)!.ws, { type: "game:error", message: "music_quiz_playlist_not_found" });
                return;
              }
              return playlist;
            });

            if (!playlist) {
              this.send(this.clients.get(id)!.ws, { type: "game:error", message: "music_quiz_playlist_not_found" });
              return;
            }

            const shuffledTracks = playlist.sort(() => 0.5 - Math.random());

            const Scoreboard: Scoreboard = {
              scores: game.lobby.players.map(p => ({ playerId: p.id, playerName: p.username ?? 'Anonymous', score: 0 })),
            };

            const currentGameModeData: MUSIC_QUIZ = {
              currentTrackIndex: 0,
              currentTrack: shuffledTracks[0].track,
              tracks: shuffledTracks.map(t => t.track),
              Scoreboard: Scoreboard,
              replays: [],
              answers: [],
            };

            game.currentGameModeData = currentGameModeData;
            game.currentGameModeData.trackLength = currentGameModeData.tracks.length
          } else if (nextMode.type === GameMode.SMASH_OR_PASS) {
            const order = [...game.lobby.players.map(p => String(p.id))].sort(() => Math.random() - 0.5);
            const Scoreboard: Scoreboard = {
              scores: game.lobby.players.map(p => ({ playerId: p.id, playerName: p.username ?? 'Anonymous', score: 0 })),
            };
            game.currentGameModeData = { order, currentIndex: 0, submissions: [], isVotingOpen: false, Scoreboard } as any;
          } else if (nextMode.type === GameMode.SMASH_OR_PASS_PLAYLIST) {
            const Scoreboard: Scoreboard = {
              scores: game.lobby.players.map(p => ({ playerId: p.id, playerName: p.username ?? 'Anonymous', score: 0 })),
            };
            game.currentGameModeData = { items: [], currentIndex: 0, currentVotes: [], pickerId: null, Scoreboard } as any;
          } else {
            game.currentGameModeData = null;
          }
          const { currentGameModeData, ...safeGame } = game;
          const safeCurrentGameModeData = currentGameModeData
            ? { ...currentGameModeData, tracks: undefined, currentTrack: undefined }
            : undefined;
          this.broadcastToLobby(gameId, {
            type: "game:next_game_mode_started",
            payload: { game: { ...safeGame, currentGameModeData: safeCurrentGameModeData } },
          });
        } else {
          console.log("No next game modes available");
          game.mode = GameMode.Ended;
          this.broadcastToLobby(gameId, { type: "game:game_ended", payload: { game: game } });
        }
        break;
      }

      case "game:end_game": {
        const gameId = typeof parsed.payload?.gameId === "string" ? parsed.payload.gameId : null;
        const gameIndex = this.games.findIndex(g => g.id === gameId);
        if (gameIndex === -1) return;
        const game = this.games[gameIndex];

        if (game.lobby.host.id != user.id) {
          this.send(this.clients.get(id)!.ws, { type: "game:not_authorized", message: "not_authorized" });
          return;
        }

        game.mode = GameMode.Ended;
        this.broadcastToLobby(gameId, { type: "game:game_ended", payload: { game: game } });
        this.games.splice(gameIndex, 1);
        break;
      }

      case "game:finish": {
        const gameId = typeof parsed.payload?.gameId === "string" ? parsed.payload.gameId : null;
        const gameIndex = this.games.findIndex(g => g.id === gameId);
        if (gameIndex === -1) return;
        const game = this.games[gameIndex];

        if (game.lobby.host.id != user.id) {

          this.send(this.clients.get(id)!.ws, { type: "game:not_authorized", message: `not_authorized ${game.lobby.host.id} != ${user.id}` });
          return;
        }

        console.log("Finishing game:", game);
        this.games.splice(gameIndex, 1);
        endGame(gameId);
        this.send(this.clients.get(id)!.ws, { type: "game:finished_response_host", payload: { lobbyId: gameId } });
        console.log("game Id to finish:", gameId);
        break;;
      }

      default:
        this.send(this.clients.get(id)!.ws, { type: "error", message: "unknown_type" });
    }
  }

  private unregister(id: string) {
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
    const lobby = this.games.find(l => l.id === lobbyId);
    if (!lobby) return;
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
    console.log("SEND TO PLAYER")
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

  getUserList() {
    return Array.from(this.clients.values()).map((c) => ({ id: c.id, name: c.name ?? null, remote: c.remote }));
  }

  public async initGame(id: string, gameId: string, lobby: Lobby, clientInfo: ClientInfo) {
    console.log("GAME INIT")
    console.log(gameId)
    console.log(lobby)
    if (clientInfo) {
      console.log("CLIENT INFO")
      console.log(clientInfo)
      const Scoreboard = { scores: lobby.players.map(p => ({ playerId: p.id, playerName: p.username || 'Anonymous', score: 0 })) };
      if (!lobby.gameModeOrder || lobby.gameModeOrder.length === 0) {
        this.send(clientInfo.ws, { type: "game:init:error", message: "no_game_modes_configured" });
        return;
      }

      const FirstGameMode: NextGameMode = lobby.gameModeOrder[0];
      lobby.gameModeOrder.shift()

      const game: Game = { id: gameId, lobby: lobby, startedAt: new Date().toISOString(), mode: FirstGameMode.type, nextGameModes: [], Scoreboard: Scoreboard };
      game.nextGameModes = lobby.gameModeOrder;
      if (game.mode === GameMode.QA) {
        game.currentGameModeData = { question: null, answers: [], Scoreboard: Scoreboard } as QA;
      }
      else if (game.mode === GameMode.MUSIC_QUIZ) {

        if (!FirstGameMode.playlist) {
          this.send(this.clients.get(id)!.ws, { type: "game:error", message: "music_quiz_requires_playlist" });
          return;
        }

        const playlist = await prisma.musicQuizPlaylistTrack.findMany({
          where: { playlistId: FirstGameMode.playlist },
          include: { track: true },
        }).then(playlist => {
          if (!playlist) {
            this.send(this.clients.get(id)!.ws, { type: "game:error", message: "music_quiz_playlist_not_found" });
            return;
          }
          return playlist;
        });

        if (!playlist) {
          this.send(this.clients.get(id)!.ws, { type: "game:error", message: "music_quiz_playlist_not_found" });
          return;
        }

        const shuffledTracks = playlist.sort(() => 0.5 - Math.random());

        const Scoreboard: Scoreboard = {
          scores: game.lobby.players.map(p => ({ playerId: p.id, playerName: p.username ?? 'Anonymous', score: 0 })),
        };

        const currentGameModeData: MUSIC_QUIZ = {
          currentTrackIndex: 0,
          currentTrack: shuffledTracks[0].track,
          tracks: shuffledTracks.map(t => t.track),
          Scoreboard: Scoreboard,
          replays: [],
          answers: [],
        };


        game.currentGameModeData = currentGameModeData;
        game.currentGameModeData.trackLength = currentGameModeData.tracks.length


      }
      else if (game.mode === GameMode.Karaoke_Solo) {

        if (!FirstGameMode.playlist) {
          this.send(this.clients.get(id)!.ws, { type: "game:error", message: "karaoke_solo_requires_playlist" });
          return;
        }

        const playlist = await prisma.karaokePlaylist.findFirst({
          where: {
            id: Number(FirstGameMode.playlist)
          },
          include: {
            Songs: {
              include: {
                Segments: {
                  include: {
                    Rows: {
                      orderBy: {
                        index: 'asc'
                      }
                    }
                  }
                }
              }
            }
          }
        })

        if (!playlist) return;

        const kp: KaraokePlaylist = playlist

        const Scoreboard: Scoreboard = {
          scores: game.lobby.players.map(p => ({ playerId: p.id, playerName: p.username ?? 'Anonymous', score: 0 })),
        };

        const pSegments: KaraokePlayerSegment[] = []

        game.lobby.players.forEach(p => {
          pSegments.push({ playerId: Number(p.id), segmentId: 0 })
        })

        const currentSong: KaraokeCurrentSong = {
          Song: playlist.Songs[0],
          pSegments: pSegments
        }


        game.currentGameModeData = { Playlist: (playlist as KaraokePlaylist), Scoreboard: Scoreboard as Scoreboard, currentSong: currentSong, inputs: [] as KaraokeFile[], outputs: [] as KaraokeFile[], state: "pending", isVoteOpen: false, votes: [], currentSongIndex: 0 } as Karaoke_Solo;
      }
      else if (game.mode === GameMode.SMASH_OR_PASS) {
        const order = [...game.lobby.players.map(p => String(p.id))].sort(() => Math.random() - 0.5);
        const Scoreboard: Scoreboard = {
          scores: game.lobby.players.map(p => ({ playerId: p.id, playerName: p.username ?? 'Anonymous', score: 0 })),
        };
        game.currentGameModeData = { order, currentIndex: 0, submissions: [], isVotingOpen: false, Scoreboard } as any;
      }
      else if (game.mode === GameMode.SMASH_OR_PASS_PLAYLIST) {
        const Scoreboard: Scoreboard = {
          scores: game.lobby.players.map(p => ({ playerId: p.id, playerName: p.username ?? 'Anonymous', score: 0 })),
        };

        //load items from database
        const items = await prisma.sopPlaylist.findMany({
          where: { id: FirstGameMode.playlist },
          include: {
            Items: true
          }
        }).then(items => {
          if (!items) {
            this.send(this.clients.get(id)!.ws, { type: "game:error", message: "smash_or_pass_playlist_not_found" });
            return;
          }
          return items;
        });

        if (!items) {
          this.send(this.clients.get(id)!.ws, { type: "game:error", message: "smash_or_pass_playlist_not_found" });
          return;
        }

        console.log(`items:`, items);

        game.currentGameModeData = { items: items[0].Items, currentIndex: 0, currentVotes: [], pickerId: null, Scoreboard } as any;
      }

      else if (game.mode === GameMode.Karaoke_Duett) {

        if (!FirstGameMode.playlist) {
          this.send(this.clients.get(id)!.ws, { type: "game:error", message: "karaoke_duett_requires_playlist" });
          return;
        }

        const playlist = await prisma.karaokePlaylist.findFirst({
          where: {
            id: Number(FirstGameMode.playlist)
          },
          include: {
            Songs: {
              include: {
                Segments: {
                  include: {
                    Rows: {
                      orderBy: {
                        index: 'asc'
                      }
                    }
                  }
                }
              }
            }
          }
        })

        if (!playlist) return;

        const kp: KaraokePlaylist = playlist

        const Scoreboard: Scoreboard = {
          scores: game.lobby.players.map(p => ({ playerId: p.id, playerName: p.username ?? 'Anonymous', score: 0 })),
        };

        const pSegments: KaraokePlayerSegment[] = []
        const segmentIndices = playlist.Songs[0].Segments.map((_, idx) => idx);
        for (let i = segmentIndices.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [segmentIndices[i], segmentIndices[j]] = [segmentIndices[j], segmentIndices[i]];
        }

        game.lobby.players.forEach((p, idx) => {
          pSegments.push({ playerId: Number(p.id), segmentId: segmentIndices[idx % segmentIndices.length] });
        });

        const currentSong: KaraokeCurrentSong = {
          Song: playlist.Songs[0],
          pSegments: pSegments
        }


        game.currentGameModeData = { Playlist: (playlist as KaraokePlaylist), Scoreboard: Scoreboard as Scoreboard, currentSong: currentSong, inputs: [] as KaraokeFile[], outputs: [] as KaraokeFile[], state: "pending", isVoteOpen: false, votes: [], currentSongIndex: 0 } as Karaoke_Duett;
      }

      this.games.push(game);
      const gameCopy = { ...game };
      if (gameCopy.mode === GameMode.MUSIC_QUIZ) {
        gameCopy.currentGameModeData = { ...gameCopy.currentGameModeData, currentTrackIndex: 0, currentTrack: null, tracks: [] } as MUSIC_QUIZ;
      }
      console.log("gameCopy", gameCopy);
      this.broadcastToLobby(lobby.id, { type: "game:started", payload: { game: gameCopy } });
    };

  }
}

export const gameServer = new GameServer();

export default gameServer;
