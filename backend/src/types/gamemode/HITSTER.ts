import { Scoreboard } from "../Score";

export type HitsterPhase = 'WAITING' | 'PLAYING' | 'GAME_OVER';
export type TurnPhase = 'NAME_GUESS_ACTIVE' | 'POSITION_GUESS' | 'POSITION_CHALLENGE' | 'REVEAL';
export type StealRule = 'BAD_GUESS' | 'LOWER_HIGHER';

export interface HitsterCard {
    id: string;
    title: string;
    artist: string;
    year: number;
    previewUrl: string;
    spotifyUri: string;
    albumCover: string | null;
}

export interface HitsterTimelineItem {
    index: number;
    card: HitsterCard;
}

export interface HitsterProposedGuess {
    playerId: string;
    index: number;
}

export interface HitsterChallenge {
    teamId: string;
    type: 'BAD_GUESS' | 'LOWER' | 'HIGHER';
}

export interface HitsterNameGuessLog {
    teamId: string;
    guessText: string;
    isCorrect: boolean;
}

export interface HitsterPlayer {
    playerId: string;
    name: string;
    isReady: boolean;
    teamId: string | null;
}

export interface HitsterTeam {
    teamId: string;
    name: string;
    playerIds: string[];
    leaderId: string | null;
    timeline: HitsterTimelineItem[];
    tokens: number;
    proposedGuesses: HitsterProposedGuess[];
}

export interface HitsterTurnState {
    phase: TurnPhase;
    nameGuessedCorrectly: boolean;
    nameCallQueue: string[];
    nameGuessHistory: HitsterNameGuessLog[];
    activeTeamProposedIndex: number | null;
    challenges: HitsterChallenge[];
    challengeTimerEndsAt: number | null;
}

export interface Hitster {
    state: HitsterPhase;
    stealRule: StealRule;
    turnState: HitsterTurnState | null;
    players: Record<string, HitsterPlayer>;
    teams: Record<string, HitsterTeam>;
    teamOrder: string[];
    currentTurnTeamId: string | null;
    currentSong: HitsterCard | null;
    cardsToWin: number;
    Scoreboard?: Scoreboard;
}