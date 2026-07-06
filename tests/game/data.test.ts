import { describe, expect, it } from 'vitest'
import { GEM_COLORS } from '../../shared/game/constants'
import { DEVELOPMENT_CARDS } from '../../shared/game/data/development-cards'
import { NOBLES } from '../../shared/game/data/nobles'
import { getDataReadiness, validateGameData } from '../../shared/game/validation'

describe('game data', () => {
  it('contains the full base development deck and noble set', () => {
    expect(getDataReadiness()).toEqual({
      developmentCards: 90,
      nobles: 10,
      hasCompleteDevelopmentDeck: true,
      hasCompleteNobles: true,
    })
  })

  it('matches base game card distribution', () => {
    expect(DEVELOPMENT_CARDS.filter((card) => card.level === 1)).toHaveLength(40)
    expect(DEVELOPMENT_CARDS.filter((card) => card.level === 2)).toHaveLength(30)
    expect(DEVELOPMENT_CARDS.filter((card) => card.level === 3)).toHaveLength(20)

    for (const color of GEM_COLORS) {
      expect(DEVELOPMENT_CARDS.filter((card) => card.bonus === color)).toHaveLength(18)
    }
  })

  it('has stable unique ids and valid costs', () => {
    expect(new Set(DEVELOPMENT_CARDS.map((card) => card.id))).toHaveLength(90)
    expect(new Set(NOBLES.map((noble) => noble.id))).toHaveLength(10)
    expect(validateGameData()).toEqual([])
  })
})
