import {
  GameRoomController,
  type RoomConnectionAttachment,
  type RoomControllerSnapshot,
  type RoomStatsSnapshot,
} from './room'
import type { ClientActionEnvelope } from '../shared/protocol/client-events'
import type { ServerEvent } from '../shared/protocol/server-events'

interface Env {
  ROOMS: DurableObjectNamespace
  ROOM_REGISTRY: DurableObjectNamespace
}

interface DurableObjectNamespace {
  idFromName(name: string): DurableObjectId
  get(id: DurableObjectId): DurableObjectStub
}

interface DurableObjectId {
  toString(): string
}

interface DurableObjectStub {
  fetch(request: Request): Promise<Response>
}

interface DurableObjectState {
  id: DurableObjectId
  storage: DurableObjectStorage
  acceptWebSocket(webSocket: WebSocket): void
  getWebSockets(): WebSocket[]
  blockConcurrencyWhile(callback: () => Promise<void>): void
}

interface DurableObjectStorage {
  get<T>(key: string): Promise<T | undefined>
  put<T>(key: string, value: T): Promise<void>
}

type WebSocketResponseInit = ResponseInit & { webSocket: WebSocket }
type CloudflareWebSocket = WebSocket & {
  serializeAttachment(value: WebSocketAttachment): void
  deserializeAttachment(): WebSocketAttachment | undefined
}

interface WebSocketAttachment extends RoomConnectionAttachment {
  connectionId: string
}

declare class WebSocketPair {
  readonly 0: WebSocket
  readonly 1: WebSocket
}

const ROOM_STATE_KEY = 'room-state'
const REGISTRY_STATE_KEY = 'room-registry'
const ACTIVE_ROOM_TTL_MS = 120_000

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    const roomMatch = url.pathname.match(/^\/api\/rooms\/([A-Za-z0-9_-]{3,32})\/websocket$/)

    if (url.pathname === '/admin/stats') {
      const id = env.ROOM_REGISTRY.idFromName('global')
      return env.ROOM_REGISTRY.get(id).fetch(new Request(new URL('/stats', request.url), request))
    }

    if (roomMatch) {
      const roomCode = roomMatch[1]
      const id = env.ROOMS.idFromName(roomCode)
      return env.ROOMS.get(id).fetch(request)
    }

    return Response.json({
      name: 'gem-merchant-worker',
      status: 'room-worker-ready',
      websocket: '/api/rooms/:roomCode/websocket',
    })
  },
}

export class GameRoom {
  private readonly state: DurableObjectState
  private readonly env: Env
  private controller: GameRoomController | null = null
  private initialized: Promise<void>
  private storageWrite: Promise<void> = Promise.resolve()

  constructor(state: DurableObjectState, env: Env) {
    this.state = state
    this.env = env
    this.initialized = this.initialize()
    state.blockConcurrencyWhile(() => this.initialized)
  }

  async fetch(request: Request): Promise<Response> {
    if (request.headers.get('Upgrade') !== 'websocket') {
      return Response.json({ error: 'Expected WebSocket upgrade.' }, { status: 426 })
    }

    const roomCode = getRoomCode(request)
    if (!roomCode) {
      return Response.json({ error: 'Invalid room code.' }, { status: 400 })
    }
    const controller = await this.getController(roomCode)
    const pair = new WebSocketPair()
    const client = pair[0]
    const server = pair[1] as CloudflareWebSocket
    const connectionId = crypto.randomUUID()

    this.state.acceptWebSocket(server)
    server.serializeAttachment({ connectionId, roomCode, playerId: null })
    controller.connect({
      id: connectionId,
      send: (event: ServerEvent) => server.send(JSON.stringify(event)),
      close: (code?: number, reason?: string) => server.close(code, reason),
      attach: (attachment: RoomConnectionAttachment) => {
        server.serializeAttachment({ ...attachment, connectionId })
      },
    })

    return new Response(null, { status: 101, webSocket: client } as WebSocketResponseInit)
  }

  async webSocketMessage(webSocket: WebSocket, data: string | ArrayBuffer): Promise<void> {
    const attachment = (webSocket as CloudflareWebSocket).deserializeAttachment()
    if (!attachment) {
      webSocket.close(1011, 'Missing WebSocket attachment.')
      return
    }
    await this.getController(attachment.roomCode)
    this.handleMessage(webSocket, attachment.connectionId, data)
  }

  async webSocketClose(
    webSocket: WebSocket,
    _code: number,
    _reason: string,
    _wasClean: boolean,
  ): Promise<void> {
    await this.disconnectWebSocket(webSocket)
  }

  async webSocketError(webSocket: WebSocket): Promise<void> {
    await this.disconnectWebSocket(webSocket)
  }

