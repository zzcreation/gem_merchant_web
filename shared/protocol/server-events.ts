import type { ClientGameView } from '../game/types'

export type ServerEvent =
  | { type: 'state.snapshot'; view: ClientGameView }
  | { type: 'state.patch'; view: ClientGameView }
  | { type: 'game.actionAccepted'; actionId: string; version: number }
  | { type: 'game.error'; actionId?: string; code: string; message: string }
  | { type: 'room.timer'; currentPlayerId: string; remainingMs: number }
  | { type: 'room.playerJoined'; playerId: string; nickname: string }
  | { type: 'room.joined'; roomCode: string; playerId: string; resumeToken: string }
  | { type: 'room.lobby'; roomCode: string; players: RoomLobbyPlayer[] }
  | { type: 'room.pong'; sentAt: number; serverTime: number }

export interface RoomLobbyPlayer {
  id: string
  nickname: string
  ready: boolean
  connected: boolean
}
