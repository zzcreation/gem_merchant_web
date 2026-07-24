import { GEM_COLORS } from '../../shared/game/constants'
import { getDevelopmentCard } from '../../shared/game/catalog'
import type { ClientReservedCardRef, GemColor, PlayerState } from '../../shared/game/types'
import { colorName } from './format'

export type PlayerForActions = Pick<PlayerState, 'tokens' | 'purchasedCardIds'>

export function hasVisibleCardId(reserved: ClientReservedCardRef): reserved is Extract<ClientReservedCardRef, { cardId: string }> {
  return 'cardId' in reserved
}

export function costDots(cost: Partial<Record<GemColor, number>>): GemColor[] {
  return GEM_COLORS.flatMap((color) => Array.from({ length: cost[color] ?? 0 }, () => color))
}

export function costEntries(cost: Partial<Record<GemColor, number>>): Array<[GemColor, number]> {
  return GEM_COLORS.flatMap((color) => {
    const amount = cost[color] ?? 0
    return amount > 0 ? [[color, amount] as [GemColor, number]] : []
  })
}

export function cardCostEntries(cardId: string): Array<[GemColor, number]> {
  return costEntries(getDevelopmentCard(cardId).cost)
}

export function countPurchasedBonus(player: PlayerForActions, color: GemColor): number {
  return player.purchasedCardIds.filter((cardId) => getDevelopmentCard(cardId).bonus === color).length
}

export function cardLabel(cardId: string): string {
  const card = getDevelopmentCard(cardId)
  return `L${card.level} ${colorName(card.bonus)} ${card.prestige}`
}
