import { describe, expect, it } from 'vitest'
import { createInitialGameState } from '../../shared/game/setup'

const players = [
  { id: 'p1', nickname: 'A' },
  { id: 'p2', nickname: 'B' },
  { id: 'p3', nickname: 'C' },
  { id: 'p4', nickname: 'D' },
]

describe('createInitialGameState', () => {
  it('creates a classic four-player lobby with base token counts', () => {
    const state = createInitialGameState({
      id: 'room-1',
      seed: 'seed-1',
      players,
    })

    expect(state.mode).toBe('classic')
    expect(state.phase).toBe('lobby')
    expect(state.bank).toMatchObject({
      white: 7,
      blue: 7,
      green: 7,
      red: 7,
      black: 7,
      gold: 5,
    })
    expect(state.nobles).toHaveLength(5)
    expect(state.market[1]).toHaveLength(4)
    expect(state.market[1].every(Boolean)).toBe(true)
    expect(state.decks[1]).toHaveLength(36)
    expect(state.decks[2]).toHaveLength(26)
    expect(state.decks[3]).toHaveLength(16)
    expect(state.currentPlayerId).toBe('p1')
  })

  it('uses the extended setup for five players', () => {
    const state = createInitialGameState({
      id: 'room-2',
      seed: 'seed-2',
      players: [...players, { id: 'p5', nickname: 'E' }],
    })

    expect(state.mode).toBe('extended_5p')
    expect(state.bank.white).toBe(8)
    expect(state.nobles).toHaveLength(6)
  })

  it('rejects unsupported player counts', () => {
    expect(() =>
      createInitialGameState({
        id: 'room-3',
        seed: 'seed-3',
        players: [{ id: 'p1', nickname: 'A' }],
      }),
    ).toThrow('2-5 players')
  })
})
