import type { GemColor } from '../types'

export interface NobleTile {
  id: string
  prestige: 3
  requirement: Partial<Record<GemColor, number>>
  artSeed: string
}

export const NOBLES: NobleTile[] = []
