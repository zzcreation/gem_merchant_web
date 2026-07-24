import { Play, Users } from 'lucide-react'
import { getDevelopmentCard } from '../../shared/game/catalog'
import { GEM_COLORS } from '../../shared/game/constants'
import type {
  ClientGameView,
  ClientPlayerView,
  ClientReservedCardRef,
  GemColor,
  PaymentPlan,
  TokenColor,
} from '../../shared/game/types'
import { colorName } from '../lib/format'
import { CardFace } from './CardFace'
import { PaymentBox } from './PaymentBox'
import { DiscardPanel, NobleChoicePanel } from './PhaseChoices'
import { StatusBanner, type FeedbackState } from './StatusBanner'
import { TokenPool } from './TokenPool'
import './ActionPanel.css'

type GameResults = {
  winnerNames: string[]
  rows: Array<{
    playerId: string
    nickname: string
    score: number
    cardCount: number
    nobleCount: number
    turnCount: number
    isWinner: boolean
  }>
}

type ActionPanelProps = {
  view: ClientGameView
  currentPlayer: ClientPlayerView
  viewerPlayer: ClientPlayerView
  canAct: boolean
  isViewerTurn: boolean
  isActionPending: boolean
  feedback: FeedbackState
  gameResults: GameResults | null
  selectedTokens: Partial<Record<GemColor, number>>
  hasSelectedTokens: boolean
  viewerVisibleReservedCards: Array<Extract<ClientReservedCardRef, { cardId: string }>>
  selectedReservedCardId: string | null
  selectedCardId: string | null
  selectedPaymentCardId: string | null
  paymentPlan: PaymentPlan
  canBuySelectedMarketCard: boolean
  canBuySelectedReservedCard: boolean
  discardPlan: Partial<Record<TokenColor, number>>
  discardNeeded: number
  eligibleNobleIds: string[]
  onToggleToken: (color: GemColor) => void
  onSelectReservedCard: (cardId: string) => void
  onSuggestPayment: (cardId: string) => void
  onUpdatePayment: (kind: keyof PaymentPlan, color: GemColor, delta: number) => void
  onCanIncreasePayment: (kind: keyof PaymentPlan, color: GemColor) => boolean
  onTakeSelectedTokens: () => void
  onBuyMarketCard: () => void
  onBuyReservedCard: () => void
  onReserveMarketCard: () => void
  onPassTurn: () => void
  onReserveDeck: (level: 1 | 2 | 3) => void
  onUpdateDiscard: (color: TokenColor, delta: number) => void
  onSubmitDiscard: () => void
  onAutoDiscard: () => void
  onChooseNoble: (nobleId: string) => void
}

