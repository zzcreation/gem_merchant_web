import { useMemo, useState } from 'react'
import { applyGameAction } from '../../shared/game/actions'
import { createClientGameView } from '../../shared/game/view'
import type { ClientEvent } from '../../shared/protocol/client-events'
import type { ClientGameView } from '../../shared/game/types'
import type { FeedbackTone } from '../components/StatusBanner'
import type { AppScreen } from '../lib/appScreen'
import { chooseDiscard, countAllTokens, countSelectedTokens } from '../lib/affordability'
import { phaseText, type ConnectionStatus } from '../lib/format'
import { createMockGame } from '../lib/mockGame'
import { findEligibleNobleIds } from '../lib/nobles'
import { isPaymentExact, normalizePaymentPlan } from '../lib/payment'
import { getGameResults } from '../lib/results'
import type { OnlineLobby, PendingAction } from './useOnlineRoom'
import { usePaymentPlan } from './usePaymentPlan'

type UseGameSessionArgs = {
  onlineView: ClientGameView | null
  onlineLobby: OnlineLobby | null
  connectionStatus: ConnectionStatus
  playerId: string | null
  pendingActionCount: number
  serverActivityText: string | null
  sendRoomEvent: (payload: ClientEvent, expectedVersion: number) => string | null
  registerPendingAction: (actionId: string, pendingAction: PendingAction, activityText?: string) => void
  resetToLocal: () => void
  disconnectRoom: () => void
  showFeedback: (text: string, tone?: FeedbackTone) => void
  onScreenChange: (screen: AppScreen) => void
}

