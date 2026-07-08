import { describe, expect, it } from 'vitest'
import { applyGameAction } from '../../shared/game/actions'
import { getDevelopmentCard } from '../../shared/game/catalog'
import { DEVELOPMENT_CARDS } from '../../shared/game/data/development-cards'
import { createInitialGameState } from '../../shared/game/setup'
import { createClientGameView } from '../../shared/game/view'
import type { GameState, GemColor, PaymentPlan } from '../../shared/game/types'

const players = [
  { id: 'p1', nickname: 'A' },
  { id: 'p2', nickname: 'B' },
]

function startedGame(): GameState {
  const state = createInitialGameState({ id: 'room', seed: 'seed', players })
  return applyGameAction(state, 'p1', { type: 'startGame' })
}

describe('applyGameAction', () => {
  it('takes three different tokens and advances the turn', () => {
    const state = startedGame()
    const next = applyGameAction(state, 'p1', {
      type: 'takeTokens',
      tokens: { white: 1, blue: 1, green: 1 },
    })

    expect(next.currentPlayerId).toBe('p2')
    expect(next.players.p1.tokens).toMatchObject({ white: 1, blue: 1, green: 1 })
    expect(next.bank.white).toBe(3)
  })

  it('rejects voluntarily taking fewer than three different tokens', () => {
    const state = startedGame()

    expect(() =>
      applyGameAction(state, 'p1', {
        type: 'takeTokens',
        tokens: { white: 1, blue: 1 },
      }),
    ).toThrow('fewer than three')
  })

  it('reserves market cards publicly and deck cards privately', () => {
    const state = startedGame()
    const marketCardId = state.market[1][0]
    const afterMarketReserve = applyGameAction(state, 'p1', {
      type: 'reserveMarketCard',
      level: 1,
      slot: 0,
    })

    expect(afterMarketReserve.players.p1.reservedCards[0]).toEqual({
      cardId: marketCardId,
      source: 'market',
      visibility: 'public',
    })
    expect(afterMarketReserve.players.p1.tokens.gold).toBe(1)

    const afterDeckReserve = applyGameAction(afterMarketReserve, 'p2', {
      type: 'reserveDeckCard',
      level: 1,
    })

    const p1View = createClientGameView(afterDeckReserve, 'p1')
    const p2View = createClientGameView(afterDeckReserve, 'p2')

    expect(p1View.players.p2.reservedCards[0]).toEqual({ type: 'hidden', source: 'deck' })
    expect(p2View.players.p2.reservedCards[0].type).toBe('private')
  })

  it('requires discarding when reserving a card pushes the player above ten tokens', () => {
    const state = startedGame()
    const prepared: GameState = {
      ...state,
      players: {
        ...state.players,
        p1: {
          ...state.players.p1,
          tokens: { white: 2, blue: 2, green: 2, red: 2, black: 2, gold: 0 },
        },
      },
    }

    const awaitingDiscard = applyGameAction(prepared, 'p1', {
      type: 'reserveMarketCard',
      level: 1,
      slot: 0,
    })

    expect(awaitingDiscard.phase).toBe('awaiting_token_discard')
    expect(awaitingDiscard.currentPlayerId).toBe('p1')
    expect(awaitingDiscard.players.p1.tokens.gold).toBe(1)
  })

  it('buys an affordable market card using an exact payment plan', () => {
    const state = startedGame()
    const cardId = state.market[1][0]
    if (!cardId) {
      throw new Error('Expected market card.')
    }
    const card = getDevelopmentCard(cardId)
    const prepared: GameState = {
      ...state,
      players: {
        ...state.players,
        p1: {
          ...state.players.p1,
          tokens: { white: 4, blue: 4, green: 4, red: 4, black: 4, gold: 0 },
        },
      },
      bank: { white: 0, blue: 0, green: 0, red: 0, black: 0, gold: 5 },
    }
    const payment: PaymentPlan = {
      tokens: card.cost as Partial<Record<GemColor, number>>,
      goldAs: {},
    }
    const next = applyGameAction(prepared, 'p1', {
      type: 'buyMarketCard',
      level: 1,
      slot: 0,
      payment,
    })

    expect(next.players.p1.purchasedCardIds).toContain(cardId)
    for (const [color, amount] of Object.entries(card.cost)) {
      expect(next.players.p1.tokens[color as GemColor]).toBe(4 - amount)
    }
    expect(next.currentPlayerId).toBe('p2')
  })

  it('rejects fractional payment amounts', () => {
    const state = startedGame()
    const cardId = state.market[1][0]
    if (!cardId) {
      throw new Error('Expected market card.')
    }
    const card = getDevelopmentCard(cardId)
    const [color, due] = Object.entries(card.cost)[0] as [GemColor, number]
    const prepared: GameState = {
      ...state,
      players: {
        ...state.players,
        p1: {
          ...state.players.p1,
          tokens: { white: 4, blue: 4, green: 4, red: 4, black: 4, gold: 4 },
        },
      },
    }
    const payment: PaymentPlan = {
      tokens: { [color]: due - 0.5 },
      goldAs: { [color]: 0.5 },
    }

    expect(() =>
      applyGameAction(prepared, 'p1', {
        type: 'buyMarketCard',
        level: 1,
        slot: 0,
        payment,
      }),
    ).toThrow('non-negative integers')
  })

  it('discards down to ten tokens before ending the turn', () => {
    const state = startedGame()
    const prepared: GameState = {
      ...state,
      players: {
        ...state.players,
        p1: {
          ...state.players.p1,
          tokens: { white: 3, blue: 3, green: 3, red: 1, black: 0, gold: 0 },
        },
      },
    }
    const awaitingDiscard = applyGameAction(prepared, 'p1', {
      type: 'takeTokens',
      tokens: { black: 2 },
    })

    expect(awaitingDiscard.phase).toBe('awaiting_token_discard')

    const next = applyGameAction(awaitingDiscard, 'p1', {
      type: 'discardTokens',
      tokens: { white: 2 },
    })

    expect(next.phase).toBe('playing')
    expect(next.currentPlayerId).toBe('p2')
  })

  it('awards an eligible noble at the end of a turn', () => {
    const state = startedGame()
    const prepared: GameState = {
      ...state,
      nobles: ['noble-001'],
      players: {
        ...state.players,
        p1: {
          ...state.players.p1,
          purchasedCardIds: [
            ...cardIdsByBonus('white', 3),
            ...cardIdsByBonus('blue', 3),
            ...cardIdsByBonus('black', 3),
          ],
        },
      },
    }
    const next = applyGameAction(prepared, 'p1', { type: 'passTurn', reason: 'no_legal_action' })

    expect(next.players.p1.nobleIds).toEqual(['noble-001'])
    expect(next.players.p1.score).toBe(3)
    expect(next.nobles).toEqual([])
  })

  it('finishes after the final round gives every player equal turns', () => {
    const state = startedGame()
    const prepared: GameState = {
      ...state,
      players: {
        ...state.players,
        p1: { ...state.players.p1, score: 15 },
      },
    }
    const finalRound = applyGameAction(prepared, 'p1', { type: 'passTurn', reason: 'no_legal_action' })
    const finished = applyGameAction(finalRound, 'p2', {
      type: 'passTurn',
      reason: 'no_legal_action',
    })

    expect(finalRound.phase).toBe('final_round')
    expect(finalRound.finalRoundStartedBy).toBe('p1')
    expect(finished.phase).toBe('finished')
  })
})

function cardIdsByBonus(bonus: GemColor, count: number): string[] {
  return DEVELOPMENT_CARDS.filter((card) => card.bonus === bonus)
    .slice(0, count)
    .map((card) => card.id)
}
