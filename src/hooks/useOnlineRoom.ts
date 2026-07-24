import { useEffect, useRef, useState } from 'react'
import type { ClientGameView } from '../../shared/game/types'
import type { ClientEvent } from '../../shared/protocol/client-events'
import type { ServerEvent } from '../../shared/protocol/server-events'
import type { FeedbackTone } from '../components/StatusBanner'
import { serverActivityMessage, type ConnectionStatus } from '../lib/format'
import { generateRoomCode, sanitizeRoomCode } from '../lib/roomCode'
import { loadRoomSession } from '../lib/roomSession'
import {
  handleRoomServerEvent,
  type OnlineLobby,
  type PendingAction,
} from './handleRoomServerEvent'

export type { OnlineLobby, PendingAction }

const HEARTBEAT_INTERVAL_MS = 25_000
const RECONNECT_DELAYS_MS = [1_000, 2_000, 5_000, 10_000]
const initialRoomSession = loadRoomSession()

type RoomScreen = 'loading' | 'game'

type UseOnlineRoomArgs = {
  onClearActionSelection: () => void
  onShowFeedback: (text: string, tone?: FeedbackTone) => void
  onScreenChange: (screen: RoomScreen) => void
}

export function useOnlineRoom({ onClearActionSelection, onShowFeedback, onScreenChange }: UseOnlineRoomArgs) {
  const [onlineView, setOnlineView] = useState<ClientGameView | null>(null)
  const [onlineLobby, setOnlineLobby] = useState<OnlineLobby | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('local')
  const [roomCode, setRoomCode] = useState(initialRoomSession?.roomCode ?? 'GM-7428')
  const [nickname, setNickname] = useState(initialRoomSession?.nickname ?? '你')
  const [playerId, setPlayerId] = useState<string | null>(initialRoomSession?.playerId ?? null)
  const [resumeToken, setResumeToken] = useState<string | null>(initialRoomSession?.resumeToken ?? null)
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

  latestRoomRef.current = { roomCode, nickname, resumeToken }

  useEffect(() => {
    return () => {
      shouldReconnectRef.current = false
      stopHeartbeat()
      clearReconnectTimer()
      wsRef.current?.close()
    }
  }, [])

  function clearPendingActions() {
    pendingActionsRef.current.clear()
    setPendingActionCount(0)
  }

  function clearServerActivity() {
    setServerActivityText(null)
  }

  function registerPendingAction(actionId: string, pendingAction: PendingAction, activityText?: string) {
    pendingActionsRef.current.set(actionId, pendingAction)
    setPendingActionCount(pendingActionsRef.current.size)
    if (activityText) {
      setServerActivityText(activityText)
    }
  }

  function setRoomCodeInput(value: string) {
    setRoomCode(value)
    setPlayerId(null)
    setResumeToken(null)
  }

  function connectRoom(targetRoomCode = roomCode) {
    const cleanRoomCode = sanitizeRoomCode(targetRoomCode)
    if (cleanRoomCode !== sanitizeRoomCode(roomCode)) {
      setPlayerId(null)
      setResumeToken(null)
    }
    shouldReconnectRef.current = true
    setRoomCode(cleanRoomCode)
    onScreenChange('game')
    openRoomConnection('manual', cleanRoomCode)
  }

  function createOnlineRoom() {
    connectRoom(generateRoomCode())
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
      onScreenChange('loading')
      setOnlineView(null)
      setOnlineLobby(null)
      onClearActionSelection()
      reconnectAttemptRef.current = 0
    }
    clearPendingActions()
    onShowFeedback(mode === 'manual' ? `正在连接房间 ${cleanRoomCode}。` : `正在重新连接房间 ${cleanRoomCode}。`, 'pending')
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
      onShowFeedback(mode === 'manual' ? `已连接房间 ${cleanRoomCode}，正在加入。` : `已恢复连接，正在同步房间 ${cleanRoomCode}。`, 'pending')
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
    onClearActionSelection()
    clearPendingActions()
    clearServerActivity()
    setPlayerId(null)
    setConnectionStatus('local')
    onShowFeedback('已回到本地 mock 对局。', 'info')
  }

  function resetToLocal() {
    shouldReconnectRef.current = false
    stopHeartbeat()
    clearReconnectTimer()
    wsRef.current?.close()
    wsRef.current = null
    setOnlineView(null)
    setOnlineLobby(null)
    setConnectionStatus('local')
    clearPendingActions()
    clearServerActivity()
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
      onShowFeedback('房间连接已关闭，请重新加入房间。', 'error')
      return
    }

    const delay = RECONNECT_DELAYS_MS[Math.min(reconnectAttemptRef.current, RECONNECT_DELAYS_MS.length - 1)]
    reconnectAttemptRef.current += 1
    onShowFeedback(`房间连接中断，${Math.round(delay / 1000)} 秒后自动重连 ${cleanRoomCode}。`, 'pending')
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

  function sendRoomEvent(payload: ClientEvent, expectedVersion: number): string | null {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      onShowFeedback('房间尚未连接，请先加入房间。', 'error')
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
    handleRoomServerEvent(event, {
      nickname,
      pendingActionsRef,
      setPlayerId,
      setResumeToken,
      setServerActivityText,
      setOnlineLobby,
      setOnlineView,
      setPendingActionCount,
      clearServerActivity,
      onClearActionSelection,
      onShowFeedback,
      onScreenChange,
    })
  }

  return {
    onlineView,
    onlineLobby,
    connectionStatus,
    roomCode,
    nickname,
    playerId,
    resumeToken,
    pendingActionCount,
    serverActivityText,
    roomMenuOpen,
    setNickname,
    setRoomCodeInput,
    setRoomMenuOpen,
    connectRoom,
    createOnlineRoom,
    disconnectRoom,
    resetToLocal,
    sendRoomEvent,
    registerPendingAction,
    clearPendingActions,
    clearServerActivity,
  }
}
