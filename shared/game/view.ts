import type {
  ClientGameView,
  ClientPlayerView,
  ClientReservedCardRef,
  GameState,
  ReservedCardRef,
} from './types'

export function createClientGameView(state: GameState, viewerId: string): ClientGameView {
  return {
    id: state.id,
    mode: state.mode,
    phase: state.phase,
    playerOrder: [...state.playerOrder],
    currentPlayerId: state.currentPlayerId,
    bank: { ...state.bank },
    deckCounts: {
      1: state.decks[1].length,
      2: state.decks[2].length,
      3: state.decks[3].length,
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
        createClientPlayerView(player, viewerId),
      ]),
    ),
    log: state.log.map((entry) => ({ ...entry })),
    version: state.version,
  }
}

function createClientPlayerView(
  player: GameState['players'][string],
  viewerId: string,
): ClientPlayerView {
  return {
    id: player.id,
    nickname: player.nickname,
    seatIndex: player.seatIndex,
    connected: player.connected,
    ready: player.ready,
    tokens: { ...player.tokens },
    purchasedCardIds: [...player.purchasedCardIds],
    reservedCards: player.reservedCards.map((reservedCard) =>
      createClientReservedCardRef(reservedCard, player.id === viewerId),
    ),
    nobleIds: [...player.nobleIds],
    score: player.score,
    turnCount: player.turnCount,
  }
}

function createClientReservedCardRef(
  reservedCard: ReservedCardRef,
  isOwner: boolean,
): ClientReservedCardRef {
  if (reservedCard.visibility === 'public') {
    return { type: 'public', cardId: reservedCard.cardId, source: 'market' }
  }

  if (isOwner) {
    return { type: 'private', cardId: reservedCard.cardId, source: 'deck' }
  }

  return { type: 'hidden', source: 'deck' }
}
