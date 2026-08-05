import WebSocket from "ws";
import { Game } from "./Game";

export interface GameModeContext {
    userId: string;
    user: { id: string; username?: string | null; avatar?: string | null; isAdmin?: boolean };
    game: Game;
    payload: any;
    dataType: string; // Pl. "mq:submit_answer" -> ebből tudja a handler, melyik eset fut
    broadcast: (msg: any) => void;
    send: (msg: any) => void;
    sendToUser: (userId: string, msg: any) => void;
}

export interface IGameModeHandler {
    handleMessage(ctx: GameModeContext): Promise<void> | void;
    onPlayerArchived?(game: Game, playerId: string): void;
    onPlayerRestored?(game: Game, playerId: string): void;
}