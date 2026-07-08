import { applyGameAction } from '../shared/game/actions'
import { createInitialGameState } from '../shared/game/setup'
import { createClientGameView } from '../shared/game/view'
import type { GameState, PlayerSetup } from '../shared/game/types'
import type { ClientActionEnvelope, ClientEvent } from '../shared/protocol/client-events'
import type { ServerEvent } from '../shared/protocol/server-events'

const MAX_PLAYERS = 5

export interface RoomConnection {
  id: string
  send(event: ServerEvent): void
  close?(code?: number, reason?: string): void
  attach?(attachment: RoomConnectionAttachment): void
}

interface RoomPlayer extends PlayerSetup {
  ready: boolean
  connected: boolean
}

export interface RoomConnectionAttachment {
  roomCode: string
  playerId: string | null
}

export interface RoomControllerSnapshot {
  roomCode: string
  players: RoomPlayer[]
  gameState: GameState | null
}

interface ActiveConnection {
  connection: RoomConnection
  playerId: string | null
}

export class GameRoomController {
  private readonly roomCode: string
  private readonly createId: () => string
  private readonly persist: (snapshot: RoomControllerSnapshot) => void
  private readonly connections = new Map<string, ActiveConnection>()
  private readonly players = new Map<string, RoomPlayer>()
  private gameState: GameState | null = null

  constructor(
    roomCode: string,
    createId: () => string = () => crypto.randomUUID(),
    persist: (snapshot: RoomControllerSnapshot) => void = () => {},
  ) {
    this.roomCode = roomCode
    this.createId = createId
    this.persist = persist
  }

  static hydrate(
    snapshot: RoomControllerSnapshot,
    createId: () => string = () => crypto.randomUUID(),
    persist: (snapshot: RoomControllerSnapshot) => void = () => {},
  ): GameRoomController {
    const controller = new GameRoomController(snapshot.roomCode, createId, persist)
    for (const player of snapshot.players) {
      controller.players.set(player.id, { ...player, connected: false })
    }
    controller.gameState = snapshot.gameState ? structuredClone(snapshot.gameState) : null
    if (controller.gameState) {
      for (const player of Object.values(controller.gameState.players)) {
        player.connected = false
      }
    }
    return controller
  }

  connect(connection: RoomConnection, playerId: string | null = null): void {
    this.connections.set(connection.id, { connection, playerId })
    if (playerId) {
      const player = this.players.get(playerId)
      if (player) {
        player.connected = true
      }
      if (this.gameState?.players[playerId]) {
        this.gameState.players[playerId].connected = true
      }
      connection.attach?.({ roomCode: this.roomCode, playerId })
    }
  }

  disconnect(connectionId: string): void {
    const activeConnection = this.connections.get(connectionId)
    if (!activeConnection) {
      return
    }

    this.connections.delete(connectionId)
    if (!activeConnection.playerId) {
      return
    }

    const player = this.players.get(activeConnection.playerId)
    if (player) {
      player.connected = this.hasConnectionForPlayer(player.id)
    }
    if (this.gameState?.players[activeConnection.playerId]) {
      this.gameState.players[activeConnection.playerId].connected = player?.connected ?? false
    }

    this.broadcastRoomUpdate()
    this.persistSnapshot()
  }

  receive(connectionId: string, envelope: ClientActionEnvelope): void {
    const activeConnection = this.connections.get(connectionId)
    if (!activeConnection) {
      return
    }

    try {
      this.handleEvent(activeConnection, envelope)
    } catch (error) {
      activeConnection.connection.send({
        type: 'game.error',
        actionId: envelope.actionId,
        code: 'room.action_failed',
        message: error instanceof Error ? error.message : 'Unknown room error.',
      })
    }
  }

  snapshotFor(playerId: string): ServerEvent | null {
    if (!this.gameState) {
      return null
    }

    return { type: 'state.snapshot', view: createClientGameView(this.gameState, playerId) }
  }

  private handleEvent(activeConnection: ActiveConnection, envelope: ClientActionEnvelope): void {
    const event = envelope.payload

    switch (event.type) {
      case 'room.join':
        this.join(activeConnection, event)
        break
      case 'room.ready':
        this.setReady(activeConnection, envelope.actionId, event.ready)
        break
      case 'room.start':
        this.startGame(activeConnection, envelope.actionId)
        break
      case 'game.action':
        this.applyPlayerAction(activeConnection, envelope.actionId, envelope.expectedVersion, event)
        break
      default:
        assertNever(event)
    }
  }

