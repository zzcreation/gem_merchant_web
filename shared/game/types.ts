export type GemColor = 'white' | 'blue' | 'green' | 'red' | 'black'
export type TokenColor = GemColor | 'gold'

export type RoomMode = 'classic' | 'extended_5p'

export type RoomPhase =
  | 'lobby'
  | 'playing'
  | 'awaiting_token_discard'
  | 'awaiting_noble_choice'
  | 'final_round'
  | 'finished'
  | 'abandoned'

export interface PlayerSetup {
  id: string
  nickname: string
}

export interface PlayerState {
  id: string
  nickname: string
  seatIndex: number
  connected: boolean
  ready: boolean
  tokens: Record<TokenColor, number>
  purchasedCardIds: string[]
  reservedCards: ReservedCardRef[]
  nobleIds: string[]
  score: number
  turnCount: number
}

export interface ReservedCardRef {
  cardId: string
  source: 'market' | 'deck'
  visibility: 'public' | 'private'
}

export interface GameLogEntry {
  id: string
  message: string
  turn: number
}

export interface GameState {
  id: string
  mode: RoomMode
  phase: RoomPhase
  seed: string
  playerOrder: string[]
  currentPlayerId: string
  firstPlayerId: string
  finalRoundStartedBy?: string
  bank: Record<TokenColor, number>
  decks: Record<1 | 2 | 3, string[]>
  market: Record<1 | 2 | 3, Array<string | null>>
  nobles: string[]
  players: Record<string, PlayerState>
  log: GameLogEntry[]
  version: number
}

export interface PaymentPlan {
  tokens: Partial<Record<GemColor, number>>
  goldAs: Partial<Record<GemColor, number>>
}

export type GameAction =
  | { type: 'startGame' }
  | { type: 'takeTokens'; tokens: Partial<Record<GemColor, number>> }
  | { type: 'reserveMarketCard'; level: 1 | 2 | 3; slot: number }
  | { type: 'reserveDeckCard'; level: 1 | 2 | 3 }
  | { type: 'buyMarketCard'; level: 1 | 2 | 3; slot: number; payment: PaymentPlan }
  | { type: 'buyReservedCard'; cardId: string; payment: PaymentPlan }
  | { type: 'discardTokens'; tokens: Partial<Record<TokenColor, number>> }
  | { type: 'chooseNoble'; nobleId: string }
  | { type: 'passTurn'; reason: 'timeout_vote' | 'no_legal_action' }

export interface ClientGameView {
  id: string
  mode: RoomMode
  phase: RoomPhase
  playerOrder: string[]
  currentPlayerId: string
  bank: Record<TokenColor, number>
  deckCounts: Record<1 | 2 | 3, number>
  market: Record<1 | 2 | 3, Array<string | null>>
  nobles: string[]
  players: Record<string, ClientPlayerView>
  log: GameLogEntry[]
  version: number
}

export interface ClientPlayerView {
  id: string
  nickname: string
  seatIndex: number
  connected: boolean
  ready: boolean
  tokens: Record<TokenColor, number>
  purchasedCardIds: string[]
  reservedCards: ClientReservedCardRef[]
  nobleIds: string[]
  score: number
  turnCount: number
}

export type ClientReservedCardRef =
  | { type: 'public'; cardId: string; source: 'market' }
  | { type: 'private'; cardId: string; source: 'deck' }
  | { type: 'hidden'; source: 'deck' }
