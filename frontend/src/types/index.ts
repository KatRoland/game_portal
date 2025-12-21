export enum GameMode {
  QA = "QA",
  BTN = "BTN",
  MUSIC_QUIZ = "MUSIC_QUIZ",
  Karaoke_Solo = "Karaoke_Solo",
  Karaoke_Duett = "Karaoke_Duett",
  SMASH_OR_PASS = "SMASH_OR_PASS",
  SMASH_OR_PASS_PLAYLIST = "SMASH_OR_PASS_PLAYLIST",
  Cross = "Cross",
  Ended = "Ended"
}

export interface ImageVote {
  voterId: string
  value: 1 | -1
}

export interface ImageSubmission {
  playerId: string
  title: string
  fileUrl: string
  votes: ImageVote[]
}

export interface SMASH_OR_PASS {
  order: string[]
  currentIndex: number
  submissions: ImageSubmission[]
  isVotingOpen: boolean
  Scoreboard: Scoreboard
}

export interface SOP_FN {
  start: () => void
  submit: (title: string, fileUrl: string) => void
  openVoting: () => void
  vote: (targetId: string, value: 1 | -1) => void
  next: () => void
}

export type SOPPLItem = { id: string; title: string; fileUrl: string }
export type SOPPLVote = { voterId: string; value: 1 | -1 }

export interface SOPPL_DATA {
  items: SOPPLItem[]
  currentIndex: number
  currentVotes: SOPPLVote[]
  pickerId?: string | null
  Scoreboard: Scoreboard
}

export interface SOPPL_FN {
  start: () => void
  setPlaylist: (items: SOPPLItem[]) => void
  next: () => void
  vote: (value: 1 | -1) => void
}

export interface User {
  id: string
  username?: string | null
  avatar?: string | null
  email?: string | null
  isAdmin?: boolean
  discordId?: string | null
  customAvatarUrl?: string | null
}

export interface Message {
  id: string
  text: string
  sender: {
    id: string
    username?: string | null
    avatar?: string | null
  }
  createdAt: string
}


export type Lobby = {
  id: string
  name: string
  players?: Array<any>
  host?: any
  createdAt?: string
  state?: 'waiting' | 'started'
  gameModeOrder?: NextGameMode[]
}

export interface GameQuestion {
  question: string;
  answers: Array<{
    playerId: string;
    playerName: string;
    answer: string;
  }>;
}

export interface NextGameMode {
  id: string;
  type: GameMode;
  playlist?: any;
  createdAt: string;
}

export interface Score {
  playerId: string;
  playerName: string;
  score: number;
}

export interface Scoreboard {
  scores: Score[];
}

export interface Game {
  id: string;
  lobby: Lobby;
  startedAt: string;
  mode: GameMode;
  currentGameModeData?: any;
  nextGameModes: NextGameMode[];
  Scoreboard?: Scoreboard;
}

export interface GameFN {
  incrementScore: (playerId: string, increment?: number) => void;
  decrementScore: (playerId: string, decrement?: number) => void;
  endGameMode: () => void;
  nextGameMode: () => void;
  endGame: () => void;
  finishGameAsHost: () => void;
}

export interface MQFN {
  getCurrentSong: () => void;
  submitAnswer: (answer: string) => void;
  replaySong: () => void;
  acceptAnswer: (playerId: string) => void;
  rejectAnswer: (playerId: string) => void;
  nextSong: () => void;
  startQuiz: () => void;
  setAutoPlayState: (arg0: boolean) => void
}

export type WSMessage = { type: string; payload?: any }

export interface KaraokePlaylist {
  id: number;
  name: string;
  Songs?: KaraokeSong[] | null;
}

export interface KaraokeSong {
  id: number;
  title: string;
  playlistId: number;
  Playlist?: KaraokePlaylist | null;
  Segments?: KaraokeSongSegment[] | null;
}

export interface KaraokeSongSegment {
  id: number;
  index: number;
  songId: number;
  Song?: KaraokeSong | null;
  fileUrl: string;
  Rows?: KaraokeSongLyrics[] | null;
}

export interface KaraokeSongLyrics {
  id: number;
  index: number;
  lyrics: string;
  time: number;
  segmentId: number;
  SongSegment?: KaraokeSongSegment | null;
}



export interface KaraokeFile {
  playerId: number;
  file: string;
}

export interface KaraokePlayerSegment {
  playerId: number
  segmentId: number
}

export interface KaraokeCurrentSong {
  Song: KaraokeSong;
  pSegments: KaraokePlayerSegment[];
}

export interface KaraokeVote {
  playerId: number
  votedPlayerId: number
}

export interface Karaoke {
  Scoreboard: Scoreboard;
  Playlist: KaraokePlaylist;
  inputs: KaraokeFile[];
  state: "pending" | "reviewing"
  isVoteOpen: boolean
  votes: KaraokeVote[]
}

export interface Karaoke_Solo extends Karaoke {
  currentSong: KaraokeCurrentSong;
  outputs: KaraokeFile[];
}

export interface Karaoke_Duett extends Karaoke {
  currentSong: KaraokeCurrentSong;
  outputs: KaraokeFile[];
  finalOutput?: KaraokeFile | null;
}

export interface KSFN {
  RecordCallBack: (fileUrl: string) => void
  setAutoPlayState: (arg0: boolean) => void
  startRound: () => void
  startPlayback: (uid: number) => void
  resetRTP: () => void
  openVote: () => void
  voteToPlayer: (targetId: number) => void
  nextSong: () => void
}

export interface KDFN extends KSFN {
  setPlayFinal: (state: boolean) => void
  reqPlayFinal: () => void
}
