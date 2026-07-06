import type { GemColor } from '../types'

export interface NobleTile {
  id: string
  prestige: 3
  requirement: Partial<Record<GemColor, number>>
  artSeed: string
}

export const NOBLES: NobleTile[] = [
  {
    id: 'noble-001',
    prestige: 3,
    requirement: { white: 3, blue: 3, black: 3 },
    artSeed: 'guild-patron-001',
  },
  {
    id: 'noble-002',
    prestige: 3,
    requirement: { blue: 3, green: 3, red: 3 },
    artSeed: 'guild-patron-002',
  },
  {
    id: 'noble-003',
    prestige: 3,
    requirement: { white: 3, red: 3, black: 3 },
    artSeed: 'guild-patron-003',
  },
  {
    id: 'noble-004',
    prestige: 3,
    requirement: { green: 4, red: 4 },
    artSeed: 'guild-patron-004',
  },
  {
    id: 'noble-005',
    prestige: 3,
    requirement: { blue: 4, green: 4 },
    artSeed: 'guild-patron-005',
  },
  {
    id: 'noble-006',
    prestige: 3,
    requirement: { red: 4, black: 4 },
    artSeed: 'guild-patron-006',
  },
  {
    id: 'noble-007',
    prestige: 3,
    requirement: { white: 4, black: 4 },
    artSeed: 'guild-patron-007',
  },
  {
    id: 'noble-008',
    prestige: 3,
    requirement: { white: 3, blue: 3, green: 3 },
    artSeed: 'guild-patron-008',
  },
  {
    id: 'noble-009',
    prestige: 3,
    requirement: { green: 3, red: 3, black: 3 },
    artSeed: 'guild-patron-009',
  },
  {
    id: 'noble-010',
    prestige: 3,
    requirement: { white: 4, blue: 4 },
    artSeed: 'guild-patron-010',
  },
]
