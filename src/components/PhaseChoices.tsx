import { getNoble } from '../../shared/game/catalog'
import { TOKEN_COLORS } from '../../shared/game/constants'
import type { ClientPlayerView, TokenColor } from '../../shared/game/types'
import { countSelectedTokens } from '../lib/affordability'
import { colorName } from '../lib/format'
import { NobleFace } from './NobleFace'
import './PhaseChoices.css'

type DiscardPanelProps = {
  currentPlayer: ClientPlayerView
  discardPlan: Partial<Record<TokenColor, number>>
  discardNeeded: number
  canAct: boolean
  onUpdateDiscard: (color: TokenColor, delta: number) => void
  onSubmitDiscard: () => void
  onAutoDiscard: () => void
}

export function DiscardPanel({
  currentPlayer,
  discardPlan,
  discardNeeded,
  canAct,
  onUpdateDiscard,
  onSubmitDiscard,
  onAutoDiscard,
}: DiscardPanelProps) {
  return (
    <div className="choice-box danger" data-testid="discard-panel">
      <div className="choice-header">
        <span>弃宝石</span>
        <strong>{countSelectedTokens(discardPlan)} / {discardNeeded}</strong>
      </div>
      {TOKEN_COLORS.map((color) => (
        <div className="choice-row" key={color}>
          <span className={`mini-gem ${color}`} />
          <strong>{color === 'gold' ? '金' : colorName(color)}</strong>
          <span>持有 {currentPlayer.tokens[color]}</span>
          <div className="payment-stepper">
            <button
              type="button"
              disabled={!canAct || (discardPlan[color] ?? 0) === 0}
              onClick={() => onUpdateDiscard(color, -1)}
            >
              -
            </button>
            <span>{discardPlan[color] ?? 0}</span>
            <button
              type="button"
              disabled={
                !canAct ||
                (discardPlan[color] ?? 0) >= currentPlayer.tokens[color] ||
                countSelectedTokens(discardPlan) >= discardNeeded
              }
              onClick={() => onUpdateDiscard(color, 1)}
            >
              +
            </button>
          </div>
        </div>
      ))}
      <button
        className="secondary-button danger"
        type="button"
        disabled={!canAct || countSelectedTokens(discardPlan) !== discardNeeded}
        onClick={onSubmitDiscard}
      >
        确认弃宝石
      </button>
      <button
        className="secondary-button"
        type="button"
        disabled={!canAct}
        onClick={onAutoDiscard}
      >
        自动弃到 10
      </button>
    </div>
  )
}

type NobleChoicePanelProps = {
  eligibleNobleIds: string[]
  canAct: boolean
  onChooseNoble: (nobleId: string) => void
}

export function NobleChoicePanel({ eligibleNobleIds, canAct, onChooseNoble }: NobleChoicePanelProps) {
  return (
    <div className="choice-box" data-testid="noble-choice-panel">
      <div className="choice-header">
        <span>选择贵族</span>
        <strong>{eligibleNobleIds.length} 位可选</strong>
      </div>
      {eligibleNobleIds.map((nobleId) => {
        const noble = getNoble(nobleId)
        return (
          <NobleFace
            key={noble.id}
            noble={noble}
            interactive
            disabled={!canAct}
            onSelect={() => onChooseNoble(noble.id)}
          />
        )
      })}
    </div>
  )
}