export function ActionPanel({
  view,
  currentPlayer,
  viewerPlayer,
  canAct,
  isViewerTurn,
  isActionPending,
  feedback,
  gameResults,
  selectedTokens,
  hasSelectedTokens,
  viewerVisibleReservedCards,
  selectedReservedCardId,
  selectedCardId,
  selectedPaymentCardId,
  paymentPlan,
  canBuySelectedMarketCard,
  canBuySelectedReservedCard,
  discardPlan,
  discardNeeded,
  eligibleNobleIds,
  onToggleToken,
  onSelectReservedCard,
  onSuggestPayment,
  onUpdatePayment,
  onCanIncreasePayment,
  onTakeSelectedTokens,
  onBuyMarketCard,
  onBuyReservedCard,
  onReserveMarketCard,
  onPassTurn,
  onReserveDeck,
  onUpdateDiscard,
  onSubmitDiscard,
  onAutoDiscard,
  onChooseNoble,
}: ActionPanelProps) {
  return (
    <aside className="action-panel" aria-label="当前玩家操作">
      <TokenPool
        bank={view.bank}
        selectedTokens={selectedTokens}
        canAct={canAct}
        className="bank mobile-bank"
        testPrefix="mobile-bank-token"
        onToggle={onToggleToken}
      />
      {isViewerTurn ? (
        <div className="turn-alert" role="status" data-testid="turn-alert">
          轮到你了
        </div>
      ) : (
        <div className="turn-alert waiting" role="status" data-testid="turn-alert">
          等待 {currentPlayer.nickname} 行动
        </div>
      )}
      <div className="panel-title">
        <div>
          <h2>行动</h2>
          <p data-testid="current-player">{currentPlayer.nickname} 的回合</p>
        </div>
        <Users size={20} />
      </div>

      <StatusBanner feedback={feedback} />

      {gameResults ? (
        <section className="result-panel" data-testid="result-panel">
          <div className="result-header">
            <span>游戏结束</span>
            <strong>{gameResults.winnerNames.join('、')} 获胜</strong>
          </div>
          <div className="result-list">
            {gameResults.rows.map((row) => (
              <div className={row.isWinner ? 'result-row winner' : 'result-row'} key={row.playerId}>
                <span>{row.nickname}</span>
                <strong>{row.score} 分</strong>
                <em>{row.cardCount} 卡 · {row.nobleCount} 贵族 · {row.turnCount} 回合</em>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <div className="selection-box">
        <span>已选宝石</span>
        <strong>
          {hasSelectedTokens
            ? GEM_COLORS.filter((color) => selectedTokens[color]).map((color) => `${colorName(color)} ${selectedTokens[color]}`).join(' · ')
            : '点击宝石选择本回合拿取'}
        </strong>
      </div>

      <div className={viewerVisibleReservedCards.length > 0 ? 'reserved-action-box has-reserved' : 'reserved-action-box'}>
        <span>我的预留</span>
        <div className="reserved-action-list">
          {viewerVisibleReservedCards.length === 0 ? (
            <strong>暂无可购买预留卡</strong>
          ) : (
            viewerVisibleReservedCards.map((reserved) => (
              <CardFace
                key={reserved.cardId}
                card={getDevelopmentCard(reserved.cardId)}
                size="compact"
                selected={selectedReservedCardId === reserved.cardId}
                disabled={!canAct}
                onSelect={() => onSelectReservedCard(reserved.cardId)}
              />
            ))
          )}
        </div>
      </div>

      {selectedPaymentCardId ? (
        <PaymentBox
          mode={selectedReservedCardId ? 'reserved' : 'market'}
          cardId={selectedPaymentCardId}
          viewerPlayer={viewerPlayer}
          paymentPlan={paymentPlan}
          canAct={canAct}
          onSuggestPayment={onSuggestPayment}
          onUpdatePayment={onUpdatePayment}
          onCanIncreasePayment={onCanIncreasePayment}
        />
      ) : null}

      <div className="action-stack primary-actions">
        <button
          className="secondary-button selected"
          type="button"
          disabled={!canAct || !hasSelectedTokens}
          onClick={onTakeSelectedTokens}
        >
          {isActionPending ? '确认中...' : '拿所选宝石'}
        </button>
        <button
          className="secondary-button"
          type="button"
          hidden={!selectedCardId || !canBuySelectedMarketCard}
          disabled={!canAct || !selectedCardId || !canBuySelectedMarketCard}
          onClick={onBuyMarketCard}
        >
          购买市场卡
        </button>
        <button
          className="secondary-button"
          type="button"
          hidden={!selectedReservedCardId}
          disabled={!canAct || !selectedReservedCardId || !canBuySelectedReservedCard}
          onClick={onBuyReservedCard}
        >
          购买预留卡
        </button>
        <button
          className="secondary-button"
          type="button"
          hidden={!selectedCardId}
          disabled={!canAct}
          onClick={onReserveMarketCard}
        >
          预留市场卡
        </button>
        <button
          className="secondary-button"
          type="button"
          disabled={!canAct}
          onClick={onPassTurn}
        >
          <Play size={16} />
          {isActionPending ? '确认中' : '跳过'}
        </button>
      </div>

      <details className="secondary-actions">
        <summary>更多行动</summary>
        <div className="action-stack">
          <div className="deck-actions">
            {([1, 2, 3] as const).map((level) => (
              <button
                className="small-button"
                disabled={!canAct || view.deckCounts[level] === 0}
                key={level}
                type="button"
                onClick={() => onReserveDeck(level)}
              >
                盲抽 L{level} ({view.deckCounts[level]})
              </button>
            ))}
          </div>
        </div>
      </details>

      {view.phase === 'awaiting_token_discard' ? (
        <DiscardPanel
          currentPlayer={currentPlayer}
          discardPlan={discardPlan}
          discardNeeded={discardNeeded}
          canAct={canAct}
          onUpdateDiscard={onUpdateDiscard}
          onSubmitDiscard={onSubmitDiscard}
          onAutoDiscard={onAutoDiscard}
        />
      ) : null}

      {view.phase === 'awaiting_noble_choice' ? (
        <NobleChoicePanel
          eligibleNobleIds={eligibleNobleIds}
          canAct={canAct}
          onChooseNoble={onChooseNoble}
        />
      ) : null}

      <ol className="event-log" aria-label="最近行动" data-testid="action-log">
        {view.log
          .slice(-6)
          .reverse()
          .map((entry) => (
            <li key={entry.id}>{entry.message}</li>
          ))}
      </ol>
    </aside>
  )
}
