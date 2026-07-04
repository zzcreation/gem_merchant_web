import type { GemColor } from '../types'

export interface DevelopmentCard {
  id: string
  level: 1 | 2 | 3
  bonus: GemColor
  prestige: number
  cost: Partial<Record<GemColor, number>>
  artSeed: string
}

export const DEVELOPMENT_CARDS: DevelopmentCard[] = []
