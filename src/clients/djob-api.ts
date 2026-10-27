import { env } from '../core/env.js'
import { logger } from '../core/logger.js'

type PresignResponse = {
  media_id: number
  already_exists: boolean
  cdn_url: string
  storage_key: string
  upload_url: string | null
}

type IngestResponse = {
  product_id: number
  action: 'created' | 'updated' | 'skipped'
  internal_reference: string
}

export class DjobApiClient {
  private token: string | null = null

  constructor(private baseUrl = env.DJOB_API_BASE_URL.replace(/\/$/, '')) {}

  async login() {
    const res = await fetch(`${this.baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: env.DJOB_USERNAME,
        password: env.DJOB_PASSWORD,
      }),
    })
    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Login API falhou (${res.status}): ${text}`)
    }
    const data = (await res.json()) as { token: string }
    this.token = data.token
    logger.success('Autenticado na apps/api')
  }

  private headers(json = true): HeadersInit {
    if (!this.token) throw new Error('API sem token — chame login()')
    return {
      Authorization: `Bearer ${this.token}`,
      ...(json ? { 'Content-Type': 'application/json' } : {}),
    }
  }

  async presignMedia(input: {
    sha256: string
    byte_size: number
    mime: string
    source_url?: string
    product_ref: string
    role: 'gallery' | 'color' | '360'
    sort_order: number
    filename_slug?: string
    force?: boolean
  }): Promise<PresignResponse> {
    const res = await fetch(`${this.baseUrl}/api/v1/ingest/media/presign`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(input),
    })
    if (!res.ok) {
      throw new Error(`presign falhou (${res.status}): ${await res.text()}`)
    }
    return (await res.json()) as PresignResponse
  }

  async completeMedia(input: { media_id: number; sha256: string }) {
    const res = await fetch(`${this.baseUrl}/api/v1/ingest/media/complete`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(input),
    })
    if (!res.ok) {
      throw new Error(`complete media falhou (${res.status}): ${await res.text()}`)
    }
    return res.json()
  }

  async putProduct(body: unknown): Promise<IngestResponse> {
    const res = await fetch(`${this.baseUrl}/api/v1/ingest/products`, {
      method: 'PUT',
      headers: this.headers(),
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      throw new Error(`ingest product falhou (${res.status}): ${await res.text()}`)
    }
    return (await res.json()) as IngestResponse
  }
}