export function useGameSession({
  onlineView,
  onlineLobby,
  connectionStatus,
  playerId,
  pendingActionCount,
  serverActivityText,
  sendRoomEvent,
  registerPendingAction,
  resetToLocal,
  disconnectRoom,
  showFeedback,
  onScreenChange,
}: UseGameSessionArgs) {
  const [game, setGame] = useState(createMockGame)

  const localView = useMemo(() => createClientGameView(game, game.currentPlayerId), [game])
  const view = onlineView ?? localView
  const activePlayerId = onlineView ? (playerId ?? onlineView.currentPlayerId) : game.currentPlayerId
  const currentPlayer = view.players[view.currentPlayerId]
  const viewerPlayer = view.players[activePlayerId] ?? currentPlayer
  const lobbyViewer = onlineLobby?.players.find((player) => player.id === playerId) ?? null
  const isOnline = connectionStatus === 'connected'
  const isConnecting = connectionStatus === 'connecting'
  const isOnlineLobby = isOnline && !onlineView
  const isActionPending = pendingActionCount > 0
  const isGameFinished = view.phase === 'finished'
  const serverIndicatorText = serverActivityText
    ?? (isConnecting ? '正在连接服务器...' : null)
    ?? (isActionPending ? '正在等待服务器确认...' : null)
  const canAct = (!isOnline || playerId === view.currentPlayerId) && !isActionPending && !isGameFinished
  const isViewerTurn = activePlayerId === view.currentPlayerId
  const displayRoomId = onlineView?.id ?? onlineLobby?.roomCode ?? view.id
  const displayPhase = onlineView ? phaseText(onlineView.phase) : onlineLobby ? '大厅' : phaseText(view.phase)
  const gameResults = isGameFinished ? getGameResults(view) : null
  const eligibleNobleIds = findEligibleNobleIds(view, currentPlayer)
  const discardNeeded = Math.max(0, countAllTokens(currentPlayer.tokens) - 10)

  const {
    selectedTokens,
    selectedCard,
    selectedReservedCardId,
    paymentPlan,
    discardPlan,
    selectedCardId,
    selectedPaymentCardId,
    hasSelectedTokens,
    viewerVisibleReservedCards,
    canBuySelectedMarketCard,
    canBuySelectedReservedCard,
    clearActionSelection,
    toggleToken,
    updatePayment,
    canIncreasePayment,
    updateDiscard,
    selectMarketCard,
    selectReservedCard,
    suggestPayment,
  } = usePaymentPlan({
    viewerPlayer,
    bank: view.bank,
    market: view.market,
    currentPlayerTokens: currentPlayer.tokens,
    discardNeeded,
  })

  function run(action: Parameters<typeof applyGameAction>[2], successMessage: string) {
    if (isActionPending) {
      showFeedback('上一个行动仍在确认中，请稍等。', 'pending')
      return
    }

    if (!canAct) {
      showFeedback(isOnline ? '还没轮到你行动。' : '当前不能行动。', 'error')
      return
    }

    if (isOnline) {
      const actionId = sendRoomEvent({ type: 'game.action', action }, view.version)
      if (actionId) {
        registerPendingAction(actionId, { successMessage, clearSelection: true }, '正在等待服务器确认行动...')
        showFeedback('行动已发送，等待服务器确认。', 'pending')
      }
      return
    }

    try {
      const nextGame = applyGameAction(game, game.currentPlayerId, action)
      setGame(nextGame)
      clearActionSelection()
      showFeedback(successMessage, 'success')
    } catch (error) {
      showFeedback(error instanceof Error ? error.message : '行动失败。', 'error')
    }
  }

  function buySelectedCard() {
    if (!selectedCardId || !selectedCard) {
      showFeedback('先选择一张市场卡。', 'error')
      return
    }

    if (!isPaymentExact(viewerPlayer, selectedCardId, paymentPlan)) {
      showFeedback('请先分配刚好覆盖折后成本的支付。', 'error')
      return
    }

    run(
      { type: 'buyMarketCard', level: selectedCard.level, slot: selectedCard.slot, payment: normalizePaymentPlan(paymentPlan) },
      `${viewerPlayer.nickname} 购买了市场卡。`,
    )
  }

  function buySelectedReservedCard() {
    if (!selectedReservedCardId) {
      showFeedback('先选择一张自己的预留卡。', 'error')
      return
    }

    if (!isPaymentExact(viewerPlayer, selectedReservedCardId, paymentPlan)) {
      showFeedback('请先分配刚好覆盖折后成本的支付。', 'error')
      return
    }

    run(
      { type: 'buyReservedCard', cardId: selectedReservedCardId, payment: normalizePaymentPlan(paymentPlan) },
      `${viewerPlayer.nickname} 购买了预留卡。`,
    )
  }

  function reserveSelectedCard() {
    if (!selectedCard) {
      showFeedback('先选择一张市场卡。', 'error')
      return
    }

    run(
      { type: 'reserveMarketCard', level: selectedCard.level, slot: selectedCard.slot },
      `${viewerPlayer.nickname} 预留了市场卡。`,
    )
  }

  function discardAutomatically() {
    run(
      { type: 'discardTokens', tokens: chooseDiscard(currentPlayer) },
      `${currentPlayer.nickname} 弃到 10 颗宝石。`,
    )
  }

  function submitDiscardPlan() {
    if (countSelectedTokens(discardPlan) !== discardNeeded) {
      showFeedback(`请选择刚好 ${discardNeeded} 颗要弃掉的宝石。`, 'error')
      return
    }
    run(
      { type: 'discardTokens', tokens: discardPlan },
      `${currentPlayer.nickname} 弃到 10 颗宝石。`,
    )
  }

  function chooseNoble(nobleId: string) {
    if (!eligibleNobleIds.includes(nobleId)) {
      showFeedback('没有可选择的贵族。', 'error')
      return
    }
    run({ type: 'chooseNoble', nobleId }, `${currentPlayer.nickname} 获得贵族。`)
  }

  function takeSelectedTokens() {
    run(
      { type: 'takeTokens', tokens: selectedTokens },
      `${viewerPlayer.nickname} 拿取宝石。`,
    )
  }

  function passTurn() {
    run({ type: 'passTurn', reason: 'no_legal_action' }, '跳过当前回合。')
  }

  function reserveDeckCard(level: 1 | 2 | 3) {
    run(
      { type: 'reserveDeckCard', level },
      `${viewerPlayer.nickname} 盲抽预留 L${level}。`,
    )
  }

  function startLocalGame() {
    resetToLocal()
    setGame(createMockGame())
    clearActionSelection()
    onScreenChange('game')
    showFeedback('本地 mock 对局已开始。', 'info')
  }

  function resetLocalGame() {
    disconnectRoom()
    setGame(createMockGame())
    clearActionSelection()
    showFeedback('已重开本地 mock 对局。', 'success')
  }

  return {
    view,
    onlineLobby,
    activePlayerId,
    currentPlayer,
    viewerPlayer,
    canAct,
    isViewerTurn,
    displayRoomId,
    displayPhase,
    gameResults,
    eligibleNobleIds,
    discardNeeded,
    isGameFinished,
    isOnline,
    isConnecting,
    isOnlineLobby,
    isActionPending,
    serverIndicatorText,
    lobbyViewer,
    selectedTokens,
    selectedCard,
    selectedReservedCardId,
    paymentPlan,
    discardPlan,
    selectedCardId,
    selectedPaymentCardId,
    hasSelectedTokens,
    viewerVisibleReservedCards,
    canBuySelectedMarketCard,
    canBuySelectedReservedCard,
    clearActionSelection,
    toggleToken,
    updatePayment,
    canIncreasePayment,
    updateDiscard,
    selectMarketCard,
    selectReservedCard,
    suggestPayment,
    buySelectedCard,
    buySelectedReservedCard,
    reserveSelectedCard,
    discardAutomatically,
    submitDiscardPlan,
    chooseNoble,
    takeSelectedTokens,
    passTurn,
    reserveDeckCard,
    startLocalGame,
    resetLocalGame,
  }
}

export type GameSession = ReturnType<typeof useGameSession>
