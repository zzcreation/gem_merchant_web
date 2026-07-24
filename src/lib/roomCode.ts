export function sanitizeRoomCode(roomCode: string): string {
  const normalized = roomCode.trim().replace(/[^A-Za-z0-9_-]/g, '').slice(0, 32).toUpperCase()
  return normalized.length >= 3 ? normalized : 'GM-7428'
}

export function generateRoomCode(): string {
  const suffix = Math.random().toString(36).slice(2, 8).toUpperCase()
  return `GM-${suffix}`
}
