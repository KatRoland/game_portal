export enum GameMode {
  QA = "QA",
  BTN = "BTN",
  MUSIC_QUIZ = "MUSIC_QUIZ",
  Karaoke_Solo = "Karaoke_Solo",
  Karaoke_Duett = "Karaoke_Duett",
  SMASH_OR_PASS = "SMASH_OR_PASS",
  SMASH_OR_PASS_PLAYLIST = "SMASH_OR_PASS_PLAYLIST",
  UNO = "UNO",
  HITSTER = "HITSTER",
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

export interface UNOCard {
  type: "number" | "wild" | "skip" | "reverse" | "draw2" | "draw4" | null;
  color: "red" | "green" | "blue" | "yellow" | "wild" | null;
  value: number | "wild" | "skip" | "reverse" | "draw2" | "draw4" | null;
}

export interface UNOCardInHand extends UNOCard {
  id: string | null;
}

export interface UNOPlayer {
  cards: UNOCardInHand[];
  name: string;
  hasSaidUno: boolean;
  stillPlaying: boolean;
  isArchived?: boolean;
}

export type UNOPhase = "draw" | "play" | "choose_color" | "draw_pending";

export interface UNOGameRules {
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
  | { phase: "lobby" }
  | { phase: "init" }
  | { phase: "draw"; cardsToDraw: number; canDrawMore: boolean }
  | { phase: "play" }
  | { phase: "choose_color"; pendingCard: UNOCard }
  | { phase: "draw_pending"; drawAmount: number; drawType: "draw2" | "draw4" };

export interface UNOState {
  currentTurnPlayerId: string;
  lastPlayedPlayerId?: string;
  playerOrderIds: string[];
  topCard: UNOCard;
  drawPile: UNOCard[];
  backLog: UNOCard[];
  drawStack: number;
  players: { [playerId: string]: UNOPlayer };
  playersWhoOut: {
    index: number;
    playerId: string;
  }[];
  Scoreboard?: Scoreboard;
  gameRules: UNOGameRules;
  state: {
    direction: 1 | -1;
    activePhase: UNOPhase;
    activePhaseData: UNOPhaseData;
  };
}

export interface UNO_FN {
  start: (rules: UNOGameRules) => void
  playCard: (cardIds: string[]) => void
  drawCard: () => void
  sayUno: () => void
  chooseColor: (color: 'red' | 'green' | 'blue' | 'yellow') => void
  restartGame: () => void
  settingsChanged: (gameId: string, rules: UNOGameRules) => void
}

export interface ChatUser {
  id: number;
  username: string;
  avatar?: string | null;
  customAvatar?: boolean;
  customAvatarUrl?: string | null;
  isAdmin?: boolean;
}

export interface SiteChatMessage {
  id: number;
  content: string;
  createdAt: string;
  channel?: string;
  user: ChatUser;
}

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

export interface HTFN {
  toggleReady: () => void;
  addTeam: () => void;
  removeTeam: (teamId: string) => void;
  joinTeam: (teamId: string) => void;
  changeLeader: (playerId: string) => void;
  updateSettings: (stealRule: StealRule) => void;
  startGame: () => void;

  guessName: (guess: string) => void;
  passName: () => void;
  callName: () => void;
  proposeGuess: (index: number) => void;
  lockPosition: (index: number) => void;
  challengePosition: (type: 'BAD_GUESS' | 'LOWER' | 'HIGHER') => void;
  hostOverrideName: (teamId: string) => void;
  nextTurn: () => void;
}