import {
  EMPTY_TOKEN_SET,
  GEM_COLORS,
  MARKET_SLOTS_PER_LEVEL,
  SETUP_BY_PLAYER_COUNT,
} from './constants'
import type { GameState, PlayerSetup, PlayerState, TokenColor } from './types'

export function createInitialGameState(params: {
  id: string
  seed: string
  players: PlayerSetup[]
}): GameState {
  const setup = SETUP_BY_PLAYER_COUNT[params.players.length]

  if (!setup) {
    throw new Error('Gem Merchant supports 2-5 players.')
  }

  const playerOrder = params.players.map((player) => player.id)
  const players = Object.fromEntries(
    params.players.map((player, seatIndex): [string, PlayerState] => [
      player.id,
      {
        id: player.id,
        nickname: player.nickname,
        seatIndex,
        connected: true,
        ready: false,
        tokens: emptyTokens(),
        purchasedCardIds: [],
        reservedCardIds: [],
        nobleIds: [],
        score: 0,
        turnCount: 0,
      },
    ]),
  )

  return {
    id: params.id,
    mode: setup.mode,
    phase: 'lobby',
    seed: params.seed,
    playerOrder,
    currentPlayerId: playerOrder[0],
    firstPlayerId: playerOrder[0],
    bank: createBank(setup.normalTokens, setup.goldTokens),
    decks: { 1: [], 2: [], 3: [] },
    market: {
      1: Array.from({ length: MARKET_SLOTS_PER_LEVEL }, () => null),
      2: Array.from({ length: MARKET_SLOTS_PER_LEVEL }, () => null),
      3: Array.from({ length: MARKET_SLOTS_PER_LEVEL }, () => null),
    },
    nobles: Array.from({ length: setup.noblesInMarket }, (_, index) => `pending-noble-${index + 1}`),
    players,
    log: [
      {
        id: 'setup',
        message: `Room created for ${params.players.length} players.`,
        turn: 0,
      },
    ],
    version: 1,
  }
}

function createBank(normalTokens: number, goldTokens: number): Record<TokenColor, number> {
  return {
    ...Object.fromEntries(GEM_COLORS.map((color) => [color, normalTokens])),
    gold: goldTokens,
  } as Record<TokenColor, number>
}

function emptyTokens(): Record<TokenColor, number> {
  return { ...EMPTY_TOKEN_SET }
}
