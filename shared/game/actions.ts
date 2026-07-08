import { GEM_COLORS, TOKEN_COLORS } from './constants'
import { getDevelopmentCard, getNoble } from './catalog'
import type {
  GameAction,
  GameState,
  GemColor,
  PaymentPlan,
  PlayerState,
  ReservedCardRef,
  TokenColor,
} from './types'

const MAX_TOKENS_PER_PLAYER = 10
const MAX_RESERVED_CARDS = 3
const WINNING_SCORE = 15

export function applyGameAction(state: GameState, playerId: string, action: GameAction): GameState {
  assertValidActionShape(action)
  const next = cloneState(state)

  if (action.type === 'startGame') {
    if (next.phase !== 'lobby') {
      throw new Error('Game can only start from the lobby.')
    }

    return commit(next, 'Game started.', 'playing')
  }

  assertCurrentPlayer(next, playerId)

  if (action.type === 'discardTokens') {
    return discardTokens(next, playerId, action.tokens)
  }

  if (action.type === 'chooseNoble') {
    return chooseNoble(next, playerId, action.nobleId)
  }

  if (next.phase !== 'playing' && next.phase !== 'final_round') {
    throw new Error(`Cannot perform ${action.type} while phase is ${next.phase}.`)
  }

  switch (action.type) {
    case 'takeTokens':
      return takeTokens(next, playerId, action.tokens)
    case 'reserveMarketCard':
      return reserveMarketCard(next, playerId, action.level, action.slot)
    case 'reserveDeckCard':
      return reserveDeckCard(next, playerId, action.level)
    case 'buyMarketCard':
      return buyMarketCard(next, playerId, action.level, action.slot, action.payment)
    case 'buyReservedCard':
      return buyReservedCard(next, playerId, action.cardId, action.payment)
    case 'passTurn':
      return endTurn(next, playerId, `Turn passed: ${action.reason}.`)
    default:
      return assertNever(action)
  }
}

function takeTokens(
  state: GameState,
  playerId: string,
  tokens: Partial<Record<GemColor, number>>,
): GameState {
  const selected = GEM_COLORS.filter((color) => (tokens[color] ?? 0) > 0)
  const total = selected.reduce((sum, color) => sum + (tokens[color] ?? 0), 0)

  if (total === 0) {
    throw new Error('Must take at least one token.')
  }

  if (selected.some((color) => (tokens[color] ?? 0) > state.bank[color])) {
    throw new Error('Cannot take more tokens than the bank has.')
  }

  const isTwoSame = selected.length === 1 && total === 2
  const isDifferent = selected.every((color) => tokens[color] === 1)

  if (isTwoSame) {
    const color = selected[0]
    if (state.bank[color] < 4) {
      throw new Error('Taking two matching tokens requires at least four in the bank.')
    }
  } else if (isDifferent) {
    const availableColors = GEM_COLORS.filter((color) => state.bank[color] > 0).length
    if (total > 3) {
      throw new Error('Cannot take more than three different tokens.')
    }
    if (total < Math.min(3, availableColors)) {
      throw new Error('Cannot voluntarily take fewer than three different tokens.')
    }
  } else {
    throw new Error('Token take must be either three different colors or two matching colors.')
  }

  const player = state.players[playerId]
  for (const color of selected) {
    const amount = tokens[color] ?? 0
    state.bank[color] -= amount
    player.tokens[color] += amount
  }

  if (countTokens(player.tokens) > MAX_TOKENS_PER_PLAYER) {
    return commit(state, `${player.nickname} took tokens and must discard.`, 'awaiting_token_discard')
  }

  return endTurn(state, playerId, `${player.nickname} took tokens.`)
}

