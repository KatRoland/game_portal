import type WebSocket from "ws";
import type http from "http";
import { lobbyServer } from "./lobby";
import { gameServer } from "./game";
import { Lobby } from "../types/Lobby";


export function handleWsConnection(ws: WebSocket, req: http.IncomingMessage) {
  console.log(`New WS connection from ${req.socket.remoteAddress}`);
  console.log(`Registering WS connection for ${req.url}`);

  // lobbyServer.register(ws, req);
  // gameServer.register(ws, req);
  if (req.url?.startsWith('/lobby')) lobbyServer.register(ws, req);
  else if (req.url?.startsWith("/game")) gameServer.register(ws, req);
}

type ClientInfo = {
  id: string;
  ws: WebSocket;
  name?: string | null;
  remote?: string | undefined;
  accessToken?: string | undefined;
  user?: { id: string; username?: string | null; avatar?: string | null; isAdmin?: boolean } | undefined;
};

export function gameInit(id: string, gameId: string, lobby: Lobby, clientInfo: ClientInfo) {
  gameServer.initGame(id, gameId, lobby, clientInfo);
}

export function endGame(lobbyId: string) {
  lobbyServer.endGame(lobbyId);
}