  private handleMessage(webSocket: WebSocket, connectionId: string, data: string | ArrayBuffer): void {
    if (typeof data !== 'string') {
      webSocket.close(1003, 'Only text messages are supported.')
      return
    }

    try {
      this.controller?.receive(connectionId, JSON.parse(data) as ClientActionEnvelope)
    } catch {
      this.controller?.disconnect(connectionId)
      webSocket.close(1007, 'Invalid message.')
    }
  }

  private async disconnectWebSocket(webSocket: WebSocket): Promise<void> {
    const attachment = (webSocket as CloudflareWebSocket).deserializeAttachment()
    if (!attachment) {
      return
    }
    await this.getController(attachment.roomCode)
    this.controller?.disconnect(attachment.connectionId)
  }

  private async getController(roomCode: string): Promise<GameRoomController> {
    await this.initialized
    this.controller ??= this.createController(roomCode)
    return this.controller
  }

  private async initialize(): Promise<void> {
    const snapshot = await this.state.storage.get<RoomControllerSnapshot>(ROOM_STATE_KEY)
    const sockets = this.state.getWebSockets() as CloudflareWebSocket[]
    const roomCode = snapshot?.roomCode ?? sockets[0]?.deserializeAttachment()?.roomCode

    if (!roomCode) {
      return
    }

    this.controller = snapshot
      ? GameRoomController.hydrate(
          snapshot,
          undefined,
          undefined,
          (nextSnapshot) => this.persist(nextSnapshot),
          (stats) => this.reportStats(stats),
        )
      : this.createController(roomCode)

    for (const socket of sockets) {
      const attachment = socket.deserializeAttachment()
      if (!attachment) {
        continue
      }
      this.controller.connect({
        id: attachment.connectionId,
        send: (event: ServerEvent) => socket.send(JSON.stringify(event)),
        close: (code?: number, reason?: string) => socket.close(code, reason),
        attach: (nextAttachment: RoomConnectionAttachment) => {
          socket.serializeAttachment({ ...nextAttachment, connectionId: attachment.connectionId })
        },
      }, attachment.playerId)
    }

    this.persist(this.controller.exportSnapshot())
  }

  private createController(roomCode: string): GameRoomController {
    return new GameRoomController(
      roomCode,
      undefined,
      undefined,
      (snapshot) => this.persist(snapshot),
      (stats) => this.reportStats(stats),
    )
  }

  private persist(snapshot: RoomControllerSnapshot): void {
    this.storageWrite = this.storageWrite
      .catch(() => undefined)
      .then(() => this.state.storage.put(ROOM_STATE_KEY, snapshot))
      .catch(() => undefined)
  }

  private reportStats(stats: RoomStatsSnapshot): void {
    const id = this.env.ROOM_REGISTRY.idFromName('global')
    const request = new Request(`https://room-registry.internal/rooms/${stats.roomCode}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(stats),
    })
    void this.env.ROOM_REGISTRY.get(id).fetch(request).catch(() => undefined)
  }
}

export class RoomRegistry {
  private readonly state: DurableObjectState

  constructor(state: DurableObjectState) {
    this.state = state
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)
    const roomMatch = url.pathname.match(/^\/rooms\/([A-Za-z0-9_-]{3,32})$/)

    if (request.method === 'PUT' && roomMatch) {
      const stats = await request.json() as RoomStatsSnapshot
      const rooms = await this.readRooms()
      rooms[roomMatch[1]] = stats
      await this.state.storage.put(REGISTRY_STATE_KEY, rooms)
      return Response.json({ ok: true })
    }

    if (request.method === 'GET' && url.pathname === '/stats') {
      const rooms = Object.values(await this.readRooms())
      const now = Date.now()
      const activeRooms = rooms
        .filter((room) => room.connectedPlayerCount > 0 && now - room.lastActivityAt <= ACTIVE_ROOM_TTL_MS)
        .sort((a, b) => b.lastActivityAt - a.lastActivityAt)

      return Response.json({
        generatedAt: now,
        activeRoomCount: activeRooms.length,
        onlinePlayerCount: activeRooms.reduce((sum, room) => sum + room.connectedPlayerCount, 0),
        activeConnectionCount: activeRooms.reduce((sum, room) => sum + room.activeConnectionCount, 0),
        rooms: activeRooms,
      })
    }

    return Response.json({ error: 'Not found.' }, { status: 404 })
  }

  private async readRooms(): Promise<Record<string, RoomStatsSnapshot>> {
    return (await this.state.storage.get<Record<string, RoomStatsSnapshot>>(REGISTRY_STATE_KEY)) ?? {}
  }
}

function getRoomCode(request: Request): string | null {
  const match = new URL(request.url).pathname.match(/^\/api\/rooms\/([A-Za-z0-9_-]{3,32})\/websocket$/)
  return match?.[1] ?? null
}