function reserveMarketCard(
  state: GameState,
  playerId: string,
  level: 1 | 2 | 3,
  slot: number,
): GameState {
  const player = state.players[playerId]
  assertCanReserve(player)
  const cardId = state.market[level][slot]

  if (!cardId) {
    throw new Error('No market card in that slot.')
  }

  state.market[level][slot] = state.decks[level].shift() ?? null
  player.reservedCards.push({ cardId, source: 'market', visibility: 'public' })
  takeGoldIfAvailable(state, player)

  if (countTokens(player.tokens) > MAX_TOKENS_PER_PLAYER) {
    return commit(state, `${player.nickname} reserved a market card and must discard.`, 'awaiting_token_discard')
  }

  return endTurn(state, playerId, `${player.nickname} reserved a market card.`)
}

function reserveDeckCard(state: GameState, playerId: string, level: 1 | 2 | 3): GameState {
  const player = state.players[playerId]
  assertCanReserve(player)
  const cardId = state.decks[level].shift()

  if (!cardId) {
    throw new Error('Cannot reserve from an empty deck.')
  }

  player.reservedCards.push({ cardId, source: 'deck', visibility: 'private' })
  takeGoldIfAvailable(state, player)

  if (countTokens(player.tokens) > MAX_TOKENS_PER_PLAYER) {
    return commit(state, `${player.nickname} reserved a deck card and must discard.`, 'awaiting_token_discard')
  }

  return endTurn(state, playerId, `${player.nickname} reserved a deck card.`)
}

function buyMarketCard(
  state: GameState,
  playerId: string,
  level: 1 | 2 | 3,
  slot: number,
  payment: PaymentPlan,
): GameState {
  const cardId = state.market[level][slot]

  if (!cardId) {
    throw new Error('No market card in that slot.')
  }

  buyCard(state, playerId, cardId, payment)
  state.market[level][slot] = state.decks[level].shift() ?? null

  return afterPurchase(state, playerId, `bought a market card.`)
}

function buyReservedCard(
  state: GameState,
  playerId: string,
  cardId: string,
  payment: PaymentPlan,
): GameState {
  const player = state.players[playerId]
  const reservedIndex = player.reservedCards.findIndex((reservedCard) => reservedCard.cardId === cardId)

  if (reservedIndex === -1) {
    throw new Error('Card is not reserved by this player.')
  }

  buyCard(state, playerId, cardId, payment)
  player.reservedCards.splice(reservedIndex, 1)

  return afterPurchase(state, playerId, `bought a reserved card.`)
}

function discardTokens(
  state: GameState,
  playerId: string,
  tokens: Partial<Record<TokenColor, number>>,
): GameState {
  if (state.phase !== 'awaiting_token_discard') {
    throw new Error('No discard is currently required.')
  }

  const player = state.players[playerId]

  for (const color of TOKEN_COLORS) {
    const amount = tokens[color] ?? 0
    if (amount < 0 || amount > player.tokens[color]) {
      throw new Error('Invalid discard amount.')
    }
  }

  for (const color of TOKEN_COLORS) {
    const amount = tokens[color] ?? 0
    player.tokens[color] -= amount
    state.bank[color] += amount
  }

  if (countTokens(player.tokens) > MAX_TOKENS_PER_PLAYER) {
    throw new Error('Player must discard down to ten tokens.')
  }

  return endTurn(state, playerId, `${player.nickname} discarded tokens.`)
}

function chooseNoble(state: GameState, playerId: string, nobleId: string): GameState {
  if (state.phase !== 'awaiting_noble_choice') {
    throw new Error('No noble choice is currently required.')
  }

  const player = state.players[playerId]
  const eligible = getEligibleNobleIds(state, player)

  if (!eligible.includes(nobleId)) {
    throw new Error('Selected noble is not eligible.')
  }

  awardNoble(state, player, nobleId)

  return finishEndTurn(state, playerId, `${player.nickname} attracted a noble.`)
}

function buyCard(state: GameState, playerId: string, cardId: string, payment: PaymentPlan): void {
  const player = state.players[playerId]
  const card = getDevelopmentCard(cardId)
  validatePayment(player, card.cost, payment)

  for (const color of GEM_COLORS) {
    const normalAmount = payment.tokens[color] ?? 0
    const goldAmount = payment.goldAs[color] ?? 0
    player.tokens[color] -= normalAmount
    player.tokens.gold -= goldAmount
    state.bank[color] += normalAmount
    state.bank.gold += goldAmount
  }

  player.purchasedCardIds.push(cardId)
  player.score += card.prestige
}

