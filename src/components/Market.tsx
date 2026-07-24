import { getDevelopmentCard } from '../../shared/game/catalog'
import type { ClientGameView, ClientPlayerView } from '../../shared/game/types'
import { getCardAffordability } from '../lib/affordability'
import { CardFace, EmptyCardFace } from './CardFace'
import './Market.css'

type Level = 1 | 2 | 3

type MarketProps = {
  market: ClientGameView['market']
  selectedCard: { level: Level; slot: number } | null
  viewerPlayer: ClientPlayerView
  onSelectCard: (selection: { level: Level; slot: number }, cardId: string) => void
}

export function Market({ market, selectedCard, viewerPlayer, onSelectCard }: MarketProps) {
  return (
    <div className="market" aria-label="发展卡市场">
      {([3, 2, 1] as const).map((level) => (
        <div className="market-row" key={level}>
          <div className="tier-label">L{level}</div>
          {market[level].map((cardId, slot) => {
            const card = cardId ? getDevelopmentCard(cardId) : null
            const isSelected = selectedCard?.level === level && selectedCard.slot === slot
            const key = `${level}-${slot}-${cardId ?? 'empty'}`
            if (!card) {
              return <EmptyCardFace key={key} />
            }
            return (
              <CardFace
                key={key}
                card={card}
                affordability={getCardAffordability(viewerPlayer, card.id)}
                selected={isSelected}
                onSelect={() => onSelectCard({ level, slot }, card.id)}
              />
            )
          })}
        </div>
      ))}
    </div>
  )
}
