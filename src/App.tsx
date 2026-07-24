import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Copy,
  Crown,
  Gem,
  Info,
  LogIn,
  Play,
  Plus,
  RotateCcw,
  Settings,
  ShieldCheck,
  Users,
} from 'lucide-react'
import { applyGameAction } from '../shared/game/actions'
import { GEM_COLORS, TOKEN_COLORS } from '../shared/game/constants'
import { getDevelopmentCard, getNoble } from '../shared/game/catalog'
import { createClientGameView } from '../shared/game/view'
import type { GemColor, PaymentPlan, TokenColor } from '../shared/game/types'
import type { ClientGameView } from '../shared/game/types'
import type { ClientEvent } from '../shared/protocol/client-events'
import type { RoomLobbyPlayer, ServerEvent } from '../shared/protocol/server-events'
import { CardFace, EmptyCardFace } from './components/CardFace'
import { GemToken } from './components/GemToken'
import { NobleFace } from './components/NobleFace'
import { chooseDiscard, countAllTokens, countSelectedTokens, getCardAffordability } from './lib/affordability'
import { cardCostEntries, cardLabel, countPurchasedBonus, hasVisibleCardId } from './lib/cards'
import { colorName, connectionText, phaseText, serverActivityMessage, type ConnectionStatus } from './lib/format'
import { createMockGame } from './lib/mockGame'
import { findEligibleNobleIds } from './lib/nobles'
import {
  adjustPaymentPlan,
  canAdjustPaymentPlan,
  createSuggestedPaymentPlan,
  discountedCost,
  emptyPaymentPlan,
  isPaymentExact,
  normalizePaymentPlan,
  paymentSummary,
} from './lib/payment'
import { getGameResults } from './lib/results'
import { generateRoomCode, sanitizeRoomCode } from './lib/roomCode'
import { loadRoomSession, saveRoomSession } from './lib/roomSession'
import './App.css'

