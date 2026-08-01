import type WebSocket from "ws";
import type http from "http";
import { lobbyServer } from "./lobby";
import { gameServer } from "./game";
import { Lobby } from "../types/Lobby";


export function handleWsConnection(ws: WebSocket, req: http.IncomingMessage) {
  console.log(`New WS connection from ${req.socket.remoteAddress}`);
  console.log(`Registering WS connection for ${req.url}`);

  if (req.url?.startsWith('/lobby')) lobbyServer.register(ws, req);
  else if (req.url?.startsWith("/game")) gameServer.register(ws, req);
}

export function gameInit(gameId: string, lobby: Lobby) {
  gameServer.initGame(gameId, lobby);
}

export function endGame(lobbyId: string) {
  lobbyServer.endGame(lobbyId);
}

