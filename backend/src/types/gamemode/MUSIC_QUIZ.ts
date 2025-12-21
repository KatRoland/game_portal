import { MusicQuizTrack } from "@prisma/client";
import { Scoreboard } from "../Score";

interface Replay {
    playerId: string;
    count: number;
}

export interface Answer {
    playerId: string;
    playerName: string;
    answer: string;
    state: 'pending' |'correct' | 'incorrect';
}

export interface MUSIC_QUIZ {
    currentTrackIndex: number;
    currentTrack: MusicQuizTrack;
    tracks: MusicQuizTrack[];
    Scoreboard: Scoreboard;
    replays: Replay[];
    answers: Answer[];
}