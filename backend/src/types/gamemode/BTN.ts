import { Scoreboard } from "../Score";

export interface BTN {
  state: Array<{
    playerId: string;
    playerName: string;
    count: number ;
  }>;
  scoreboard?: Scoreboard;
}