import { Crown } from 'lucide-react'
import type { NobleTile } from '../../shared/game/data/nobles'
import { costDots, costEntries } from '../lib/cards'
import { colorName } from '../lib/format'
import { GemToken } from './GemToken'

type NobleFaceProps = {
  noble: NobleTile
  interactive?: boolean
  disabled?: boolean
  onSelect?: () => void
}

export function NobleFace({ noble, interactive = false, disabled = false, onSelect }: NobleFaceProps) {
  if (interactive) {
    return (
      <button
        className="noble-choice"
        type="button"
        disabled={disabled}
        onClick={onSelect}
      >
        <Crown size={16} />
        <strong>{noble.prestige}</strong>
        <span>{costDots(noble.requirement).map(colorName).join(' ')}</span>
      </button>
    )
  }

  return (
    <article className="noble-tile">
      <Crown size={18} />
      <strong>{noble.prestige}</strong>
      <div className="mini-cost">
        {costEntries(noble.requirement).map(([gem, amount]) => (
          <GemToken color={gem} amount={amount} variant="requirement" key={`${noble.id}-${gem}`} />
        ))}
      </div>
    </article>
  )
}
