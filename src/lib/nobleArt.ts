const nobleArtModules = import.meta.glob('../assets/nobles/*.{webp,png,jpg}', {
  eager: true,
  import: 'default',
}) as Record<string, string>

function artUrl(artSeed: string, half = false): string | undefined {
  const suffix = half ? '@0.5x' : ''
  const needle = `/${artSeed}${suffix}.`
  for (const [path, url] of Object.entries(nobleArtModules)) {
    if (path.includes(needle)) {
      return url
    }
  }
  if (half) {
    return artUrl(artSeed, false)
  }
  return undefined
}

export function getNobleArtSources(artSeed: string): { mobile: string; desktop: string } | null {
  const desktop = artUrl(artSeed, false)
  if (!desktop) {
    return null
  }
  return {
    mobile: artUrl(artSeed, true) ?? desktop,
    desktop,
  }
}
