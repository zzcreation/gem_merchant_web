import { CircleDollarSign } from 'lucide-react'
import type { DevelopmentCard } from '../../shared/game/data/development-cards'
import type { CardAffordability } from '../lib/affordability'
import { cardLabel, costEntries } from '../lib/cards'
import { GemToken } from './GemToken'

type CardFaceProps = {
  card: DevelopmentCard
  size?: 'full' | 'compact' | 'mini'
  affordability?: CardAffordability
  selected?: boolean
  disabled?: boolean
  onSelect?: () => void
}

export function CardFace({
  card,
  size = 'full',
  affordability = 'none',
  selected = false,
  disabled = false,
  onSelect,
}: CardFaceProps) {
  if (size === 'mini') {
    return (
      <span className={`card-face-mini ${card.bonus}`} title={cardLabel(card.id)}>
        <span className={`bonus ${card.bonus}`} />
        {card.prestige > 0 ? <strong>{card.prestige}</strong> : null}
      </span>
    )
  }

  if (size === 'compact') {
    return (
      <button
        className={selected ? 'reserved-buy-pill selected' : 'reserved-buy-pill'}
        type="button"
        disabled={disabled}
        onClick={onSelect}
      >
        <span>{cardLabel(card.id)}</span>
        <span className="reserved-cost">
          {costEntries(card.cost).map(([gem, amount]) => (
            <GemToken color={gem} amount={amount} key={`${card.id}-${gem}`} />
          ))}
        </span>
      </button>
    )
  }

  return (
    <button
      className={`dev-card ${card.bonus} afford-${affordability} ${selected ? 'selected' : ''}`}
      disabled={disabled}
      type="button"
      onClick={onSelect}
    >
      <div className="card-top">
        <strong>{card.prestige}</strong>
        <span className={`bonus ${card.bonus}`} />
      </div>
      <div className="card-art">
        <CircleDollarSign size={36} />
        <span>{card.artSeed.split('-').slice(0, 2).join(' ')}</span>
      </div>
      <div className="card-cost">
        {costEntries(card.cost).map(([gem, amount]) => (
          <GemToken color={gem} amount={amount} key={`${card.id}-${gem}`} />
        ))}
      </div>
    </button>
  )
}

export function EmptyCardFace() {
  return (
    <button className="dev-card empty" disabled type="button">
      <span>空位</span>
    </button>
  )
}
