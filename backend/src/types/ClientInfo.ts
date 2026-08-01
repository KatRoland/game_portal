import type WebSocket from "ws";

export type ClientInfo = {
  id: string;
  ws: WebSocket;
  name?: string | null;
  remote?: string | undefined;
  accessToken?: string | undefined;
  user?: { id: string; username?: string | null; avatar?: string | null; isAdmin?: boolean } | undefined;
};
