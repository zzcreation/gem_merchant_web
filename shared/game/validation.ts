import { DEVELOPMENT_CARDS } from './data/development-cards'
import { NOBLES } from './data/nobles'
import { GEM_COLORS } from './constants'
import type { GemColor } from './types'

export function getDataReadiness() {
  return {
    developmentCards: DEVELOPMENT_CARDS.length,
    nobles: NOBLES.length,
    hasCompleteDevelopmentDeck: DEVELOPMENT_CARDS.length === 90,
    hasCompleteNobles: NOBLES.length === 10,
  }
}

export function validateGameData(): string[] {
  const errors: string[] = []
  const cardIds = new Set<string>()
  const nobleIds = new Set<string>()
  const validColors = new Set<GemColor>(GEM_COLORS)

  if (DEVELOPMENT_CARDS.length !== 90) {
    errors.push(`Expected 90 development cards, got ${DEVELOPMENT_CARDS.length}.`)
  }

  if (NOBLES.length !== 10) {
    errors.push(`Expected 10 nobles, got ${NOBLES.length}.`)
  }

  for (const level of [1, 2, 3] as const) {
    const expected = level === 1 ? 40 : level === 2 ? 30 : 20
    const actual = DEVELOPMENT_CARDS.filter((card) => card.level === level).length
    if (actual !== expected) {
      errors.push(`Expected ${expected} level ${level} cards, got ${actual}.`)
    }
  }

  for (const color of GEM_COLORS) {
    const actual = DEVELOPMENT_CARDS.filter((card) => card.bonus === color).length
    if (actual !== 18) {
      errors.push(`Expected 18 ${color} bonus cards, got ${actual}.`)
    }
  }

  for (const card of DEVELOPMENT_CARDS) {
    if (cardIds.has(card.id)) {
      errors.push(`Duplicate development card id: ${card.id}.`)
    }
    cardIds.add(card.id)

    if (!validColors.has(card.bonus)) {
      errors.push(`Invalid bonus color on ${card.id}: ${card.bonus}.`)
    }

    if (!Number.isInteger(card.prestige) || card.prestige < 0) {
      errors.push(`Invalid prestige on ${card.id}: ${card.prestige}.`)
    }

    for (const [color, amount] of Object.entries(card.cost)) {
      if (!validColors.has(color as GemColor)) {
        errors.push(`Invalid cost color on ${card.id}: ${color}.`)
      }
      if (!Number.isInteger(amount) || amount <= 0) {
        errors.push(`Invalid cost amount on ${card.id}: ${color}=${amount}.`)
      }
    }
  }

  for (const noble of NOBLES) {
    if (nobleIds.has(noble.id)) {
      errors.push(`Duplicate noble id: ${noble.id}.`)
    }
    nobleIds.add(noble.id)

    if (noble.prestige !== 3) {
      errors.push(`Invalid noble prestige on ${noble.id}: ${noble.prestige}.`)
    }

    for (const [color, amount] of Object.entries(noble.requirement)) {
      if (!validColors.has(color as GemColor)) {
        errors.push(`Invalid noble requirement color on ${noble.id}: ${color}.`)
      }
      if (!Number.isInteger(amount) || amount <= 0) {
        errors.push(`Invalid noble requirement amount on ${noble.id}: ${color}=${amount}.`)
      }
    }
  }

  return errors
}
