import type { ClientGameView } from '../../shared/game/types'

export function getGameResults(view: ClientGameView): {
  winnerNames: string[]
  rows: Array<{
    playerId: string
    nickname: string
    score: number
    cardCount: number
    nobleCount: number
    reservedCount: number
    turnCount: number
    seatIndex: number
    isWinner: boolean
  }>
} {
  const rows = view.playerOrder
    .map((playerId) => {
      const player = view.players[playerId]
      return {
        playerId,
        nickname: player.nickname,
        score: player.score,
        cardCount: player.purchasedCardIds.length,
        nobleCount: player.nobleIds.length,
        reservedCount: player.reservedCards.length,
        turnCount: player.turnCount,
        seatIndex: player.seatIndex,
        isWinner: false,
      }
    })
    .sort((a, b) => b.score - a.score || a.cardCount - b.cardCount || a.seatIndex - b.seatIndex)

  const best = rows[0]
  const winnerIds = new Set(
    rows
      .filter((row) => row.score === best.score && row.cardCount === best.cardCount)
      .map((row) => row.playerId),
  )
  const markedRows = rows.map((row) => ({ ...row, isWinner: winnerIds.has(row.playerId) }))

  return {
    winnerNames: markedRows.filter((row) => row.isWinner).map((row) => row.nickname),
    rows: markedRows,
  }
}
