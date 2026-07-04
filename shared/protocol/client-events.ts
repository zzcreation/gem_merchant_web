export type ClientEvent =
  | { type: 'room.join'; roomCode: string; nickname: string; resumeToken?: string }
  | { type: 'room.ready'; ready: boolean }
  | { type: 'room.start' }
  | { type: 'game.takeTokens'; tokens: string[] }
  | { type: 'game.buyCard'; cardId: string }
  | { type: 'game.reserveCard'; cardId: string }
