import type { GemColor, TokenColor } from '../../shared/game/types'

const gemIconModules = import.meta.glob('../assets/ui/gem_*.svg', {
  eager: true,
  import: 'default',
}) as Record<string, string>

export function getGemIconUrl(color: GemColor | TokenColor): string | undefined {
  const needle = `/gem_${color}.svg`
  for (const [path, url] of Object.entries(gemIconModules)) {
    if (path.endsWith(needle) || path.includes(needle)) {
      return url
    }
  }
  return undefined
}
