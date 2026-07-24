import { GEM_COLORS } from '../../shared/game/constants'
import { getDevelopmentCard } from '../../shared/game/catalog'
import type { GemColor, PaymentPlan } from '../../shared/game/types'
import { countPurchasedBonus, type PlayerForActions } from './cards'

export function emptyPaymentPlan(): PaymentPlan {
  return { tokens: {}, goldAs: {} }
}

export function createSuggestedPaymentPlan(player: PlayerForActions, cardId: string): PaymentPlan {
  const card = getDevelopmentCard(cardId)
  const tokens: PaymentPlan['tokens'] = {}
  const goldAs: PaymentPlan['goldAs'] = {}
  let remainingGold = player.tokens.gold

  for (const color of GEM_COLORS) {
    const due = Math.max(0, (card.cost[color] ?? 0) - countPurchasedBonus(player, color))
    const normal = Math.min(player.tokens[color], due)
    const gold = due - normal
    if (gold > remainingGold) {
      continue
    }
    if (normal > 0) tokens[color] = normal
    if (gold > 0) {
      goldAs[color] = gold
      remainingGold -= gold
    }
  }

  return { tokens, goldAs }
}

export function adjustPaymentPlan(
  payment: PaymentPlan,
  player: PlayerForActions,
  cardId: string,
  kind: keyof PaymentPlan,
  color: GemColor,
  delta: number,
): PaymentPlan {
  const next = normalizePaymentPlan(payment)
  const bucket = { ...next[kind] }
  const currentAmount = bucket[color] ?? 0
  const nextAmount = clampPaymentAmount(payment, player, cardId, kind, color, currentAmount + delta)

  if (nextAmount === 0) {
    delete bucket[color]
  } else {
    bucket[color] = nextAmount
  }

  return { ...next, [kind]: bucket }
}

export function canAdjustPaymentPlan(
  payment: PaymentPlan,
  player: PlayerForActions,
  cardId: string,
  kind: keyof PaymentPlan,
  color: GemColor,
): boolean {
  const currentAmount = payment[kind][color] ?? 0
  return clampPaymentAmount(payment, player, cardId, kind, color, currentAmount + 1) > currentAmount
}

export function clampPaymentAmount(
  payment: PaymentPlan,
  player: PlayerForActions,
  cardId: string,
  kind: keyof PaymentPlan,
  color: GemColor,
  amount: number,
): number {
  const due = discountedCost(player, cardId, color)
  const normal = payment.tokens[color] ?? 0
  const gold = payment.goldAs[color] ?? 0
  const otherForColor = kind === 'tokens' ? gold : normal
  const maxForColor = Math.max(0, due - otherForColor)
  const maxAvailable = kind === 'tokens'
    ? player.tokens[color]
    : player.tokens.gold - totalGoldInPayment(payment) + gold

  return Math.max(0, Math.min(amount, maxForColor, maxAvailable))
}

export function normalizePaymentPlan(payment: PaymentPlan): PaymentPlan {
  return {
    tokens: compactTokenMap(payment.tokens),
    goldAs: compactTokenMap(payment.goldAs),
  }
}

export function compactTokenMap(tokens: Partial<Record<GemColor, number>>): Partial<Record<GemColor, number>> {
  const compacted: Partial<Record<GemColor, number>> = {}
  for (const color of GEM_COLORS) {
    const amount = tokens[color] ?? 0
    if (amount > 0) {
      compacted[color] = amount
    }
  }
  return compacted
}

export function discountedCost(player: PlayerForActions, cardId: string, color: GemColor): number {
  const card = getDevelopmentCard(cardId)
  return Math.max(0, (card.cost[color] ?? 0) - countPurchasedBonus(player, color))
}

export function isPaymentExact(player: PlayerForActions, cardId: string | null, payment: PaymentPlan): boolean {
  if (!cardId) {
    return false
  }

  if (totalGoldInPayment(payment) > player.tokens.gold) {
    return false
  }

  return GEM_COLORS.every((color) => {
    const normal = payment.tokens[color] ?? 0
    const gold = payment.goldAs[color] ?? 0
    return normal <= player.tokens[color] && normal + gold === discountedCost(player, cardId, color)
  })
}

export function paymentSummary(player: PlayerForActions, cardId: string, payment: PaymentPlan): string {
  const missing = GEM_COLORS.reduce((sum, color) => {
    const paid = (payment.tokens[color] ?? 0) + (payment.goldAs[color] ?? 0)
    return sum + Math.max(0, discountedCost(player, cardId, color) - paid)
  }, 0)

  if (totalGoldInPayment(payment) > player.tokens.gold) {
    return '金币不足。'
  }
  if (missing > 0) {
    return `还差 ${missing} 枚支付。`
  }
  if (!isPaymentExact(player, cardId, payment)) {
    return '支付分配过量或无效。'
  }
  return '支付刚好覆盖成本。'
}

export function totalGoldInPayment(payment: PaymentPlan): number {
  return GEM_COLORS.reduce((sum, color) => sum + (payment.goldAs[color] ?? 0), 0)
}
