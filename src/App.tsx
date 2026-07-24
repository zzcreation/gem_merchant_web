import { useEffect, useMemo, useRef, useState } from 'react'
import { Users } from 'lucide-react'
import { applyGameAction } from '../shared/game/actions'
import { getNoble } from '../shared/game/catalog'
import { createClientGameView } from '../shared/game/view'
import type { ClientGameView } from '../shared/game/types'
import type { ClientEvent } from '../shared/protocol/client-events'
import type { RoomLobbyPlayer, ServerEvent } from '../shared/protocol/server-events'
import { ActionPanel } from './components/ActionPanel'
import { Market } from './components/Market'
import { NobleFace } from './components/NobleFace'
import { PlayerRail } from './components/PlayerPanel'
import { RoomBar } from './components/RoomBar'
import { StatusBanner, type FeedbackState, type FeedbackTone } from './components/StatusBanner'
import { TokenPool } from './components/TokenPool'
import { usePaymentPlan } from './hooks/usePaymentPlan'
import { AboutScreen } from './screens/AboutScreen'
import { LandingScreen } from './screens/LandingScreen'
import { LoadingScreen } from './screens/LoadingScreen'
import { chooseDiscard, countAllTokens, countSelectedTokens } from './lib/affordability'
import { phaseText, serverActivityMessage, type ConnectionStatus } from './lib/format'
import { createMockGame } from './lib/mockGame'
import { findEligibleNobleIds } from './lib/nobles'
import {
  isPaymentExact,
  normalizePaymentPlan,
} from './lib/payment'
import { getGameResults } from './lib/results'
import { generateRoomCode, sanitizeRoomCode } from './lib/roomCode'
import { loadRoomSession, saveRoomSession } from './lib/roomSession'
import './App.css'

type AppScreen = 'landing' | 'about' | 'loading' | 'game'
type OnlineLobby = {
  roomCode: string
  players: RoomLobbyPlayer[]
}
type PendingAction = {
  successMessage: string
  clearSelection: boolean
}

const APP_VERSION = 'v0.0.0'
const HEARTBEAT_INTERVAL_MS = 25_000
const RECONNECT_DELAYS_MS = [1_000, 2_000, 5_000, 10_000]
const initialRoomSession = loadRoomSession()

