import { Lobby } from "./Lobby";
import { GameMode } from "./GameMode";
import { NextGameMode } from "./NextGameMode";
import { Scoreboard } from "./Score";

export interface Game {
    id: string;
    lobby : Lobby;
    startedAt: string;
    mode: GameMode;
    currentGameModeData?: any;
    nextGameModes: NextGameMode[];
    Scoreboard?: Scoreboard;
}