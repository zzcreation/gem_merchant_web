import { DEVELOPMENT_CARDS, type DevelopmentCard } from './data/development-cards'
import { NOBLES, type NobleTile } from './data/nobles'

export const DEVELOPMENT_CARD_BY_ID = new Map<string, DevelopmentCard>(
  DEVELOPMENT_CARDS.map((card) => [card.id, card]),
)

export const NOBLE_BY_ID = new Map<string, NobleTile>(NOBLES.map((noble) => [noble.id, noble]))

export function getDevelopmentCard(cardId: string): DevelopmentCard {
  const card = DEVELOPMENT_CARD_BY_ID.get(cardId)

  if (!card) {
    throw new Error(`Unknown development card: ${cardId}`)
  }

  return card
}

export function getNoble(nobleId: string): NobleTile {
  const noble = NOBLE_BY_ID.get(nobleId)

  if (!noble) {
    throw new Error(`Unknown noble: ${nobleId}`)
  }

  return noble
}