function validatePayment(
  player: PlayerState,
  cost: Partial<Record<GemColor, number>>,
  payment: PaymentPlan,
): void {
  const discounts = countDiscounts(player)
  let totalGold = 0

  for (const color of GEM_COLORS) {
    const due = Math.max(0, (cost[color] ?? 0) - discounts[color])
    const normalAmount = payment.tokens[color] ?? 0
    const goldAmount = payment.goldAs[color] ?? 0

    if (normalAmount < 0 || goldAmount < 0) {
      throw new Error('Payment cannot contain negative amounts.')
    }
    if (normalAmount > player.tokens[color]) {
      throw new Error('Cannot pay tokens the player does not have.')
    }
    if (normalAmount + goldAmount !== due) {
      throw new Error('Payment must exactly cover the discounted cost.')
    }

    totalGold += goldAmount
  }

  if (totalGold > player.tokens.gold) {
    throw new Error('Cannot pay gold the player does not have.')
  }
}

function assertValidActionShape(action: GameAction): void {
  switch (action.type) {
    case 'startGame':
    case 'passTurn':
      return
    case 'takeTokens':
      assertTokenMap(action.tokens, GEM_COLORS, 'Token amounts must be non-negative integers.')
      return
    case 'reserveMarketCard':
      assertLevel(action.level)
      assertSlot(action.slot)
      return
    case 'reserveDeckCard':
      assertLevel(action.level)
      return
    case 'buyMarketCard':
      assertLevel(action.level)
      assertSlot(action.slot)
      assertPaymentPlan(action.payment)
      return
    case 'buyReservedCard':
      assertPaymentPlan(action.payment)
      return
    case 'discardTokens':
      assertTokenMap(action.tokens, TOKEN_COLORS, 'Discard amounts must be non-negative integers.')
      return
    case 'chooseNoble':
      return
    default:
      assertNever(action)
  }
}

function assertPaymentPlan(payment: PaymentPlan): void {
  if (!payment || typeof payment !== 'object') {
    throw new Error('Payment must be provided.')
  }
  assertTokenMap(payment.tokens, GEM_COLORS, 'Payment amounts must be non-negative integers.')
  assertTokenMap(payment.goldAs, GEM_COLORS, 'Payment amounts must be non-negative integers.')
}

function assertTokenMap<Color extends string>(
  tokens: Partial<Record<Color, number>>,
  colors: readonly Color[],
  message: string,
): void {
  if (!tokens || typeof tokens !== 'object') {
    throw new Error(message)
  }
  const allowedColors = new Set<string>(colors)
  for (const [color, amount] of Object.entries(tokens) as Array<[string, number]>) {
    if (!allowedColors.has(color) || !Number.isInteger(amount) || amount < 0) {
      throw new Error(message)
    }
  }
}

function assertLevel(level: number): asserts level is 1 | 2 | 3 {
  if (!Number.isInteger(level) || (level !== 1 && level !== 2 && level !== 3)) {
    throw new Error('Level must be 1, 2, or 3.')
  }
}

function assertSlot(slot: number): void {
  if (!Number.isInteger(slot) || slot < 0) {
    throw new Error('Slot must be a non-negative integer.')
  }
}

function afterPurchase(state: GameState, playerId: string, message: string): GameState {
  const player = state.players[playerId]
  return endTurn(state, playerId, `${player.nickname} ${message}`)
}

function endTurn(state: GameState, playerId: string, message: string): GameState {
  const player = state.players[playerId]
  const eligibleNobles = getEligibleNobleIds(state, player)

  if (eligibleNobles.length > 1) {
    return commit(state, `${message} ${player.nickname} must choose a noble.`, 'awaiting_noble_choice')
  }

  if (eligibleNobles.length === 1) {
    awardNoble(state, player, eligibleNobles[0])
  }

  return finishEndTurn(state, playerId, message)
}

