import { describe, expect, it } from 'vitest'
import { applyGameAction } from '../../shared/game/actions'
import { GEM_COLORS, TOKEN_COLORS } from '../../shared/game/constants'
import { getDevelopmentCard } from '../../shared/game/catalog'
import { createInitialGameState } from '../../shared/game/setup'
import type { GameAction, GameState, GemColor, PaymentPlan, PlayerState } from '../../shared/game/types'

describe('full game simulation', () => {
  it('can finish a deterministic two-player game without deadlocking', () => {
    let state = applyGameAction(
      createInitialGameState({
        id: 'simulation-room',
        seed: 'simulation-seed',
        players: [
          { id: 'p1', nickname: 'A' },
          { id: 'p2', nickname: 'B' },
        ],
      }),
      'p1',
      { type: 'startGame' },
    )

    for (let turn = 0; turn < 500 && state.phase !== 'finished'; turn += 1) {
      const playerId = state.currentPlayerId
      const action = chooseAction(state, playerId)
      state = applyGameAction(state, playerId, action)

      if (state.phase === 'awaiting_token_discard') {
        state = applyGameAction(state, playerId, {
          type: 'discardTokens',
          tokens: chooseDiscard(state.players[playerId]),
        })
      }
    }

    expect(state.phase).toBe('finished')
    expect(Math.max(...state.playerOrder.map((playerId) => state.players[playerId].score))).toBeGreaterThanOrEqual(
      15,
    )
    expect(new Set(state.playerOrder.map((playerId) => state.players[playerId].turnCount))).toHaveLength(1)
  })
})

function chooseAction(state: GameState, playerId: string): GameAction {
  const buyAction = findBuyMarketAction(state, playerId)
  if (buyAction) {
    return buyAction
  }

  const tokenAction = findTakeTokensAction(state)
  if (tokenAction) {
    return tokenAction
  }

  return { type: 'passTurn', reason: 'no_legal_action' }
}

function findBuyMarketAction(state: GameState, playerId: string): GameAction | null {
  for (const level of [3, 2, 1] as const) {
    for (const [slot, cardId] of state.market[level].entries()) {
      if (!cardId) {
        continue
      }

      const payment = createPaymentPlan(state.players[playerId], cardId)
      if (payment) {
        return { type: 'buyMarketCard', level, slot, payment }
      }
    }
  }

  return null
}

function createPaymentPlan(player: PlayerState, cardId: string): PaymentPlan | null {
  const card = getDevelopmentCard(cardId)
  const discounts = countDiscounts(player)
  const tokens: Partial<Record<GemColor, number>> = {}
  const goldAs: Partial<Record<GemColor, number>> = {}
  let remainingGold = player.tokens.gold

  for (const color of GEM_COLORS) {
    const due = Math.max(0, (card.cost[color] ?? 0) - discounts[color])
    const normal = Math.min(player.tokens[color], due)
    const gold = due - normal

    if (gold > remainingGold) {
      return null
    }

    if (normal > 0) {
      tokens[color] = normal
    }
    if (gold > 0) {
      goldAs[color] = gold
      remainingGold -= gold
    }
  }

  return { tokens, goldAs }
}

function findTakeTokensAction(state: GameState): GameAction | null {
  const threeDifferent = GEM_COLORS.filter((color) => state.bank[color] > 0).slice(0, 3)
  if (threeDifferent.length > 0) {
    return {
      type: 'takeTokens',
      tokens: Object.fromEntries(threeDifferent.map((color) => [color, 1])),
    }
  }

  return null
}

function chooseDiscard(player: PlayerState): Partial<Record<(typeof TOKEN_COLORS)[number], number>> {
  const discard: Partial<Record<(typeof TOKEN_COLORS)[number], number>> = {}
  let extra = countTokens(player) - 10

  for (const color of TOKEN_COLORS) {
    if (extra <= 0) {
      break
    }

    const amount = Math.min(player.tokens[color], extra)
    if (amount > 0) {
      discard[color] = amount
      extra -= amount
    }
  }

  return discard
}

function countDiscounts(player: PlayerState): Record<GemColor, number> {
  const discounts = Object.fromEntries(GEM_COLORS.map((color) => [color, 0])) as Record<
    GemColor,
    number
  >

  for (const cardId of player.purchasedCardIds) {
    discounts[getDevelopmentCard(cardId).bonus] += 1
  }

  return discounts
}

function countTokens(player: PlayerState): number {
  return TOKEN_COLORS.reduce((sum, color) => sum + player.tokens[color], 0)
}
