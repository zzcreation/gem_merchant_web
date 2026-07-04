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
  reservedCardIds: string[]
  nobleIds: string[]
  score: number
  turnCount: number
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
