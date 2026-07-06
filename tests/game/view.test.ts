import { describe, expect, it } from 'vitest'
import { applyGameAction } from '../../shared/game/actions'
import { createInitialGameState } from '../../shared/game/setup'
import { createClientGameView } from '../../shared/game/view'

describe('createClientGameView', () => {
  it('redacts deck order and other players private reserved cards', () => {
    const state = applyGameAction(
      createInitialGameState({
        id: 'room',
        seed: 'seed',
        players: [
          { id: 'p1', nickname: 'A' },
          { id: 'p2', nickname: 'B' },
        ],
      }),
      'p1',
      { type: 'startGame' },
    )
    const afterReserve = applyGameAction(state, 'p1', { type: 'reserveDeckCard', level: 1 })
    const p1View = createClientGameView(afterReserve, 'p1')
    const p2View = createClientGameView(afterReserve, 'p2')

    expect(p1View.deckCounts[1]).toBe(afterReserve.decks[1].length)
    expect(p1View).not.toHaveProperty('decks')
    expect(p1View.players.p1.reservedCards[0].type).toBe('private')
    expect(p2View.players.p1.reservedCards[0]).toEqual({ type: 'hidden', source: 'deck' })
  })
})
