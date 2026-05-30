// Rate limiter in-memory semplice (sliding window).
// Sufficiente per proteggere endpoint pubblici a basso traffico come il
// lookup azienda. Per deploy multi-istanza valutare Upstash/Redis.

type Bucket = { timestamps: number[] }

const buckets = new Map<string, Bucket>()

export interface RateLimitOptions {
  /** Numero massimo di richieste consentite nella finestra. */
  limit: number
  /** Ampiezza della finestra in millisecondi. */
  windowMs: number
}

export interface RateLimitResult {
  success: boolean
  remaining: number
  resetMs: number
}

export function rateLimit(key: string, options: RateLimitOptions): RateLimitResult {
  const now = Date.now()
  const windowStart = now - options.windowMs

  const bucket = buckets.get(key) ?? { timestamps: [] }
  // Mantieni solo gli eventi dentro la finestra corrente
  bucket.timestamps = bucket.timestamps.filter((t) => t > windowStart)

  if (bucket.timestamps.length >= options.limit) {
    const oldest = bucket.timestamps[0]
    buckets.set(key, bucket)
    return {
      success: false,
      remaining: 0,
      resetMs: Math.max(0, oldest + options.windowMs - now),
    }
  }

  bucket.timestamps.push(now)
  buckets.set(key, bucket)

  // Pulizia opportunistica per evitare crescita illimitata della mappa
  if (buckets.size > 5000) {
    for (const [k, b] of buckets) {
      b.timestamps = b.timestamps.filter((t) => t > windowStart)
      if (b.timestamps.length === 0) buckets.delete(k)
    }
  }

  return {
    success: true,
    remaining: options.limit - bucket.timestamps.length,
    resetMs: options.windowMs,
  }
}

/** Estrae un identificativo IP best-effort dagli header della richiesta. */
export function getClientIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0].trim()
  const realIp = req.headers.get('x-real-ip')
  if (realIp) return realIp.trim()
  return 'unknown'
}
