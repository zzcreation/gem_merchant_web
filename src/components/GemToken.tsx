import type { GemColor, TokenColor } from '../../shared/game/types'

type GemTokenProps = {
  color: GemColor | TokenColor
  amount?: number
  variant?: 'cost' | 'requirement' | 'mini'
}

export function GemToken({ color, amount, variant = 'cost' }: GemTokenProps) {
  const className = variant === 'requirement'
    ? `requirement-badge ${color}`
    : variant === 'mini'
      ? `mini-gem ${color}`
      : `cost-badge ${color}`

  return (
    <span className={className}>
      {amount !== undefined ? amount : null}
    </span>
  )
}
