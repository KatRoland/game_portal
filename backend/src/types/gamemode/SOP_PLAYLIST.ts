import { Scoreboard } from "../Score";

export type PlaylistItem = {
  id: string
  title: string
  fileUrl: string
}

export type VoteValue = 1 | -1;

export type ItemVote = {
  voterId: string
  value: VoteValue
}

export interface SOP_PLAYLIST_DATA {
  items: PlaylistItem[]
  currentIndex: number
  currentVotes: ItemVote[]
  pickerId?: string | null
  Scoreboard: Scoreboard
}

