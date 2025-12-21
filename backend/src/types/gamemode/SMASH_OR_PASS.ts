import { Scoreboard } from "../Score";

export type VoteValue = 1 | -1;

export type ImageVote = {
  voterId: string
  value: VoteValue
}

export type ImageSubmission = {
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

