import { Copy, Gem, RotateCcw } from 'lucide-react'
import type { ConnectionStatus } from '../lib/format'
import { connectionText } from '../lib/format'
import { sanitizeRoomCode } from '../lib/roomCode'
import './RoomBar.css'

type RoomBarProps = {
  displayRoomId: string
  modeLabel: string
  displayPhase: string
  connectionStatus: ConnectionStatus
  roomCode: string
  nickname: string
  roomMenuOpen: boolean
  isConnecting: boolean
  onRoomMenuToggle: (open: boolean) => void
  onRoomCodeChange: (value: string) => void
  onNicknameChange: (value: string) => void
  onJoin: () => void
  onGoLocal: () => void
  onCopyRoomCode: () => void
  onResetLocal: () => void
}

export function RoomBar({
  displayRoomId,
  modeLabel,
  displayPhase,
  connectionStatus,
  roomCode,
  nickname,
  roomMenuOpen,
  isConnecting,
  onRoomMenuToggle,
  onRoomCodeChange,
  onNicknameChange,
  onJoin,
  onGoLocal,
  onCopyRoomCode,
  onResetLocal,
}: RoomBarProps) {
  return (
    <header className="topbar">
      <div className="brand">
        <span className="brand-mark">
          <Gem size={21} />
        </span>
        <div>
          <h1>Gem Merchant</h1>
          <p data-testid="room-status">
            房间 {displayRoomId} · {modeLabel} ·{' '}
            {displayPhase} · {connectionText(connectionStatus)}
          </p>
        </div>
      </div>
      <details
        className="room-menu"
        open={roomMenuOpen}
        onToggle={(event) => onRoomMenuToggle(event.currentTarget.open)}
      >
        <summary>房间</summary>
        <div className="room-menu-panel">
          <div className="room-controls" aria-label="房间连接">
            <input
              aria-label="房间码"
              maxLength={32}
              value={roomCode}
              onChange={(event) => onRoomCodeChange(event.target.value)}
            />
            <input
              aria-label="昵称"
              maxLength={24}
              value={nickname}
              onChange={(event) => onNicknameChange(event.target.value)}
            />
            <button
              className="small-button"
              type="button"
              disabled={isConnecting}
              onClick={() => {
                onJoin()
                onRoomMenuToggle(false)
              }}
            >
              {isConnecting ? '连接中' : '加入'}
            </button>
            <button
              className="small-button"
              type="button"
              disabled={isConnecting}
              onClick={() => {
                onGoLocal()
                onRoomMenuToggle(false)
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
                onRoomMenuToggle(false)
                onCopyRoomCode()
              }}
            >
              <Copy size={18} />
            </button>
            <button
              className="icon-button"
              type="button"
              aria-label="重开本地对局"
              onClick={() => {
                onResetLocal()
                onRoomMenuToggle(false)
              }}
            >
              <RotateCcw size={18} />
            </button>
          </div>
        </div>
      </details>
    </header>
  )
}