function App() {
  const [screen, setScreen] = useState<AppScreen>('landing')
  const [game, setGame] = useState(createMockGame)
  const [onlineView, setOnlineView] = useState<ClientGameView | null>(null)
  const [onlineLobby, setOnlineLobby] = useState<OnlineLobby | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('local')
  const [roomCode, setRoomCode] = useState(initialRoomSession?.roomCode ?? 'GM-7428')
  const [nickname, setNickname] = useState(initialRoomSession?.nickname ?? '你')
  const [playerId, setPlayerId] = useState<string | null>(initialRoomSession?.playerId ?? null)
  const [resumeToken, setResumeToken] = useState<string | null>(initialRoomSession?.resumeToken ?? null)
  const [feedback, setFeedback] = useState<FeedbackState>({ tone: 'info', text: '本地 mock 对局已开始。' })
  const [pendingActionCount, setPendingActionCount] = useState(0)
  const [serverActivityText, setServerActivityText] = useState<string | null>(null)
  const [roomMenuOpen, setRoomMenuOpen] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const actionSeqRef = useRef(0)
  const pendingActionsRef = useRef(new Map<string, PendingAction>())
  const heartbeatTimerRef = useRef<number | null>(null)
  const reconnectTimerRef = useRef<number | null>(null)
  const reconnectAttemptRef = useRef(0)
  const shouldReconnectRef = useRef(false)
  const latestRoomRef = useRef({ roomCode, nickname, resumeToken })
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

  latestRoomRef.current = { roomCode, nickname, resumeToken }

  useEffect(() => {
    return () => {
      shouldReconnectRef.current = false
      stopHeartbeat()
      clearReconnectTimer()
      wsRef.current?.close()
    }
  }, [])

  function showFeedback(text: string, tone: FeedbackTone = 'info') {
    setFeedback({ text, tone })
  }

  function clearPendingActions() {
    pendingActionsRef.current.clear()
    setPendingActionCount(0)
  }

  function clearServerActivity() {
    setServerActivityText(null)
  }

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
        pendingActionsRef.current.set(actionId, { successMessage, clearSelection: true })
        setPendingActionCount(pendingActionsRef.current.size)
        setServerActivityText('正在等待服务器确认行动...')
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


  function connectRoom(targetRoomCode = roomCode) {
    const cleanRoomCode = sanitizeRoomCode(targetRoomCode)
    if (cleanRoomCode !== sanitizeRoomCode(roomCode)) {
      setPlayerId(null)
      setResumeToken(null)
    }
    shouldReconnectRef.current = true
    setRoomCode(cleanRoomCode)
    setScreen('game')
    openRoomConnection('manual', cleanRoomCode)
  }

  function createOnlineRoom() {
    connectRoom(generateRoomCode())
  }

  function startLocalGame() {
    shouldReconnectRef.current = false
    stopHeartbeat()
    clearReconnectTimer()
    wsRef.current?.close()
    wsRef.current = null
    setOnlineView(null)
    setOnlineLobby(null)
    setConnectionStatus('local')
    setGame(createMockGame())
    clearActionSelection()
    clearPendingActions()
    clearServerActivity()
    setScreen('game')
    showFeedback('本地 mock 对局已开始。', 'info')
  }

  function openRoomConnection(mode: 'manual' | 'reconnect', roomCodeOverride?: string) {
    wsRef.current?.close()
    const latestRoom = latestRoomRef.current
    const cleanRoomCode = sanitizeRoomCode(roomCodeOverride ?? latestRoom.roomCode)
    setRoomCode(cleanRoomCode)
    setConnectionStatus('connecting')
    setServerActivityText(mode === 'manual' ? `正在加入房间 ${cleanRoomCode}...` : `正在重新连接房间 ${cleanRoomCode}...`)
    clearReconnectTimer()
    stopHeartbeat()
    if (mode === 'manual') {
      setScreen('loading')
      setOnlineView(null)
      setOnlineLobby(null)
      clearActionSelection()
      reconnectAttemptRef.current = 0
    }
    clearPendingActions()
    showFeedback(mode === 'manual' ? `正在连接房间 ${cleanRoomCode}。` : `正在重新连接房间 ${cleanRoomCode}。`, 'pending')
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const socket = new WebSocket(`${protocol}//${window.location.host}/api/rooms/${cleanRoomCode}/websocket`)
    wsRef.current = socket

    socket.addEventListener('open', () => {
      if (wsRef.current !== socket) return
      const canResume = sanitizeRoomCode(latestRoomRef.current.roomCode) === cleanRoomCode
      setConnectionStatus('connected')
      reconnectAttemptRef.current = 0
      startHeartbeat()
      sendRoomEvent({
        type: 'room.join',
        roomCode: cleanRoomCode,
        nickname: latestRoomRef.current.nickname,
        resumeToken: canResume ? latestRoomRef.current.resumeToken ?? undefined : undefined,
      }, 0)
      setServerActivityText(mode === 'manual' ? `正在同步房间 ${cleanRoomCode}...` : `正在恢复房间 ${cleanRoomCode}...`)
      showFeedback(mode === 'manual' ? `已连接房间 ${cleanRoomCode}，正在加入。` : `已恢复连接，正在同步房间 ${cleanRoomCode}。`, 'pending')
    })
    socket.addEventListener('message', (event) => {
      if (wsRef.current !== socket) return
      handleServerEvent(JSON.parse(event.data as string) as ServerEvent)
    })
    socket.addEventListener('close', () => {
      if (wsRef.current !== socket) return
      stopHeartbeat()
      setConnectionStatus('closed')
      clearPendingActions()
      scheduleReconnect(cleanRoomCode)
    })
    socket.addEventListener('error', () => {
      if (wsRef.current !== socket) return
      stopHeartbeat()
      setConnectionStatus('closed')
      clearPendingActions()
      scheduleReconnect(cleanRoomCode)
    })
  }

  function disconnectRoom() {
    shouldReconnectRef.current = false
    stopHeartbeat()
    clearReconnectTimer()
    const socket = wsRef.current
    wsRef.current = null
    socket?.close()
    setOnlineView(null)
    setOnlineLobby(null)
    clearActionSelection()
    clearPendingActions()
    clearServerActivity()
    setPlayerId(null)
    setConnectionStatus('local')
    showFeedback('已回到本地 mock 对局。', 'info')
  }

  function startHeartbeat() {
    stopHeartbeat()
    heartbeatTimerRef.current = window.setInterval(() => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        return
      }
      actionSeqRef.current += 1
      wsRef.current.send(JSON.stringify({
        actionId: `heartbeat-${actionSeqRef.current}`,
        expectedVersion: onlineView?.version ?? 0,
        payload: { type: 'room.ping', sentAt: Date.now() },
      }))
    }, HEARTBEAT_INTERVAL_MS)
  }

  function stopHeartbeat() {
    if (heartbeatTimerRef.current !== null) {
      window.clearInterval(heartbeatTimerRef.current)
      heartbeatTimerRef.current = null
    }
  }

  function scheduleReconnect(cleanRoomCode: string) {
    if (reconnectTimerRef.current !== null) {
      return
    }

    if (!shouldReconnectRef.current) {
      showFeedback('房间连接已关闭，请重新加入房间。', 'error')
      return
    }

    const delay = RECONNECT_DELAYS_MS[Math.min(reconnectAttemptRef.current, RECONNECT_DELAYS_MS.length - 1)]
    reconnectAttemptRef.current += 1
    showFeedback(`房间连接中断，${Math.round(delay / 1000)} 秒后自动重连 ${cleanRoomCode}。`, 'pending')
    clearReconnectTimer()
    reconnectTimerRef.current = window.setTimeout(() => {
      openRoomConnection('reconnect')
    }, delay)
  }

  function clearReconnectTimer() {
    if (reconnectTimerRef.current !== null) {
      window.clearTimeout(reconnectTimerRef.current)
      reconnectTimerRef.current = null
    }
  }

  function sendRoomEvent(payload: ClientEvent, expectedVersion = view.version): string | null {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      showFeedback('房间尚未连接，请先加入房间。', 'error')
      return null
    }

    actionSeqRef.current += 1
    const actionId = `client-${actionSeqRef.current}`
    setServerActivityText(serverActivityMessage(payload))
    wsRef.current.send(JSON.stringify({
      actionId,
      expectedVersion,
      payload,
    }))
    return actionId
  }

  function handleServerEvent(event: ServerEvent) {
    switch (event.type) {
      case 'room.joined':
        setPlayerId(event.playerId)
        setResumeToken(event.resumeToken)
        saveRoomSession({
          roomCode: event.roomCode,
          nickname,
          playerId: event.playerId,
          resumeToken: event.resumeToken,
        })
        setServerActivityText(`正在获取房间 ${event.roomCode} 状态...`)
        showFeedback(`已加入房间 ${event.roomCode}。`, 'success')
        break
      case 'room.lobby':
        setScreen('game')
        clearServerActivity()
        setOnlineLobby({ roomCode: event.roomCode, players: event.players })
        showFeedback(`房间 ${event.roomCode} · ${event.players.length} 人。`, 'info')
        break
      case 'state.snapshot':
      case 'state.patch':
        setScreen('game')
        clearServerActivity()
        setOnlineView(event.view)
        setOnlineLobby(null)
        break
      case 'game.actionAccepted':
        {
          const pendingAction = pendingActionsRef.current.get(event.actionId)
          if (pendingAction) {
            pendingActionsRef.current.delete(event.actionId)
            setPendingActionCount(pendingActionsRef.current.size)
            if (pendingAction.clearSelection) {
              clearActionSelection()
            }
            if (pendingActionsRef.current.size === 0) {
              clearServerActivity()
            }
            showFeedback(pendingAction.successMessage, 'success')
          } else {
            clearServerActivity()
            showFeedback(`行动已同步到版本 ${event.version}。`, 'success')
          }
        }
        break
      case 'game.error':
        if (event.actionId) {
          pendingActionsRef.current.delete(event.actionId)
          setPendingActionCount(pendingActionsRef.current.size)
        }
        clearServerActivity()
        showFeedback(event.message, 'error')
        break
      case 'room.playerJoined':
        showFeedback(`${event.nickname} 加入房间。`, 'info')
        break
      case 'room.timer':
        break
      case 'room.pong':
        break
    }
  }

  if (screen === 'landing') {
    return (
      <LandingScreen
        appVersion={APP_VERSION}
        nickname={nickname}
        roomCode={roomCode}
        isConnecting={isConnecting}
        onNicknameChange={setNickname}
        onRoomCodeChange={(value) => {
          setRoomCode(value)
          setPlayerId(null)
          setResumeToken(null)
        }}
        onJoinRoom={() => connectRoom(roomCode)}
        onCreateRoom={createOnlineRoom}
        onStartLocal={startLocalGame}
        onOpenAbout={() => setScreen('about')}
      />
    )
  }

  if (screen === 'about') {
    return (
      <AboutScreen
        appVersion={APP_VERSION}
        onBack={() => setScreen('landing')}
      />
    )
  }

  if (screen === 'loading') {
    return <LoadingScreen message={serverIndicatorText} />
  }

  return (
    <main className="app-shell">
      {serverIndicatorText ? (
        <div className="server-indicator" role="status" aria-live="polite">
          <span className="loading-spinner small" />
          <span>{serverIndicatorText}</span>
        </div>
      ) : null}
      <RoomBar
        displayRoomId={displayRoomId}
        modeLabel={view.mode === 'classic' ? '经典规则' : '5 人扩展'}
        displayPhase={displayPhase}
        connectionStatus={connectionStatus}
        roomCode={roomCode}
        nickname={nickname}
        roomMenuOpen={roomMenuOpen}
        isConnecting={isConnecting}
        onRoomMenuToggle={setRoomMenuOpen}
        onRoomCodeChange={(value) => {
          setRoomCode(value)
          setPlayerId(null)
          setResumeToken(null)
        }}
        onNicknameChange={setNickname}
        onJoin={() => connectRoom()}
        onGoLocal={() => disconnectRoom()}
        onCopyRoomCode={() => showFeedback('房间码已复制。', 'success')}
        onResetLocal={() => {
          disconnectRoom()
          setGame(createMockGame())
          clearActionSelection()
          showFeedback('已重开本地 mock 对局。', 'success')
        }}
      />

      {isOnlineLobby ? (
        <section className="lobby-layout" aria-label="在线房间大厅">
          <div className="lobby-panel">
            <div className="panel-title">
              <div>
                <h2>在线大厅</h2>
                <p>房间 {onlineLobby?.roomCode ?? sanitizeRoomCode(roomCode)}</p>
              </div>
              <Users size={22} />
            </div>
            <StatusBanner feedback={feedback} />
            <div className="lobby-roster" data-testid="lobby-roster">
              {(onlineLobby?.players ?? []).map((player) => (
                <article className="lobby-player" key={player.id}>
                  <div>
                    <strong>{player.nickname}</strong>
                    <span>{player.connected ? '在线' : '离线'}</span>
                  </div>
                  <span className={player.ready ? 'ready-pill ready' : 'ready-pill'}>
                    {player.ready ? '已准备' : '未准备'}
                  </span>
                </article>
              ))}
            </div>
            <div className="action-stack compact">
              <button
                className="secondary-button"
                type="button"
                disabled={!playerId || isActionPending}
                onClick={() => sendRoomEvent({ type: 'room.ready', ready: !(lobbyViewer?.ready ?? false) }, 0)}
              >
                {lobbyViewer?.ready ? '取消准备' : '准备'}
              </button>
              <button
                className="secondary-button selected"
                type="button"
                disabled={!playerId || isActionPending}
                onClick={() => sendRoomEvent({ type: 'room.start' }, 0)}
              >
                开始房间
              </button>
            </div>
          </div>
        </section>
      ) : (
      <section className="game-layout" aria-label="游戏桌面">
        <PlayerRail
          players={view.playerOrder.map((id) => view.players[id])}
          currentPlayerId={view.currentPlayerId}
        />

        <section className="table-surface" aria-label="公共牌桌">
          <div className="table-header">
            <div className="noble-track" aria-label="贵族">
              {view.nobles.map((nobleId) => (
                <NobleFace key={nobleId} noble={getNoble(nobleId)} />
              ))}
            </div>
            <TokenPool
              bank={view.bank}
              selectedTokens={selectedTokens}
              canAct={canAct}
              className="bank desktop-bank"
              onToggle={toggleToken}
            />
          </div>

          <Market
            market={view.market}
            selectedCard={selectedCard}
            viewerPlayer={viewerPlayer}
            onSelectCard={selectMarketCard}
          />
        </section>

        <ActionPanel
          view={view}
          currentPlayer={currentPlayer}
          viewerPlayer={viewerPlayer}
          canAct={canAct}
          isViewerTurn={isViewerTurn}
          isActionPending={isActionPending}
          feedback={feedback}
          gameResults={gameResults}
          selectedTokens={selectedTokens}
          hasSelectedTokens={hasSelectedTokens}
          viewerVisibleReservedCards={viewerVisibleReservedCards}
          selectedReservedCardId={selectedReservedCardId}
          selectedCardId={selectedCardId}
          selectedPaymentCardId={selectedPaymentCardId}
          paymentPlan={paymentPlan}
          canBuySelectedMarketCard={canBuySelectedMarketCard}
          canBuySelectedReservedCard={canBuySelectedReservedCard}
          discardPlan={discardPlan}
          discardNeeded={discardNeeded}
          eligibleNobleIds={eligibleNobleIds}
          onToggleToken={toggleToken}
          onSelectReservedCard={selectReservedCard}
          onSuggestPayment={suggestPayment}
          onUpdatePayment={updatePayment}
          onCanIncreasePayment={canIncreasePayment}
          onTakeSelectedTokens={() =>
            run(
              { type: 'takeTokens', tokens: selectedTokens },
              `${viewerPlayer.nickname} 拿取宝石。`,
            )
          }
          onBuyMarketCard={buySelectedCard}
          onBuyReservedCard={buySelectedReservedCard}
          onReserveMarketCard={reserveSelectedCard}
          onPassTurn={() => run({ type: 'passTurn', reason: 'no_legal_action' }, '跳过当前回合。')}
          onReserveDeck={(level) =>
            run(
              { type: 'reserveDeckCard', level },
              `${viewerPlayer.nickname} 盲抽预留 L${level}。`,
            )
          }
          onUpdateDiscard={updateDiscard}
          onSubmitDiscard={submitDiscardPlan}
          onAutoDiscard={discardAutomatically}
          onChooseNoble={chooseNoble}
        />
      </section>
      )}
    </main>
  )
}

export default App