  private join(
    activeConnection: ActiveConnection,
    event: Extract<ClientEvent, { type: 'room.join' }>,
  ): void {
    if (event.roomCode !== this.roomCode) {
      throw new Error('Room code does not match this room.')
    }

    const existingPlayerId = event.resumeToken && this.players.has(event.resumeToken)
      ? event.resumeToken
      : null
    const playerId = existingPlayerId ?? this.createPlayerId()

    if (!existingPlayerId) {
      if (this.gameState && this.gameState.phase !== 'lobby') {
        throw new Error('Cannot join a game that has already started.')
      }
      if (this.players.size >= MAX_PLAYERS) {
        throw new Error('Room is full.')
      }

      this.players.set(playerId, {
        id: playerId,
        nickname: sanitizeNickname(event.nickname),
        ready: false,
        connected: true,
      })
    } else {
      const player = this.players.get(playerId)
      if (player) {
        player.nickname = sanitizeNickname(event.nickname)
        player.connected = true
      }
    }

    activeConnection.playerId = playerId
    activeConnection.connection.attach?.({ roomCode: this.roomCode, playerId })
    if (this.gameState?.players[playerId]) {
      this.gameState.players[playerId].nickname = sanitizeNickname(event.nickname)
      this.gameState.players[playerId].connected = true
    }

    activeConnection.connection.send({
      type: 'room.joined',
      roomCode: this.roomCode,
      playerId,
      resumeToken: playerId,
    })
    this.broadcastRoomUpdate()
    this.persistSnapshot()
  }

  private setReady(activeConnection: ActiveConnection, actionId: string, ready: boolean): void {
    const playerId = this.requirePlayer(activeConnection)
    const player = this.players.get(playerId)
    if (!player) {
      throw new Error('Player is not in this room.')
    }

    player.ready = ready
    if (this.gameState?.players[playerId]) {
      this.gameState.players[playerId].ready = ready
    }

    activeConnection.connection.send({
      type: 'game.actionAccepted',
      actionId,
      version: this.gameState?.version ?? 0,
    })
    this.broadcastRoomUpdate()
    this.persistSnapshot()
  }

  private startGame(activeConnection: ActiveConnection, actionId: string): void {
    const playerId = this.requirePlayer(activeConnection)
    const players = [...this.players.values()]

    if (players.length < 2) {
      throw new Error('At least two players are required to start.')
    }
    if (players.some((player) => !player.ready)) {
      throw new Error('All players must be ready before starting.')
    }
    if (this.gameState && this.gameState.phase !== 'lobby') {
      throw new Error('Game has already started.')
    }

    if (!this.gameState) {
      this.gameState = createInitialGameState({
        id: this.roomCode,
        seed: `${this.roomCode}:${players.map((player) => player.id).join('|')}`,
        players,
      })
      for (const player of players) {
        this.gameState.players[player.id].ready = player.ready
      }
    }

    this.gameState = applyGameAction(this.gameState, playerId, { type: 'startGame' })
    activeConnection.connection.send({
      type: 'game.actionAccepted',
      actionId,
      version: this.gameState.version,
    })
    this.broadcastSnapshots('state.snapshot')
    this.persistSnapshot()
  }

  private applyPlayerAction(
    activeConnection: ActiveConnection,
    actionId: string,
    expectedVersion: number,
    event: Extract<ClientEvent, { type: 'game.action' }>,
  ): void {
    const playerId = this.requirePlayer(activeConnection)
    if (!this.gameState) {
      throw new Error('Game has not started.')
    }
    if (expectedVersion !== this.gameState.version) {
      throw new Error('Client version is stale.')
    }

    this.gameState = applyGameAction(this.gameState, playerId, event.action)
    activeConnection.connection.send({
      type: 'game.actionAccepted',
      actionId,
      version: this.gameState.version,
    })
    this.broadcastSnapshots('state.patch')
    this.persistSnapshot()
  }

  exportSnapshot(): RoomControllerSnapshot {
    return {
      roomCode: this.roomCode,
      players: [...this.players.values()].map((player) => ({ ...player })),
      gameState: this.gameState ? structuredClone(this.gameState) : null,
    }
  }

  private broadcastRoomUpdate(): void {
    this.broadcastLobby()
    if (this.gameState) {
      this.broadcastSnapshots('state.snapshot')
    }
  }

  private broadcastLobby(): void {
    const event: ServerEvent = {
      type: 'room.lobby',
      roomCode: this.roomCode,
      players: [...this.players.values()].map((player) => ({ ...player })),
    }

    for (const { connection } of this.connections.values()) {
      connection.send(event)
    }
  }

  private broadcastSnapshots(type: 'state.snapshot' | 'state.patch'): void {
    if (!this.gameState) {
      return
    }

    for (const { connection, playerId } of this.connections.values()) {
      if (!playerId) {
        continue
      }

      connection.send({ type, view: createClientGameView(this.gameState, playerId) })
    }
  }

  private requirePlayer(activeConnection: ActiveConnection): string {
    if (!activeConnection.playerId) {
      throw new Error('Join the room before sending actions.')
    }

    return activeConnection.playerId
  }

  private createPlayerId(): string {
    return `player-${this.createId()}`
  }

  private hasConnectionForPlayer(playerId: string): boolean {
    return [...this.connections.values()].some(
      (activeConnection) => activeConnection.playerId === playerId,
    )
  }

  private persistSnapshot(): void {
    this.persist(this.exportSnapshot())
  }
}

function sanitizeNickname(nickname: string): string {
  const trimmed = nickname.trim()
  if (!trimmed) {
    return 'Player'
  }

  return trimmed.slice(0, 24)
}

function assertNever(value: never): never {
  throw new Error(`Unhandled client event: ${JSON.stringify(value)}`)
}
