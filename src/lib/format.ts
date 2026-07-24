import type { GameState, GemColor } from '../../shared/game/types'
import type { ClientEvent } from '../../shared/protocol/client-events'

export type ConnectionStatus = 'local' | 'connecting' | 'connected' | 'closed'

export function colorName(color: GemColor): string {
  return {
    white: '白',
    blue: '蓝',
    green: '绿',
    red: '红',
    black: '黑',
  }[color]
}

export function phaseText(phase: GameState['phase']): string {
  return {
    lobby: '大厅',
    playing: '进行中',
    awaiting_token_discard: '等待弃宝石',
    awaiting_noble_choice: '选择贵族',
    final_round: '最终轮',
    finished: '已结束',
    abandoned: '已废弃',
  }[phase]
}

export function connectionText(status: ConnectionStatus): string {
  return {
    local: '本地',
    connecting: '连接中',
    connected: '在线',
    closed: '已断开',
  }[status]
}

export function serverActivityMessage(payload: ClientEvent): string {
  switch (payload.type) {
    case 'room.join':
      return `正在加入房间 ${payload.roomCode}...`
    case 'room.ready':
      return payload.ready ? '正在提交准备状态...' : '正在取消准备...'
    case 'room.start':
      return '正在开始房间...'
    case 'game.action':
      return '正在提交行动...'
    case 'room.ping':
      return '正在保持房间连接...'
  }
}
