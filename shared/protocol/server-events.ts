import type { GameState } from '../game/types'

export type ServerEvent =
  | { type: 'room.snapshot'; state: GameState }
  | { type: 'room.error'; message: string }
  | { type: 'room.playerJoined'; playerId: string; nickname: string }
