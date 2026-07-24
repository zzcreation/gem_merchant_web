import { GEM_COLORS } from '../../shared/game/constants'
import { getNoble } from '../../shared/game/catalog'
import type { ClientGameView, ClientPlayerView } from '../../shared/game/types'
import { countPurchasedBonus } from './cards'

export function findEligibleNobleIds(view: ClientGameView, player: ClientPlayerView): string[] {
  return view.nobles.filter((nobleId) => {
    const noble = getNoble(nobleId)
    return GEM_COLORS.every((color) => countPurchasedBonus(player, color) >= (noble.requirement[color] ?? 0))
  })
}
