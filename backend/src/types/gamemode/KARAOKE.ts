import { Score } from "../Score"
import { Scoreboard } from "../Score"

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

  currentSong: KaraokeCurrentSong;
  currentSongIndex: number
}

export interface Karaoke_Solo extends Karaoke {
  outputs: KaraokeFile[];
}

export interface Karaoke_Duett extends Karaoke {
  outputs: KaraokeFile[];
  finalOutput?: string | null;
}