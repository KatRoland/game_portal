export interface Score {
    playerId: string;
    playerName: string;
    score: number;
    isArchived?: boolean;
}

export interface Scoreboard {
    scores: Score[];
}