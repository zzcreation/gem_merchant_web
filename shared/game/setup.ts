import {
  EMPTY_TOKEN_SET,
  GEM_COLORS,
  MARKET_SLOTS_PER_LEVEL,
  SETUP_BY_PLAYER_COUNT,
} from './constants'
import { DEVELOPMENT_CARDS } from './data/development-cards'
import { NOBLES } from './data/nobles'
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
        reservedCards: [],
        nobleIds: [],
        score: 0,
        turnCount: 0,
      },
    ]),
  )
  const decks = createDecks(params.seed)
  const market = {
    1: dealMarketRow(decks[1]),
    2: dealMarketRow(decks[2]),
    3: dealMarketRow(decks[3]),
  }

  return {
    id: params.id,
    mode: setup.mode,
    phase: 'lobby',
    seed: params.seed,
    playerOrder,
    currentPlayerId: playerOrder[0],
    firstPlayerId: playerOrder[0],
    bank: createBank(setup.normalTokens, setup.goldTokens),
    decks,
    market,
    nobles: shuffle(
      NOBLES.map((noble) => noble.id),
      `${params.seed}:nobles`,
    ).slice(0, setup.noblesInMarket),
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

function createDecks(seed: string): GameState['decks'] {
  return {
    1: shuffle(
      DEVELOPMENT_CARDS.filter((card) => card.level === 1).map((card) => card.id),
      `${seed}:level-1`,
    ),
    2: shuffle(
      DEVELOPMENT_CARDS.filter((card) => card.level === 2).map((card) => card.id),
      `${seed}:level-2`,
    ),
    3: shuffle(
      DEVELOPMENT_CARDS.filter((card) => card.level === 3).map((card) => card.id),
      `${seed}:level-3`,
    ),
  }
}

function dealMarketRow(deck: string[]): Array<string | null> {
  return Array.from({ length: MARKET_SLOTS_PER_LEVEL }, () => deck.shift() ?? null)
}

function shuffle<T>(items: T[], seed: string): T[] {
  const result = [...items]
  let state = hashSeed(seed)

  for (let index = result.length - 1; index > 0; index -= 1) {
    state = nextRandomState(state)
    const swapIndex = state % (index + 1)
    ;[result[index], result[swapIndex]] = [result[swapIndex], result[index]]
  }

  return result
}

function hashSeed(seed: string): number {
  let hash = 2166136261

  for (const char of seed) {
    hash ^= char.charCodeAt(0)
    hash = Math.imul(hash, 16777619)
  }

  return hash >>> 0
}

function nextRandomState(state: number): number {
  return (Math.imul(state, 1664525) + 1013904223) >>> 0
}
