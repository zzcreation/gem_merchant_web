import { applyGameAction } from '../../shared/game/actions'
import { createInitialGameState } from '../../shared/game/setup'
import type { GameState } from '../../shared/game/types'

export const playerSetups = [
  { id: 'p1', nickname: '阿岚' },
  { id: 'p2', nickname: '墨川' },
  { id: 'p3', nickname: '你' },
]

export function createMockGame(): GameState {
  return applyGameAction(
    createInitialGameState({
      id: 'GM-7428',
      seed: 'local-mock',
      players: playerSetups,
    }),
    'p1',
    { type: 'startGame' },
  )
}
