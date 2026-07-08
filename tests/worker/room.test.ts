import { describe, expect, it } from 'vitest'
import { GameRoomController, type RoomConnection } from '../../worker/room'
import type { ClientActionEnvelope, ClientEvent } from '../../shared/protocol/client-events'
import type { ServerEvent } from '../../shared/protocol/server-events'

class FakeConnection implements RoomConnection {
  readonly events: ServerEvent[] = []

  constructor(readonly id: string) {}

  send(event: ServerEvent): void {
    this.events.push(event)
  }
}

describe('GameRoomController', () => {
  it('joins players, starts a room, and broadcasts player-scoped snapshots', () => {
    const room = createRoom()
    const a = new FakeConnection('conn-a')
    const b = new FakeConnection('conn-b')

    room.connect(a)
    room.connect(b)
    room.receive(a.id, envelope('a-join', { type: 'room.join', roomCode: 'room-1', nickname: 'Ada' }))
    room.receive(b.id, envelope('b-join', { type: 'room.join', roomCode: 'room-1', nickname: 'Ben' }))
    room.receive(a.id, envelope('a-ready', { type: 'room.ready', ready: true }))
    room.receive(b.id, envelope('b-ready', { type: 'room.ready', ready: true }))
    room.receive(a.id, envelope('start', { type: 'room.start' }))

    expect(lastEventOfType(a.events, 'room.joined')).toMatchObject({
      playerId: 'player-id-1',
      resumeToken: 'player-id-1',
    })
    expect(lastEventOfType(b.events, 'room.joined')).toMatchObject({
      playerId: 'player-id-2',
      resumeToken: 'player-id-2',
    })

    const aSnapshot = lastEventOfType(a.events, 'state.snapshot')
    const bSnapshot = lastEventOfType(b.events, 'state.snapshot')

    expect(aSnapshot.view.phase).toBe('playing')
    expect(aSnapshot.view.playerOrder).toEqual(['player-id-1', 'player-id-2'])
    expect(bSnapshot.view.playerOrder).toEqual(['player-id-1', 'player-id-2'])
    expect(aSnapshot.view.version).toBe(2)
  })

  it('applies game actions only at the current version', () => {
    const room = startedRoom()
    const [a, b] = room.connections

    room.controller.receive(
      a.id,
      envelope(
        'take',
        {
          type: 'game.action',
          action: { type: 'takeTokens', tokens: { white: 1, blue: 1, green: 1 } },
        },
        2,
      ),
    )

    const bPatch = lastEventOfType(b.events, 'state.patch')
    expect(bPatch.view.currentPlayerId).toBe('player-id-2')
    expect(bPatch.view.players['player-id-1'].tokens).toMatchObject({
      white: 1,
      blue: 1,
      green: 1,
    })

    room.controller.receive(
      b.id,
      envelope('stale', { type: 'game.action', action: { type: 'passTurn', reason: 'no_legal_action' } }, 2),
    )

    expect(lastEventOfType(b.events, 'game.error')).toMatchObject({
      actionId: 'stale',
      message: 'Client version is stale.',
    })
  })

  it('marks a joined player disconnected when their last connection closes', () => {
    const room = startedRoom()
    const [, b] = room.connections

    room.controller.disconnect(b.id)

    const aSnapshot = lastEventOfType(room.connections[0].events, 'state.snapshot')
    expect(aSnapshot.view.players['player-id-2'].connected).toBe(false)
  })

  it('resumes a disconnected player without creating a new seat', () => {
    const room = startedRoom()
    const [a] = room.connections
    const resumed = new FakeConnection('conn-a-resumed')

    room.controller.disconnect(a.id)
    room.controller.connect(resumed)
    room.controller.receive(
      resumed.id,
      envelope('a-resume', {
        type: 'room.join',
        roomCode: 'room-1',
        nickname: 'Ada back',
        resumeToken: 'player-id-1',
      }),
    )

    expect(lastEventOfType(resumed.events, 'room.joined')).toMatchObject({
      playerId: 'player-id-1',
      resumeToken: 'player-id-1',
    })
    expect(lastEventOfType(resumed.events, 'room.lobby').players).toHaveLength(2)
    expect(lastEventOfType(resumed.events, 'state.snapshot').view.players['player-id-1']).toMatchObject({
      nickname: 'Ada back',
      connected: true,
    })
  })

  it('hydrates room state from a persisted snapshot', () => {
    const started = startedRoom()
    const persisted = started.controller.exportSnapshot()
    const hydrated = GameRoomController.hydrate(persisted)
    const resumed = new FakeConnection('conn-b-resumed')

    hydrated.connect(resumed)
    hydrated.receive(
      resumed.id,
      envelope('b-resume', {
        type: 'room.join',
        roomCode: 'room-1',
        nickname: 'Ben',
        resumeToken: 'player-id-2',
      }),
    )

    expect(lastEventOfType(resumed.events, 'room.lobby').players).toHaveLength(2)
    expect(lastEventOfType(resumed.events, 'state.snapshot').view).toMatchObject({
      phase: 'playing',
      version: 2,
    })
  })
})

function createRoom(): GameRoomController {
  let id = 0
  return new GameRoomController('room-1', () => {
    id += 1
    return `id-${id}`
  })
}

function startedRoom(): { controller: GameRoomController; connections: [FakeConnection, FakeConnection] } {
  const controller = createRoom()
  const a = new FakeConnection('conn-a')
  const b = new FakeConnection('conn-b')

  controller.connect(a)
  controller.connect(b)
  controller.receive(a.id, envelope('a-join', { type: 'room.join', roomCode: 'room-1', nickname: 'Ada' }))
  controller.receive(b.id, envelope('b-join', { type: 'room.join', roomCode: 'room-1', nickname: 'Ben' }))
  controller.receive(a.id, envelope('a-ready', { type: 'room.ready', ready: true }))
  controller.receive(b.id, envelope('b-ready', { type: 'room.ready', ready: true }))
  controller.receive(a.id, envelope('start', { type: 'room.start' }))

  return { controller, connections: [a, b] }
}

function envelope(
  actionId: string,
  payload: ClientEvent,
  expectedVersion = 0,
): ClientActionEnvelope {
  return { actionId, expectedVersion, payload }
}

function lastEventOfType<T extends ServerEvent['type']>(
  events: ServerEvent[],
  type: T,
): Extract<ServerEvent, { type: T }> {
  const event = events.findLast((event) => event.type === type)
  if (!event) {
    throw new Error(`Expected event: ${type}`)
  }

  return event as Extract<ServerEvent, { type: T }>
}
