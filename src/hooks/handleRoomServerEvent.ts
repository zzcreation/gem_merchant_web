import type { Dispatch, MutableRefObject, SetStateAction } from 'react'
import type { ClientGameView } from '../../shared/game/types'
import type { RoomLobbyPlayer, ServerEvent } from '../../shared/protocol/server-events'
import type { FeedbackTone } from '../components/StatusBanner'
import { saveRoomSession } from '../lib/roomSession'

type RoomScreen = 'loading' | 'game'

export type OnlineLobby = {
  roomCode: string
  players: RoomLobbyPlayer[]
}

export type PendingAction = {
  successMessage: string
  clearSelection: boolean
}

export type RoomServerEventContext = {
  nickname: string
  pendingActionsRef: MutableRefObject<Map<string, PendingAction>>
  setPlayerId: Dispatch<SetStateAction<string | null>>
  setResumeToken: Dispatch<SetStateAction<string | null>>
  setServerActivityText: Dispatch<SetStateAction<string | null>>
  setOnlineLobby: Dispatch<SetStateAction<OnlineLobby | null>>
  setOnlineView: Dispatch<SetStateAction<ClientGameView | null>>
  setPendingActionCount: Dispatch<SetStateAction<number>>
  clearServerActivity: () => void
  onClearActionSelection: () => void
  onShowFeedback: (message: string, tone?: FeedbackTone) => void
  onScreenChange: (screen: RoomScreen) => void
}

export function handleRoomServerEvent(
  event: ServerEvent,
  ctx: RoomServerEventContext,
): void {
  switch (event.type) {
    case 'room.joined':
      ctx.setPlayerId(event.playerId)
      ctx.setResumeToken(event.resumeToken)
      saveRoomSession({
        roomCode: event.roomCode,
        nickname: ctx.nickname,
        playerId: event.playerId,
        resumeToken: event.resumeToken,
      })
      ctx.setServerActivityText(`正在获取房间 ${event.roomCode} 状态...`)
      ctx.onShowFeedback(`已加入房间 ${event.roomCode}。`, 'success')
      break
    case 'room.lobby':
      ctx.onScreenChange('game')
      ctx.clearServerActivity()
      ctx.setOnlineLobby({ roomCode: event.roomCode, players: event.players })
      ctx.onShowFeedback(`房间 ${event.roomCode} · ${event.players.length} 人。`, 'info')
      break
    case 'state.snapshot':
    case 'state.patch':
      ctx.onScreenChange('game')
      ctx.clearServerActivity()
      ctx.setOnlineView(event.view)
      ctx.setOnlineLobby(null)
      break
    case 'game.actionAccepted':
      {
        const pendingAction = ctx.pendingActionsRef.current.get(event.actionId)
        if (pendingAction) {
          ctx.pendingActionsRef.current.delete(event.actionId)
          ctx.setPendingActionCount(ctx.pendingActionsRef.current.size)
          if (pendingAction.clearSelection) {
            ctx.onClearActionSelection()
          }
          if (ctx.pendingActionsRef.current.size === 0) {
            ctx.clearServerActivity()
          }
          ctx.onShowFeedback(pendingAction.successMessage, 'success')
        } else {
          ctx.clearServerActivity()
          ctx.onShowFeedback(`行动已同步到版本 ${event.version}。`, 'success')
        }
      }
      break
    case 'game.error':
      if (event.actionId) {
        ctx.pendingActionsRef.current.delete(event.actionId)
        ctx.setPendingActionCount(ctx.pendingActionsRef.current.size)
      }
      ctx.clearServerActivity()
      ctx.onShowFeedback(event.message, 'error')
      break
    case 'room.playerJoined':
      ctx.onShowFeedback(`${event.nickname} 加入房间。`, 'info')
      break
    case 'room.timer':
      break
    case 'room.pong':
      break
  }
}
