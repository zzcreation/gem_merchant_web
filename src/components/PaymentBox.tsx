import { GEM_COLORS } from '../../shared/game/constants'
import type { ClientPlayerView, GemColor, PaymentPlan } from '../../shared/game/types'
import { colorName } from '../lib/format'
import { discountedCost, isPaymentExact, paymentSummary } from '../lib/payment'
import './PaymentBox.css'

type PaymentBoxProps = {
  mode: 'market' | 'reserved'
  cardId: string
  viewerPlayer: ClientPlayerView
  paymentPlan: PaymentPlan
  canAct: boolean
  onSuggestPayment: (cardId: string) => void
  onUpdatePayment: (kind: keyof PaymentPlan, color: GemColor, delta: number) => void
  onCanIncreasePayment: (kind: keyof PaymentPlan, color: GemColor) => boolean
}

export function PaymentBox({
  mode,
  cardId,
  viewerPlayer,
  paymentPlan,
  canAct,
  onSuggestPayment,
  onUpdatePayment,
  onCanIncreasePayment,
}: PaymentBoxProps) {
  return (
    <div className="payment-box" data-testid="payment-plan">
      <div className="payment-header">
        <span>{mode === 'reserved' ? '预留卡支付' : '市场卡支付'}</span>
        <button
          className="tiny-button"
          type="button"
          disabled={!canAct}
          onClick={() => onSuggestPayment(cardId)}
        >
          自动
        </button>
      </div>
      <p className={isPaymentExact(viewerPlayer, cardId, paymentPlan) ? 'payment-status valid' : 'payment-status'}>
        {paymentSummary(viewerPlayer, cardId, paymentPlan)}
      </p>
      <details className="advanced-payment">
        <summary>高级支付</summary>
        {GEM_COLORS.map((color) => {
          const due = discountedCost(viewerPlayer, cardId, color)
          const normal = paymentPlan.tokens[color] ?? 0
          const gold = paymentPlan.goldAs[color] ?? 0
          return (
            <div className="payment-row" key={color}>
              <span className={`mini-gem ${color}`} />
              <strong>{colorName(color)}</strong>
              <span>需 {due}</span>
              <div className="payment-stepper" aria-label={`${colorName(color)}普通宝石支付`}>
                <button
                  type="button"
                  disabled={!canAct || normal === 0}
                  onClick={() => onUpdatePayment('tokens', color, -1)}
                >
                  -
                </button>
                <span>宝 {normal}</span>
                <button
                  type="button"
                  disabled={!canAct || !onCanIncreasePayment('tokens', color)}
                  onClick={() => onUpdatePayment('tokens', color, 1)}
                >
                  +
                </button>
              </div>
              <div className="payment-stepper" aria-label={`${colorName(color)}金币支付`}>
                <button
                  type="button"
                  disabled={!canAct || gold === 0}
                  onClick={() => onUpdatePayment('goldAs', color, -1)}
                >
                  -
                </button>
                <span>金 {gold}</span>
                <button
                  type="button"
                  disabled={!canAct || !onCanIncreasePayment('goldAs', color)}
                  onClick={() => onUpdatePayment('goldAs', color, 1)}
                >
                  +
                </button>
              </div>
            </div>
          )
        })}
      </details>
    </div>
  )
}
