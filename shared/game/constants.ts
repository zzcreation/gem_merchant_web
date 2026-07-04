import type { RoomMode, TokenColor } from './types'

export const GEM_COLORS = ['white', 'blue', 'green', 'red', 'black'] as const
export const TOKEN_COLORS = [...GEM_COLORS, 'gold'] as const

export const EMPTY_TOKEN_SET: Record<TokenColor, number> = {
  white: 0,
  blue: 0,
  green: 0,
  red: 0,
  black: 0,
  gold: 0,
}

export const SETUP_BY_PLAYER_COUNT: Record<
  number,
  { mode: RoomMode; normalTokens: number; goldTokens: number; noblesInMarket: number }
> = {
  2: { mode: 'classic', normalTokens: 4, goldTokens: 5, noblesInMarket: 3 },
  3: { mode: 'classic', normalTokens: 5, goldTokens: 5, noblesInMarket: 4 },
  4: { mode: 'classic', normalTokens: 7, goldTokens: 5, noblesInMarket: 5 },
  5: { mode: 'extended_5p', normalTokens: 8, goldTokens: 5, noblesInMarket: 6 },
}

export const MARKET_SLOTS_PER_LEVEL = 4
