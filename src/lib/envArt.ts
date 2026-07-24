const envArtModules = import.meta.glob('../assets/environments/*.{webp,png,jpg}', {
  eager: true,
  import: 'default',
}) as Record<string, string>

function artUrl(assetId: string, half = false): string | undefined {
  const suffix = half ? '@0.5x' : ''
  const needle = `/${assetId}${suffix}.`
  for (const [path, url] of Object.entries(envArtModules)) {
    if (path.includes(needle)) {
      return url
    }
  }
  if (half) {
    return artUrl(assetId, false)
  }
  return undefined
}

export function getEnvArtSources(assetId: string): { mobile: string; desktop: string } | null {
  const desktop = artUrl(assetId, false)
  if (!desktop) {
    return null
  }
  return {
    mobile: artUrl(assetId, true) ?? desktop,
    desktop,
  }
}
