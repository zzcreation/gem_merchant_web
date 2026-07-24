const cardArtModules = import.meta.glob('../assets/cards/*.{webp,png,jpg}', {
  eager: true,
  import: 'default',
}) as Record<string, string>

function artUrl(artSeed: string, half = false): string | undefined {
  const suffix = half ? '@0.5x' : ''
  const needle = `/${artSeed}${suffix}.`
  for (const [path, url] of Object.entries(cardArtModules)) {
    if (path.includes(needle)) {
      return url
    }
  }
  // Fall back to full-size if half is missing
  if (half) {
    return artUrl(artSeed, false)
  }
  return undefined
}

export function getCardArtSources(artSeed: string): { mobile: string; desktop: string } | null {
  const desktop = artUrl(artSeed, false)
  if (!desktop) {
    return null
  }
  return {
    mobile: artUrl(artSeed, true) ?? desktop,
    desktop,
  }
}