function finishEndTurn(state: GameState, playerId: string, message: string): GameState {
  const player = state.players[playerId]
  player.turnCount += 1

  if (!state.finalRoundStartedBy && player.score >= WINNING_SCORE) {
    state.finalRoundStartedBy = playerId
    state.phase = 'final_round'
  }

  if (state.finalRoundStartedBy && allPlayersHaveEqualTurns(state)) {
    return commit(state, message, 'finished')
  }

  state.currentPlayerId = nextPlayerId(state, playerId)
  return commit(state, message, state.finalRoundStartedBy ? 'final_round' : 'playing')
}

function getEligibleNobleIds(state: GameState, player: PlayerState): string[] {
  const discounts = countDiscounts(player)

  return state.nobles.filter((nobleId) => {
    const noble = getNoble(nobleId)
    return GEM_COLORS.every((color) => discounts[color] >= (noble.requirement[color] ?? 0))
  })
}

function awardNoble(state: GameState, player: PlayerState, nobleId: string): void {
  const index = state.nobles.indexOf(nobleId)
  if (index === -1) {
    throw new Error('Noble is not in the market.')
  }

  state.nobles.splice(index, 1)
  player.nobleIds.push(nobleId)
  player.score += getNoble(nobleId).prestige
}

function countDiscounts(player: PlayerState): Record<GemColor, number> {
  const discounts = Object.fromEntries(GEM_COLORS.map((color) => [color, 0])) as Record<
    GemColor,
    number
  >

  for (const cardId of player.purchasedCardIds) {
    discounts[getDevelopmentCard(cardId).bonus] += 1
  }

  return discounts
}

function takeGoldIfAvailable(state: GameState, player: PlayerState): void {
  if (state.bank.gold > 0) {
    state.bank.gold -= 1
    player.tokens.gold += 1
  }
}

function assertCanReserve(player: PlayerState): void {
  if (player.reservedCards.length >= MAX_RESERVED_CARDS) {
    throw new Error('Player cannot reserve more than three cards.')
  }
}

function assertCurrentPlayer(state: GameState, playerId: string): void {
  if (!state.players[playerId]) {
    throw new Error(`Unknown player: ${playerId}`)
  }
  if (state.currentPlayerId !== playerId) {
    throw new Error('Only the current player can act.')
  }
}

function nextPlayerId(state: GameState, playerId: string): string {
  const index = state.playerOrder.indexOf(playerId)
  return state.playerOrder[(index + 1) % state.playerOrder.length]
}

function allPlayersHaveEqualTurns(state: GameState): boolean {
  const firstTurnCount = state.players[state.playerOrder[0]].turnCount
  return state.playerOrder.every((playerId) => state.players[playerId].turnCount === firstTurnCount)
}

function countTokens(tokens: Record<TokenColor, number>): number {
  return TOKEN_COLORS.reduce((sum, color) => sum + tokens[color], 0)
}

function commit(state: GameState, message: string, phase: GameState['phase']): GameState {
  state.phase = phase
  state.version += 1
  state.log.push({
    id: `log-${state.version}`,
    message,
    turn: state.log.length,
  })
  return state
}

function cloneState(state: GameState): GameState {
  return {
    ...state,
    bank: { ...state.bank },
    decks: {
      1: [...state.decks[1]],
      2: [...state.decks[2]],
      3: [...state.decks[3]],
    },
    market: {
      1: [...state.market[1]],
      2: [...state.market[2]],
      3: [...state.market[3]],
    },
    nobles: [...state.nobles],
    players: Object.fromEntries(
      Object.entries(state.players).map(([playerId, player]) => [
        playerId,
        {
          ...player,
          tokens: { ...player.tokens },
          purchasedCardIds: [...player.purchasedCardIds],
          reservedCards: player.reservedCards.map(
            (reservedCard): ReservedCardRef => ({ ...reservedCard }),
          ),
          nobleIds: [...player.nobleIds],
        },
      ]),
    ),
    log: state.log.map((entry) => ({ ...entry })),
  }
}

function assertNever(value: never): never {
  throw new Error(`Unhandled game action: ${JSON.stringify(value)}`)
}
