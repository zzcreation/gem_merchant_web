import type { GameAction } from '../game/types'

export interface ClientActionEnvelope {
  actionId: string
  expectedVersion: number
  payload: ClientEvent
}

export type ClientEvent =
  | { type: 'room.join'; roomCode: string; nickname: string; resumeToken?: string }
  | { type: 'room.ping'; sentAt: number }
  | { type: 'room.ready'; ready: boolean }
  | { type: 'room.start' }
  | { type: 'game.action'; action: GameAction }
