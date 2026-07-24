import { Crown, ShieldCheck } from 'lucide-react'
import { GEM_COLORS, TOKEN_COLORS } from '../../shared/game/constants'
import type { ClientPlayerView } from '../../shared/game/types'
import { cardCostEntries, cardLabel, countPurchasedBonus } from '../lib/cards'
import { GemToken } from './GemToken'

type PlayerPanelProps = {
  player: ClientPlayerView
  isActive: boolean
}

export function PlayerPanel({ player, isActive }: PlayerPanelProps) {
  return (
    <article className={isActive ? 'player-panel active' : 'player-panel'}>
      <div className="panel-title">
        <div>
          <h2>{player.nickname}</h2>
          <p>{isActive ? '当前行动' : player.ready ? '已准备' : '等待'}</p>
        </div>
        <strong>{player.score}</strong>
      </div>
      <div className="gem-row" data-testid={`player-token-summary-${player.nickname}`}>
        {TOKEN_COLORS.map((color) => (
          <span
            className={`player-token ${color}`}
            data-testid={`player-token-${player.nickname}-${color}`}
            key={color}
          >
            {player.tokens[color]}
          </span>
        ))}
      </div>
      <div className="discount-grid">
        {GEM_COLORS.map((color) => (
          <span className={`discount ${color}`} key={color}>
            {countPurchasedBonus(player, color)}
          </span>
        ))}
      </div>
      <div className="reserved-list">
        {player.reservedCards.length === 0 ? (
          <span>无预留</span>
        ) : (
          player.reservedCards.map((reserved, index) => (
            <span className="reserved-pill" key={`${player.id}-${index}`}>
              {reserved.type === 'hidden' ? '暗牌' : (
                <>
                  <span>{cardLabel(reserved.cardId)}</span>
                  <span className="reserved-cost">
                    {cardCostEntries(reserved.cardId).map(([gem, amount]) => (
                      <GemToken color={gem} amount={amount} key={`${reserved.cardId}-${gem}`} />
                    ))}
                  </span>
                </>
              )}
            </span>
          ))
        )}
      </div>
      <div className="meta-row">
        <span>
          <ShieldCheck size={15} />
          已购 {player.purchasedCardIds.length}
        </span>
        <span>
          <Crown size={15} />
          贵族 {player.nobleIds.length}
        </span>
      </div>
    </article>
  )
}

type PlayerRailProps = {
  players: ClientPlayerView[]
  currentPlayerId: string
}

export function PlayerRail({ players, currentPlayerId }: PlayerRailProps) {
  return (
    <aside className="player-rail" aria-label="玩家公开信息">
      {players.map((player) => (
        <PlayerPanel
          key={player.id}
          player={player}
          isActive={player.id === currentPlayerId}
        />
      ))}
    </aside>
  )
}
