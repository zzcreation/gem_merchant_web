import { GEM_COLORS, TOKEN_COLORS } from '../../shared/game/constants'
import type { TokenColor } from '../../shared/game/types'
import type { PlayerForActions } from './cards'
import { createSuggestedPaymentPlan, discountedCost, isPaymentExact } from './payment'

export type CardAffordability = 'normal' | 'gold' | 'none'

export function countAllTokens(tokens: Record<TokenColor, number>): number {
  return TOKEN_COLORS.reduce((sum, color) => sum + tokens[color], 0)
}

export function countSelectedTokens(tokens: Partial<Record<TokenColor, number>>): number {
  return TOKEN_COLORS.reduce((sum, color) => sum + (tokens[color] ?? 0), 0)
}

export function chooseDiscard(player: PlayerForActions): Partial<Record<TokenColor, number>> {
  const discard: Partial<Record<TokenColor, number>> = {}
  let extra = TOKEN_COLORS.reduce((sum, color) => sum + player.tokens[color], 0) - 10
  for (const color of TOKEN_COLORS) {
    if (extra <= 0) break
    const amount = Math.min(player.tokens[color], extra)
    if (amount > 0) {
      discard[color] = amount
      extra -= amount
    }
  }
  return discard
}

export function getCardAffordability(player: PlayerForActions, cardId: string): CardAffordability {
  const normalOnly = GEM_COLORS.every((color) => discountedCost(player, cardId, color) <= player.tokens[color])
  if (normalOnly) {
    return 'normal'
  }

  const suggestedPayment = createSuggestedPaymentPlan(player, cardId)
  if (isPaymentExact(player, cardId, suggestedPayment)) {
    return 'gold'
  }

  return 'none'
}
