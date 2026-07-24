import { Users } from 'lucide-react'
import type { RoomLobbyPlayer } from '../../shared/protocol/server-events'
import { StatusBanner, type FeedbackState } from '../components/StatusBanner'
import { sanitizeRoomCode } from '../lib/roomCode'
import '../styles/layout.css'

type LobbyScreenProps = {
  roomCode: string
  displayRoomCode: string | undefined
  players: RoomLobbyPlayer[]
  feedback: FeedbackState
  isViewerReady: boolean
  disabled: boolean
  onToggleReady: () => void
  onStartRoom: () => void
}

export function LobbyScreen({
  roomCode,
  displayRoomCode,
  players,
  feedback,
  isViewerReady,
  disabled,
  onToggleReady,
  onStartRoom,
}: LobbyScreenProps) {
  return (
    <section className="lobby-layout" aria-label="在线房间大厅">
      <div className="lobby-panel">
        <div className="panel-title">
          <div>
            <h2>在线大厅</h2>
            <p>房间 {displayRoomCode ?? sanitizeRoomCode(roomCode)}</p>
          </div>
          <Users size={22} />
        </div>
        <StatusBanner feedback={feedback} />
        <div className="lobby-roster" data-testid="lobby-roster">
          {players.map((player) => (
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
            disabled={disabled}
            onClick={onToggleReady}
          >
            {isViewerReady ? '取消准备' : '准备'}
          </button>
          <button
            className="secondary-button selected"
            type="button"
            disabled={disabled}
            onClick={onStartRoom}
          >
            开始房间
          </button>
        </div>
      </div>
    </section>
  )
}
