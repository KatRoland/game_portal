import { Server as WsServer } from "ws";
import type http from "http";
import { handleWsConnection } from "./handlers";

export function createWebSocketServer(server: http.Server) {
  const wss = new WsServer({ server });

  wss.on("connection", (ws, req) => {
    handleWsConnection(ws, req);
  });

  wss.on("listening", () => {
    console.log("WebSocket server listening");
  });

  return wss;
}
