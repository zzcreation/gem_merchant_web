import { TOKEN_COLORS } from '../../shared/game/constants'
import type { GemColor, TokenColor } from '../../shared/game/types'
import { getGemIconUrl } from '../lib/gemArt'
import { colorName } from '../lib/format'
import './TokenPool.css'

type TokenPoolProps = {
  bank: Record<TokenColor, number>
  selectedTokens: Partial<Record<GemColor, number>>
  canAct: boolean
  className?: string
  testPrefix?: string
  onToggle: (color: GemColor) => void
}

export function TokenPool({
  bank,
  selectedTokens,
  canAct,
  className = 'bank',
  testPrefix = 'bank-token',
  onToggle,
}: TokenPoolProps) {
  return (
    <div
      className={className}
      aria-label="公共宝石池"
      data-testid={testPrefix === 'bank-token' ? 'bank-token-summary' : undefined}
    >
      {TOKEN_COLORS.map((color) => {
        const icon = getGemIconUrl(color)
        return (
          <button
            className={`bank-token ${color} ${icon ? 'has-icon' : ''} ${selectedTokens[color as GemColor] ? 'selected' : ''}`}
            disabled={!canAct || color === 'gold' || bank[color] === 0}
            type="button"
            key={color}
            aria-label={color === 'gold' ? '金币' : `选择${colorName(color)}宝石`}
            data-testid={`${testPrefix}-${color}`}
            onClick={() => canAct && color !== 'gold' && onToggle(color)}
          >
            {icon ? <img className="bank-token-gem" src={icon} alt="" draggable={false} /> : null}
            <span>{bank[color]}</span>
            {selectedTokens[color as GemColor] ? <em>{selectedTokens[color as GemColor]}</em> : null}
          </button>
        )
      })}
    </div>
  )
}
