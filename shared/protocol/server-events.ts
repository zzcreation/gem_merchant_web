import type { ClientGameView } from '../game/types'

export type ServerEvent =
  | { type: 'state.snapshot'; view: ClientGameView }
  | { type: 'state.patch'; view: ClientGameView }
  | { type: 'game.actionAccepted'; actionId: string; version: number }
  | { type: 'game.error'; actionId?: string; code: string; message: string }
  | { type: 'room.timer'; currentPlayerId: string; remainingMs: number }
  | { type: 'room.playerJoined'; playerId: string; nickname: string }
