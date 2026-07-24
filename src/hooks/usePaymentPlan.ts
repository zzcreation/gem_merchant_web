import { useState } from 'react'
import { GEM_COLORS } from '../../shared/game/constants'
import type { ClientPlayerView, GemColor, PaymentPlan, TokenColor } from '../../shared/game/types'
import { countSelectedTokens } from '../lib/affordability'
import { hasVisibleCardId } from '../lib/cards'
import {
  adjustPaymentPlan,
  canAdjustPaymentPlan,
  createSuggestedPaymentPlan,
  emptyPaymentPlan,
  isPaymentExact,
} from '../lib/payment'

export type SelectedCard = { level: 1 | 2 | 3; slot: number }

type UsePaymentPlanArgs = {
  viewerPlayer: ClientPlayerView
  bank: Record<GemColor, number>
  market: Record<1 | 2 | 3, Array<string | null>>
  currentPlayerTokens: Record<TokenColor, number>
  discardNeeded: number
}

export function usePaymentPlan({
  viewerPlayer,
  bank,
  market,
  currentPlayerTokens,
  discardNeeded,
}: UsePaymentPlanArgs) {
  const [selectedTokens, setSelectedTokens] = useState<Partial<Record<GemColor, number>>>({})
  const [selectedCard, setSelectedCard] = useState<SelectedCard | null>(null)
  const [selectedReservedCardId, setSelectedReservedCardId] = useState<string | null>(null)
  const [paymentPlan, setPaymentPlan] = useState<PaymentPlan>(emptyPaymentPlan)
  const [discardPlan, setDiscardPlan] = useState<Partial<Record<TokenColor, number>>>({})

  const selectedCardId = selectedCard ? market[selectedCard.level][selectedCard.slot] : null
  const selectedPaymentCardId = selectedReservedCardId ?? selectedCardId
  const hasSelectedTokens = countSelectedTokens(selectedTokens) > 0
  const viewerVisibleReservedCards = viewerPlayer.reservedCards.filter(hasVisibleCardId)
  const canBuySelectedMarketCard = isPaymentExact(viewerPlayer, selectedCardId, paymentPlan)
  const canBuySelectedReservedCard = isPaymentExact(viewerPlayer, selectedReservedCardId, paymentPlan)

  function clearActionSelection() {
    setSelectedTokens({})
    setSelectedCard(null)
    setSelectedReservedCardId(null)
    setPaymentPlan(emptyPaymentPlan())
    setDiscardPlan({})
  }

  function toggleToken(color: GemColor) {
    setSelectedTokens((current) => {
      const currentAmount = current[color] ?? 0
      const otherColors = GEM_COLORS.filter((otherColor) => otherColor !== color && (current[otherColor] ?? 0) > 0)
      const next: Partial<Record<GemColor, number>> = {}

      for (const otherColor of otherColors) {
        next[otherColor] = 1
      }

      if (currentAmount === 0) {
        if (otherColors.length >= 3) {
          return current
        }
        next[color] = 1
      } else if (currentAmount === 1 && otherColors.length === 0 && bank[color] >= 4) {
        next[color] = 2
      } else if (currentAmount === 2) {
        next[color] = 1
      } else {
        delete next[color]
      }
      return next
    })
  }

  function updatePayment(kind: keyof PaymentPlan, color: GemColor, delta: number) {
    if (!selectedPaymentCardId) {
      return
    }
    setPaymentPlan((current) => adjustPaymentPlan(current, viewerPlayer, selectedPaymentCardId, kind, color, delta))
  }

  function canIncreasePayment(kind: keyof PaymentPlan, color: GemColor): boolean {
    if (!selectedPaymentCardId) {
      return false
    }
    return canAdjustPaymentPlan(paymentPlan, viewerPlayer, selectedPaymentCardId, kind, color)
  }

  function updateDiscard(color: TokenColor, delta: number) {
    setDiscardPlan((current) => {
      const next = { ...current }
      const currentAmount = next[color] ?? 0
      const selectedTotal = countSelectedTokens(current)
      const availableRoom = Math.max(0, discardNeeded - selectedTotal + currentAmount)
      const nextAmount = Math.max(0, Math.min(currentAmount + delta, currentPlayerTokens[color], availableRoom))
      if (nextAmount === 0) {
        delete next[color]
      } else {
        next[color] = nextAmount
      }
      return next
    })
  }

  function selectMarketCard(selection: SelectedCard, cardId: string) {
    setSelectedCard(selection)
    setSelectedReservedCardId(null)
    setPaymentPlan(createSuggestedPaymentPlan(viewerPlayer, cardId))
  }

  function selectReservedCard(cardId: string) {
    setSelectedCard(null)
    setSelectedReservedCardId(cardId)
    setPaymentPlan(createSuggestedPaymentPlan(viewerPlayer, cardId))
  }

  function suggestPayment(cardId: string) {
    setPaymentPlan(createSuggestedPaymentPlan(viewerPlayer, cardId))
  }

  return {
    selectedTokens,
    selectedCard,
    selectedReservedCardId,
    paymentPlan,
    discardPlan,
    selectedCardId,
    selectedPaymentCardId,
    hasSelectedTokens,
    viewerVisibleReservedCards,
    canBuySelectedMarketCard,
    canBuySelectedReservedCard,
    clearActionSelection,
    toggleToken,
    updatePayment,
    canIncreasePayment,
    updateDiscard,
    selectMarketCard,
    selectReservedCard,
    suggestPayment,
    setPaymentPlan,
    setSelectedCard,
    setSelectedReservedCardId,
  }
}
