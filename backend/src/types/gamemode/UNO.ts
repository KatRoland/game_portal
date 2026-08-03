import { Scoreboard } from "../Score";

export interface UNOPlayer {
    cards: UNOCardInHand[];
    name: string;
    hasSaidUno: boolean;
    stillPlaying: boolean;
}

export interface UNOCard {
    type: "number" | "wild" | "skip" | "reverse" | "draw2" | "draw4" | null;
    color: "red" | "green" | "blue" | "yellow" | "wild" | null;
    value: number | "wild" | "skip" | "reverse" | "draw2" | "draw4" | null;
}

export interface UNOCardInHand extends UNOCard {
    id: string | null;
}

export type UNOPhase = "lobby" | "draw" | "play" | "choose_color" | "draw_pending" | "round_ended";

export interface GameRules {
    jumpin: boolean;
    canPlayMultipleCards: boolean;
    uno: boolean;
    unoPenalty: number;
    initialCards: number;
    deckType: "standard" | "infinite";
    resetCardsToDraw: boolean;
    drawStackingMode: "linear" | "multiply";
    endCondition: "first_to_win" | "last_standing";
}

export type UNOPhaseData =
    | { phase: "lobby"; }
    | { phase: "init"; }
    | { phase: "draw"; cardsToDraw: number; canDrawMore: boolean }
    | { phase: "play"; }
    | { phase: "choose_color"; pendingCard: UNOCard }
    | { phase: "draw_pending"; drawAmount: number; drawType: "draw2" | "draw4" }
    | { phase: "round_ended"; winnerId: string };

export interface UNO {
    currentTurnPlayerId: string;
    lastPlayedPlayerId?: string;
    playerOrderIds: string[];
    topCard: UNOCard | null;
    drawPile: UNOCard[];
    backLog: UNOCard[];
    drawStack: number;
    players: { [playerId: string]: UNOPlayer };
    playersWhoOut: {
        index: number;
        playerId: string;
    }[]
    Scoreboard?: Scoreboard;
    gameRules: GameRules;
    state: {
        direction: 1 | -1;
        activePhase: UNOPhase;
        activePhaseData: UNOPhaseData;
    }
}