type Level = 1 | 2 | 3
type AppScreen = 'landing' | 'about' | 'loading' | 'game'
type FeedbackTone = 'info' | 'success' | 'error' | 'pending'
type OnlineLobby = {
  roomCode: string
  players: RoomLobbyPlayer[]
}
type PendingAction = {
  successMessage: string
  clearSelection: boolean
}
type FeedbackState = {
  tone: FeedbackTone
  text: string
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
  const [selectedTokens, setSelectedTokens] = useState<Partial<Record<GemColor, number>>>({})
  const [selectedCard, setSelectedCard] = useState<{ level: Level; slot: number } | null>(null)
  const [selectedReservedCardId, setSelectedReservedCardId] = useState<string | null>(null)
  const [paymentPlan, setPaymentPlan] = useState<PaymentPlan>(emptyPaymentPlan)
  const [discardPlan, setDiscardPlan] = useState<Partial<Record<TokenColor, number>>>({})
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
  const selectedCardId = selectedCard ? view.market[selectedCard.level][selectedCard.slot] : null
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
  const selectedPaymentCardId = selectedReservedCardId ?? selectedCardId
  const selectedTokenCount = countSelectedTokens(selectedTokens)
  const hasSelectedTokens = selectedTokenCount > 0
  const viewerVisibleReservedCards = viewerPlayer.reservedCards.filter(hasVisibleCardId)
  const canBuySelectedMarketCard = isPaymentExact(viewerPlayer, selectedCardId, paymentPlan)
  const canBuySelectedReservedCard = isPaymentExact(viewerPlayer, selectedReservedCardId, paymentPlan)
  const gameResults = isGameFinished ? getGameResults(view) : null
  const eligibleNobleIds = findEligibleNobleIds(view, currentPlayer)
  const discardNeeded = Math.max(0, countAllTokens(currentPlayer.tokens) - 10)

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

  function toggleToken(color: GemColor) {
    setSelectedTokens((current) => {
      const currentAmount = current[color] ?? 0
      const otherColors = GEM_COLORS.filter((otherColor) => otherColor !== color && (current[otherColor] ?? 0) > 0)
      const next: Partial<Record<GemColor, number>> = {}

      for (const otherColor of otherColors) {
        next[otherColor] = 1
      }

      if (currentAmount === 0) {
        if (otherColors.length >= 3) {
          return current
        }
        next[color] = 1
      } else if (currentAmount === 1 && otherColors.length === 0 && view.bank[color] >= 4) {
        next[color] = 2
      } else if (currentAmount === 2) {
        next[color] = 1
      } else {
        delete next[color]
      }
      return next
    })
  }

  function updatePayment(kind: keyof PaymentPlan, color: GemColor, delta: number) {
    if (!selectedPaymentCardId) {
      return
    }

    setPaymentPlan((current) => adjustPaymentPlan(current, viewerPlayer, selectedPaymentCardId, kind, color, delta))
  }

  function canIncreasePayment(kind: keyof PaymentPlan, color: GemColor): boolean {
    if (!selectedPaymentCardId) {
      return false
    }

    return canAdjustPaymentPlan(paymentPlan, viewerPlayer, selectedPaymentCardId, kind, color)
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

  function updateDiscard(color: TokenColor, delta: number) {
    setDiscardPlan((current) => {
      const next = { ...current }
      const currentAmount = next[color] ?? 0
      const selectedTotal = countSelectedTokens(current)
      const availableRoom = Math.max(0, discardNeeded - selectedTotal + currentAmount)
      const nextAmount = Math.max(0, Math.min(currentAmount + delta, currentPlayer.tokens[color], availableRoom))
      if (nextAmount === 0) {
        delete next[color]
      } else {
        next[color] = nextAmount
      }
      return next
    })
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

  function clearActionSelection() {
    setSelectedTokens({})
    setSelectedCard(null)
    setSelectedReservedCardId(null)
    setPaymentPlan(emptyPaymentPlan())
    setDiscardPlan({})
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

  function renderBankTokens(className = 'bank', testPrefix = 'bank-token') {
    return (
      <div className={className} aria-label="公共宝石池" data-testid={testPrefix === 'bank-token' ? 'bank-token-summary' : undefined}>
        {TOKEN_COLORS.map((color) => (
          <button
            className={`bank-token ${color} ${selectedTokens[color as GemColor] ? 'selected' : ''}`}
            disabled={!canAct || color === 'gold' || view.bank[color] === 0}
            type="button"
            key={color}
            aria-label={color === 'gold' ? '金币' : `选择${colorName(color)}宝石`}
            data-testid={`${testPrefix}-${color}`}
            onClick={() => canAct && color !== 'gold' && toggleToken(color)}
          >
            <span>{view.bank[color]}</span>
            {selectedTokens[color as GemColor] ? <em>{selectedTokens[color as GemColor]}</em> : null}
          </button>
        ))}
      </div>
    )
  }

  if (screen === 'landing') {
    return (
      <main className="platform-shell">
        <section className="platform-hero" aria-label="Gem Merchant 平台首页">
          <div className="platform-header">
            <div className="platform-brand">
              <span className="brand-mark">
                <Gem size={24} />
              </span>
              <div>
                <h1>Gem Merchant</h1>
                <p>多人线上宝石商人平台</p>
              </div>
            </div>
            <span className="version-pill">{APP_VERSION}</span>
          </div>

          <div className="platform-grid">
            <form
              className="join-panel"
              onSubmit={(event) => {
                event.preventDefault()
                connectRoom(roomCode)
              }}
            >
              <div className="panel-title">
                <div>
                  <h2>加入房间</h2>
                  <p>输入朋友发来的房间码</p>
                </div>
                <LogIn size={20} />
              </div>
              <label className="field-row">
                <span>昵称</span>
                <input
                  aria-label="昵称"
                  maxLength={24}
                  value={nickname}
                  onChange={(event) => setNickname(event.target.value)}
                />
              </label>
              <label className="field-row">
                <span>房间码</span>
                <input
                  aria-label="房间码"
                  maxLength={32}
                  value={roomCode}
                  onChange={(event) => {
                    setRoomCode(event.target.value)
                    setPlayerId(null)
                    setResumeToken(null)
                  }}
                />
              </label>
              <button className="primary-button landing-button" type="submit" disabled={isConnecting}>
                <LogIn size={18} />
                {isConnecting ? '连接中' : '加入房间'}
              </button>
            </form>

            <section className="create-panel" aria-label="创建房间">
              <div className="panel-title">
                <div>
                  <h2>创建房间</h2>
                  <p>生成新房间并邀请朋友加入</p>
                </div>
                <Plus size={20} />
              </div>
              <button className="primary-button landing-button" type="button" disabled={isConnecting} onClick={createOnlineRoom}>
                <Plus size={18} />
                创建房间
              </button>
              <p className="panel-note">创建后会进入在线大厅，可以在房间菜单复制房间码。</p>
            </section>

            <section className="options-panel" aria-label="选项">
              <div className="panel-title">
                <div>
                  <h2>选项</h2>
                  <p>当前偏好和本地调试入口</p>
                </div>
                <Settings size={20} />
              </div>
              <label className="field-row">
                <span>规则</span>
                <select aria-label="规则模式" value="classic" disabled>
                  <option value="classic">经典 2-4 人</option>
                </select>
              </label>
              <button className="secondary-button landing-secondary" type="button" onClick={startLocalGame}>
                本地试玩
              </button>
            </section>

            <section className="about-panel" aria-label="About">
              <div className="panel-title">
                <div>
                  <h2>About</h2>
                  <p>线上对战、房间邀请、移动端优化</p>
                </div>
                <Info size={20} />
              </div>
              <button className="secondary-button landing-secondary" type="button" onClick={() => setScreen('about')}>
                查看 About
              </button>
            </section>
          </div>
        </section>
      </main>
    )
  }

  if (screen === 'about') {
    return (
      <main className="platform-shell">
        <section className="about-page" aria-label="About 页面">
          <div className="platform-header">
            <div className="platform-brand">
              <span className="brand-mark">
                <Gem size={24} />
              </span>
              <div>
                <h1>Gem Merchant</h1>
                <p>About</p>
              </div>
            </div>
            <span className="version-pill">{APP_VERSION}</span>
          </div>
          <div className="about-copy">
            <h2>多人线上宝石商人</h2>
            <p>这是一个面向朋友聚会和远程开局的网页桌游平台，核心体验是快速创建房间、分享房间码、在手机或桌面浏览器中同步游玩。</p>
            <p>当前版本已支持在线大厅、实时对局、断线重连、移动端两行动作栏、可购买卡高亮和基础后台统计。</p>
          </div>
          <button className="secondary-button landing-secondary" type="button" onClick={() => setScreen('landing')}>
            返回首页
          </button>
        </section>
      </main>
    )
  }

  if (screen === 'loading') {
    return (
      <main className="platform-shell">
        <section className="loading-page" aria-busy="true" aria-label="正在连接房间">
          <span className="loading-spinner" />
          <div>
            <h1>正在进入房间</h1>
            <p>{serverIndicatorText ?? '正在与服务器通讯...'}</p>
          </div>
        </section>
      </main>
    )
  }

  return (
    <main className="app-shell">
      {serverIndicatorText ? (
        <div className="server-indicator" role="status" aria-live="polite">
          <span className="loading-spinner small" />
          <span>{serverIndicatorText}</span>
        </div>
      ) : null}
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">
            <Gem size={21} />
          </span>
          <div>
            <h1>Gem Merchant</h1>
            <p data-testid="room-status">
              房间 {displayRoomId} · {view.mode === 'classic' ? '经典规则' : '5 人扩展'} ·{' '}
              {displayPhase} · {connectionText(connectionStatus)}
            </p>
          </div>
        </div>
        <details className="room-menu" open={roomMenuOpen} onToggle={(event) => setRoomMenuOpen(event.currentTarget.open)}>
          <summary>房间</summary>
          <div className="room-menu-panel">
            <div className="room-controls" aria-label="房间连接">
              <input
                aria-label="房间码"
                maxLength={32}
                value={roomCode}
                onChange={(event) => {
                  setRoomCode(event.target.value)
                  setPlayerId(null)
                  setResumeToken(null)
                }}
              />
              <input
                aria-label="昵称"
                maxLength={24}
                value={nickname}
                onChange={(event) => setNickname(event.target.value)}
              />
              <button
                className="small-button"
                type="button"
                disabled={isConnecting}
                onClick={() => {
                  connectRoom()
                  setRoomMenuOpen(false)
                }}
              >
                {isConnecting ? '连接中' : '加入'}
              </button>
              <button
                className="small-button"
                type="button"
                disabled={isConnecting}
                onClick={() => {
                  disconnectRoom()
                  setRoomMenuOpen(false)
                }}
              >
                本地
              </button>
            </div>
            <div className="topbar-actions">
              <button
                className="icon-button"
                type="button"
                aria-label="复制房间码"
                onClick={() => {
                  void navigator.clipboard.writeText(sanitizeRoomCode(roomCode))
                  setRoomMenuOpen(false)
                  showFeedback('房间码已复制。', 'success')
                }}
              >
                <Copy size={18} />
              </button>
              <button
                className="icon-button"
                type="button"
                aria-label="重开本地对局"
                onClick={() => {
                  disconnectRoom()
                  setGame(createMockGame())
                  clearActionSelection()
                  setRoomMenuOpen(false)
                  showFeedback('已重开本地 mock 对局。', 'success')
                }}
              >
                <RotateCcw size={18} />
              </button>
            </div>
          </div>
        </details>
      </header>

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
            <div
              aria-busy={feedback.tone === 'pending'}
              aria-live="polite"
              className={`status-banner ${feedback.tone}`}
              data-status-tone={feedback.tone}
              data-testid="status-message"
              role="status"
            >
              {feedback.text}
            </div>
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
        <aside className="player-rail" aria-label="玩家公开信息">
          {view.playerOrder.map((playerId) => {
            const player = view.players[playerId]
            return (
              <article
                className={playerId === view.currentPlayerId ? 'player-panel active' : 'player-panel'}
                key={player.id}
              >
                <div className="panel-title">
                  <div>
                    <h2>{player.nickname}</h2>
                    <p>{playerId === view.currentPlayerId ? '当前行动' : player.ready ? '已准备' : '等待'}</p>
                  </div>
                  <strong>{player.score}</strong>
                </div>
                <div className="gem-row" data-testid={`player-token-summary-${player.nickname}`}>
                  {TOKEN_COLORS.map((color) => (
                    <span
                      className={`player-token ${color}`}
                      data-testid={`player-token-${player.nickname}-${color}`}
                      key={color}
                    >
                      {player.tokens[color]}
                    </span>
                  ))}
                </div>
                <div className="discount-grid">
                  {GEM_COLORS.map((color) => (
                    <span className={`discount ${color}`} key={color}>
                      {countPurchasedBonus(player, color)}
                    </span>
                  ))}
                </div>
                <div className="reserved-list">
                  {player.reservedCards.length === 0 ? (
                    <span>无预留</span>
                  ) : (
                    player.reservedCards.map((reserved, index) => (
                      <span className="reserved-pill" key={`${player.id}-${index}`}>
                        {reserved.type === 'hidden' ? '暗牌' : (
                          <>
                            <span>{cardLabel(reserved.cardId)}</span>
                            <span className="reserved-cost">
                              {cardCostEntries(reserved.cardId).map(([gem, amount]) => (
                                <GemToken color={gem} amount={amount} key={`${reserved.cardId}-${gem}`} />
                              ))}
                            </span>
                          </>
                        )}
                      </span>
                    ))
                  )}
                </div>
                <div className="meta-row">
                  <span>
                    <ShieldCheck size={15} />
                    已购 {player.purchasedCardIds.length}
                  </span>
                  <span>
                    <Crown size={15} />
                    贵族 {player.nobleIds.length}
                  </span>
                </div>
              </article>
            )
          })}
        </aside>

        <section className="table-surface" aria-label="公共牌桌">
          <div className="table-header">
            <div className="noble-track" aria-label="贵族">
              {view.nobles.map((nobleId) => (
                <NobleFace key={nobleId} noble={getNoble(nobleId)} />
              ))}
            </div>
            {renderBankTokens('bank desktop-bank')}
          </div>

          <div className="market" aria-label="发展卡市场">
            {([3, 2, 1] as const).map((level) => (
              <div className="market-row" key={level}>
                <div className="tier-label">L{level}</div>
                {view.market[level].map((cardId, slot) => {
                  const card = cardId ? getDevelopmentCard(cardId) : null
                  const isSelected = selectedCard?.level === level && selectedCard.slot === slot
                  const key = `${level}-${slot}-${cardId ?? 'empty'}`
                  if (!card) {
                    return <EmptyCardFace key={key} />
                  }
                  return (
                    <CardFace
                      key={key}
                      card={card}
                      affordability={getCardAffordability(viewerPlayer, card.id)}
                      selected={isSelected}
                      onSelect={() => {
                        setSelectedCard({ level, slot })
                        setSelectedReservedCardId(null)
                        setPaymentPlan(createSuggestedPaymentPlan(viewerPlayer, card.id))
                      }}
                    />
                  )
                })}
              </div>
            ))}
          </div>
        </section>

        <aside className="action-panel" aria-label="当前玩家操作">
          {renderBankTokens('bank mobile-bank', 'mobile-bank-token')}
          {isViewerTurn ? (
            <div className="turn-alert" role="status" data-testid="turn-alert">
              轮到你了
            </div>
          ) : (
            <div className="turn-alert waiting" role="status" data-testid="turn-alert">
              等待 {currentPlayer.nickname} 行动
            </div>
          )}
          <div className="panel-title">
            <div>
              <h2>行动</h2>
              <p data-testid="current-player">{currentPlayer.nickname} 的回合</p>
            </div>
            <Users size={20} />
          </div>

          <div
            aria-busy={feedback.tone === 'pending'}
            aria-live="polite"
            className={`status-banner ${feedback.tone}`}
            data-status-tone={feedback.tone}
            data-testid="status-message"
            role="status"
          >
            {feedback.text}
          </div>

          {gameResults ? (
            <section className="result-panel" data-testid="result-panel">
              <div className="result-header">
                <span>游戏结束</span>
                <strong>{gameResults.winnerNames.join('、')} 获胜</strong>
              </div>
              <div className="result-list">
                {gameResults.rows.map((row) => (
                  <div className={row.isWinner ? 'result-row winner' : 'result-row'} key={row.playerId}>
                    <span>{row.nickname}</span>
                    <strong>{row.score} 分</strong>
                    <em>{row.cardCount} 卡 · {row.nobleCount} 贵族 · {row.turnCount} 回合</em>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
          <div className="selection-box">
            <span>已选宝石</span>
            <strong>
              {hasSelectedTokens
                ? GEM_COLORS.filter((color) => selectedTokens[color]).map((color) => `${colorName(color)} ${selectedTokens[color]}`).join(' · ')
                : '点击宝石选择本回合拿取'}
            </strong>
          </div>

          <div className={viewerVisibleReservedCards.length > 0 ? 'reserved-action-box has-reserved' : 'reserved-action-box'}>
            <span>我的预留</span>
            <div className="reserved-action-list">
              {viewerVisibleReservedCards.length === 0 ? (
                <strong>暂无可购买预留卡</strong>
              ) : (
                viewerVisibleReservedCards.map((reserved) => (
                  <CardFace
                    key={reserved.cardId}
                    card={getDevelopmentCard(reserved.cardId)}
                    size="compact"
                    selected={selectedReservedCardId === reserved.cardId}
                    disabled={!canAct}
                    onSelect={() => {
                      setSelectedCard(null)
                      setSelectedReservedCardId(reserved.cardId)
                      setPaymentPlan(createSuggestedPaymentPlan(viewerPlayer, reserved.cardId))
                    }}
                  />
                ))
              )}
            </div>
          </div>

          {selectedPaymentCardId ? (
            <div className="payment-box" data-testid="payment-plan">
              <div className="payment-header">
                <span>{selectedReservedCardId ? '预留卡支付' : '市场卡支付'}</span>
                <button
                  className="tiny-button"
                  type="button"
                  disabled={!canAct}
                  onClick={() => setPaymentPlan(createSuggestedPaymentPlan(viewerPlayer, selectedPaymentCardId))}
                >
                  自动
                </button>
              </div>
              <p className={isPaymentExact(viewerPlayer, selectedPaymentCardId, paymentPlan) ? 'payment-status valid' : 'payment-status'}>
                {paymentSummary(viewerPlayer, selectedPaymentCardId, paymentPlan)}
              </p>
              <details className="advanced-payment">
                <summary>高级支付</summary>
              {GEM_COLORS.map((color) => {
                const due = discountedCost(viewerPlayer, selectedPaymentCardId, color)
                const normal = paymentPlan.tokens[color] ?? 0
                const gold = paymentPlan.goldAs[color] ?? 0
                return (
                  <div className="payment-row" key={color}>
                    <span className={`mini-gem ${color}`} />
                    <strong>{colorName(color)}</strong>
                    <span>需 {due}</span>
                    <div className="payment-stepper" aria-label={`${colorName(color)}普通宝石支付`}>
                      <button
                        type="button"
                        disabled={!canAct || normal === 0}
                        onClick={() => updatePayment('tokens', color, -1)}
                      >
                        -
                      </button>
                      <span>宝 {normal}</span>
                      <button
                        type="button"
                        disabled={!canAct || !canIncreasePayment('tokens', color)}
                        onClick={() => updatePayment('tokens', color, 1)}
                      >
                        +
                      </button>
                    </div>
                    <div className="payment-stepper" aria-label={`${colorName(color)}金币支付`}>
                      <button
                        type="button"
                        disabled={!canAct || gold === 0}
                        onClick={() => updatePayment('goldAs', color, -1)}
                      >
                        -
                      </button>
                      <span>金 {gold}</span>
                      <button
                        type="button"
                        disabled={!canAct || !canIncreasePayment('goldAs', color)}
                        onClick={() => updatePayment('goldAs', color, 1)}
                      >
                        +
                      </button>
                    </div>
                  </div>
                )
              })}
              </details>
            </div>
          ) : null}

          <div className="action-stack primary-actions">
            <button
              className="secondary-button selected"
              type="button"
              disabled={!canAct || !hasSelectedTokens}
              onClick={() =>
                run(
                  { type: 'takeTokens', tokens: selectedTokens },
                  `${viewerPlayer.nickname} 拿取宝石。`,
                )
              }
            >
              {isActionPending ? '确认中...' : '拿所选宝石'}
            </button>
            <button
              className="secondary-button"
              type="button"
              hidden={!selectedCardId || !canBuySelectedMarketCard}
              disabled={!canAct || !selectedCardId || !canBuySelectedMarketCard}
              onClick={buySelectedCard}
            >
              购买市场卡
            </button>
            <button
              className="secondary-button"
              type="button"
              hidden={!selectedReservedCardId}
              disabled={!canAct || !selectedReservedCardId || !canBuySelectedReservedCard}
              onClick={buySelectedReservedCard}
            >
              购买预留卡
            </button>
            <button
              className="secondary-button"
              type="button"
              hidden={!selectedCardId}
              disabled={!canAct}
              onClick={reserveSelectedCard}
            >
              预留市场卡
            </button>
            <button
              className="secondary-button"
              type="button"
              disabled={!canAct}
              onClick={() => run({ type: 'passTurn', reason: 'no_legal_action' }, '跳过当前回合。')}
            >
              <Play size={16} />
              {isActionPending ? '确认中' : '跳过'}
            </button>
          </div>

          <details className="secondary-actions">
            <summary>更多行动</summary>
            <div className="action-stack">
            <div className="deck-actions">
              {([1, 2, 3] as const).map((level) => (
                <button
                  className="small-button"
                  disabled={!canAct || view.deckCounts[level] === 0}
                  key={level}
                  type="button"
                  onClick={() =>
                    run(
                      { type: 'reserveDeckCard', level },
                      `${viewerPlayer.nickname} 盲抽预留 L${level}。`,
                    )
                  }
                >
                  盲抽 L{level} ({view.deckCounts[level]})
                </button>
              ))}
            </div>
            </div>
          </details>
            {view.phase === 'awaiting_token_discard' ? (
              <div className="choice-box danger" data-testid="discard-panel">
                <div className="choice-header">
                  <span>弃宝石</span>
                  <strong>{countSelectedTokens(discardPlan)} / {discardNeeded}</strong>
                </div>
                {TOKEN_COLORS.map((color) => (
                  <div className="choice-row" key={color}>
                    <span className={`mini-gem ${color}`} />
                    <strong>{color === 'gold' ? '金' : colorName(color)}</strong>
                    <span>持有 {currentPlayer.tokens[color]}</span>
                    <div className="payment-stepper">
                      <button
                        type="button"
                        disabled={!canAct || (discardPlan[color] ?? 0) === 0}
                        onClick={() => updateDiscard(color, -1)}
                      >
                        -
                      </button>
                      <span>{discardPlan[color] ?? 0}</span>
                      <button
                        type="button"
                        disabled={
                          !canAct ||
                          (discardPlan[color] ?? 0) >= currentPlayer.tokens[color] ||
                          countSelectedTokens(discardPlan) >= discardNeeded
                        }
                        onClick={() => updateDiscard(color, 1)}
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}
                <button
                  className="secondary-button danger"
                  type="button"
                  disabled={!canAct || countSelectedTokens(discardPlan) !== discardNeeded}
                  onClick={submitDiscardPlan}
                >
                  确认弃宝石
                </button>
                <button
                  className="secondary-button"
                  type="button"
                  disabled={!canAct}
                  onClick={discardAutomatically}
                >
                  自动弃到 10
                </button>
              </div>
            ) : null}
            {view.phase === 'awaiting_noble_choice' ? (
              <div className="choice-box" data-testid="noble-choice-panel">
                <div className="choice-header">
                  <span>选择贵族</span>
                  <strong>{eligibleNobleIds.length} 位可选</strong>
                </div>
                {eligibleNobleIds.map((nobleId) => {
                  const noble = getNoble(nobleId)
                  return (
                    <NobleFace
                      key={noble.id}
                      noble={noble}
                      interactive
                      disabled={!canAct}
                      onSelect={() => chooseNoble(noble.id)}
                    />
                  )
                })}
              </div>
            ) : null}

          <ol className="event-log" aria-label="最近行动" data-testid="action-log">
            {view.log
              .slice(-6)
              .reverse()
              .map((entry) => (
                <li key={entry.id}>{entry.message}</li>
              ))}
          </ol>
        </aside>
      </section>
      )}
    </main>
  )
}

export default App
