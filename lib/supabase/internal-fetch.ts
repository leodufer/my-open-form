/**
 * Rewrites requests targeting NEXT_PUBLIC_SUPABASE_URL to SUPABASE_INTERNAL_URL
 * on the server so Docker containers can reach the internal Supabase gateway
 * while keeping cookie names aligned with the browser's NEXT_PUBLIC_SUPABASE_URL.
 */
export function getInternalSupabaseFetch(
  publicUrl: string,
  internalUrl?: string
): typeof fetch | undefined {
  if (!internalUrl || internalUrl === publicUrl) {
    return undefined
  }

  return (input, init) => {
    const rawUrl =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url

    if (rawUrl.startsWith(publicUrl)) {
      const rewritten = rawUrl.replace(publicUrl, internalUrl)
      if (typeof input === 'string' || input instanceof URL) {
        return fetch(rewritten, init)
      }
      return fetch(new Request(rewritten, input), init)
    }

    return fetch(input, init)
  }
}

