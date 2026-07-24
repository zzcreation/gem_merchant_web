import { Crown } from 'lucide-react'
import type { NobleTile } from '../../shared/game/data/nobles'
import { costDots, costEntries } from '../lib/cards'
import { colorName } from '../lib/format'
import { getNobleArtSources } from '../lib/nobleArt'
import { GemToken } from './GemToken'
import './NobleFace.css'

type NobleFaceProps = {
  noble: NobleTile
  interactive?: boolean
  disabled?: boolean
  onSelect?: () => void
}

export function NobleFace({ noble, interactive = false, disabled = false, onSelect }: NobleFaceProps) {
  const art = getNobleArtSources(noble.artSeed)

  if (interactive) {
    return (
      <button
        className={`noble-choice ${art ? 'has-art' : 'no-art'}`}
        type="button"
        disabled={disabled}
        onClick={onSelect}
      >
        {art ? (
          <picture className="noble-choice-art">
            <source media="(min-width: 768px)" srcSet={art.desktop} />
            <img src={art.mobile} alt="" width={48} height={48} draggable={false} />
          </picture>
        ) : (
          <Crown size={16} />
        )}
        <strong>{noble.prestige}</strong>
        <span>{costDots(noble.requirement).map(colorName).join(' ')}</span>
      </button>
    )
  }

  return (
    <article className={`noble-tile ${art ? 'has-art' : 'no-art'}`}>
      <div className="noble-media" aria-hidden={art ? undefined : true}>
        {art ? (
          <picture>
            <source media="(min-width: 768px)" srcSet={art.desktop} />
            <img src={art.mobile} alt="" width={256} height={256} draggable={false} />
          </picture>
        ) : (
          <div className="noble-art-fallback">
            <Crown size={22} />
          </div>
        )}
      </div>

      <div className="noble-scrim noble-scrim-top" />
      <div className="noble-scrim noble-scrim-cost" />

      <div className="noble-overlay-top">
        <strong className="prestige-pill">{noble.prestige}</strong>
      </div>

      <div className="noble-overlay-cost">
        {costEntries(noble.requirement).map(([gem, amount]) => (
          <GemToken color={gem} amount={amount} variant="requirement" key={`${noble.id}-${gem}`} />
        ))}
      </div>
    </article>
  )
}
