export interface Score {
    playerId: string;
    playerName: string;
    score: number;
}

export interface Scoreboard {
    scores: Score[];
}