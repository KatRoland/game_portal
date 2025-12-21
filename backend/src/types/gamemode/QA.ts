import { Scoreboard } from "../Score";

export interface QA {
  question: string | null;
  answers: Array<{
    playerId: string;
    playerName: string;
    answer: string;
  }>;
  Scoreboard?: Scoreboard;
}