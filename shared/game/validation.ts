import { DEVELOPMENT_CARDS } from './data/development-cards'
import { NOBLES } from './data/nobles'

export function getDataReadiness() {
  return {
    developmentCards: DEVELOPMENT_CARDS.length,
    nobles: NOBLES.length,
    hasCompleteDevelopmentDeck: DEVELOPMENT_CARDS.length === 90,
    hasCompleteNobles: NOBLES.length === 10,
  }
}
