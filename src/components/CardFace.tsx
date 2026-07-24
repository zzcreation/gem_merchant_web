import { CircleDollarSign } from 'lucide-react'
import type { DevelopmentCard } from '../../shared/game/data/development-cards'
import type { CardAffordability } from '../lib/affordability'
import { getCardArtSources } from '../lib/cardArt'
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

  const art = getCardArtSources(card.artSeed)
  const costs = costEntries(card.cost)

  return (
    <button
      className={`dev-card ${card.bonus} afford-${affordability} ${selected ? 'selected' : ''} ${art ? 'has-art' : 'no-art'}`}
      disabled={disabled}
      type="button"
      onClick={onSelect}
    >
      <div className="card-media" aria-hidden={art ? undefined : true}>
        {art ? (
          <picture>
            <source media="(min-width: 768px)" srcSet={art.desktop} />
            <img src={art.mobile} alt="" width={256} height={384} draggable={false} />
          </picture>
        ) : (
          <div className="card-art-fallback">
            <CircleDollarSign size={36} />
            <span>{card.artSeed.split('-').slice(0, 2).join(' ')}</span>
          </div>
        )}
      </div>

      <div className="card-scrim card-scrim-top" />
      <div className="card-scrim card-scrim-cost" />

      <div className="card-overlay-top">
        {card.prestige > 0 ? <strong className="prestige-pill">{card.prestige}</strong> : <span />}
        <span className={`bonus ${card.bonus}`} />
      </div>

      <div className="card-overlay-cost">
        {costs.map(([gem, amount]) => (
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
