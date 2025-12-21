import { Game } from "./Game";
import { GameMode } from "./GameMode";

export interface NextGameMode {
    id: string;
    type: GameMode;
    playlist? : any;
    createdAt: string;
}