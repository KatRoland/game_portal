import { User } from './User'
import { NextGameMode } from './NextGameMode'

export interface Lobby {
  id: string
  name: string
  players : User[]
  host: User
  createdAt: string
  state: 'waiting' | 'started'
  gameModeOrder?: NextGameMode[]
}