import { sanitizeRoomCode } from './roomCode'

export const ROOM_SESSION_KEY = 'gem-merchant-room-session'

export type SavedRoomSession = {
  roomCode: string
  nickname: string
  playerId: string
  resumeToken: string
}

export function loadRoomSession(): SavedRoomSession | null {
  try {
    const raw = window.localStorage.getItem(ROOM_SESSION_KEY)
    if (!raw) {
      return null
    }

    const parsed = JSON.parse(raw) as Partial<SavedRoomSession>
    if (!parsed.roomCode || !parsed.playerId || !parsed.resumeToken) {
      return null
    }

    return {
      roomCode: sanitizeRoomCode(parsed.roomCode),
      nickname: parsed.nickname?.slice(0, 24) || '你',
      playerId: parsed.playerId,
      resumeToken: parsed.resumeToken,
    }
  } catch {
    return null
  }
}

export function saveRoomSession(session: SavedRoomSession): void {
  window.localStorage.setItem(ROOM_SESSION_KEY, JSON.stringify(session))
}
