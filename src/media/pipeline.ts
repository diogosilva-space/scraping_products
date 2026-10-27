import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import sharp from 'sharp'
import { env } from '../core/env.js'
import { sha256Buffer } from '../core/fingerprint.js'
import { logger } from '../core/logger.js'
import type { DjobApiClient } from '../clients/djob-api.js'

const s3 = new S3Client({
  region: env.STORAGE_REGION,
  endpoint: env.STORAGE_ENDPOINT,
  forcePathStyle: false,
  credentials: {
    accessKeyId: env.STORAGE_ACCESS_KEY_ID,
    secretAccessKey: env.STORAGE_SECRET_ACCESS_KEY,
  },
})

const IMAGE_SIZE = 600
const BRAND = 'D.JOB'
const COPYRIGHT = `© ${new Date().getFullYear()} ${BRAND} — djob.com.br`
const SOFTWARE = 'D.JOB Catalog Pipeline'

export type ImageBrandMeta = {
  /** Título / XPTitle / ImageDescription curto */
  title?: string
  /** Descrição longa (produto) */
  description?: string
  /** SKU / referência interna */
  reference?: string
}

export type IngestImageOptions = {
  cookieHeader?: string
  force?: boolean
  meta?: ImageBrandMeta
  /** Obrigatório: pasta CDN = products/{productRef}/ */
  productRef: string
  role: 'gallery' | 'color' | '360'
  sortOrder: number
}

async function downloadBytes(url: string, cookieHeader?: string): Promise<Buffer> {
  const res = await fetch(url, {
    headers: cookieHeader ? { Cookie: cookieHeader } : undefined,
  })
  if (!res.ok) {
    throw new Error(`Download falhou ${res.status}: ${url}`)
  }
  return Buffer.from(await res.arrayBuffer())
}

function buildImageDescription(meta?: ImageBrandMeta): string {
  const parts = [
    meta?.title?.trim(),
    meta?.reference ? `Ref. ${meta.reference}` : null,
    meta?.description?.trim()?.slice(0, 180),
    `Brinde personalizado ${BRAND}`,
    'https://djob.com.br',
  ].filter(Boolean)
  return parts.join(' — ').slice(0, 400)
}

/**
 * Remove metadados do fornecedor, padroniza 600×600 (contain, sem distorcer)
 * e injeta EXIF/XMP da marca D.JOB (+ dados do produto quando informados).
 */
export async function normalizeProductImage(
  original: Buffer,
  meta?: ImageBrandMeta
): Promise<Buffer> {
  const title = (meta?.title || `${BRAND} — brinde personalizado`).slice(0, 120)
  const description = buildImageDescription(meta)

  return sharp(original, { failOn: 'none' })
    .rotate()
    .resize(IMAGE_SIZE, IMAGE_SIZE, {
      fit: 'contain',
      background: { r: 255, g: 255, b: 255, alpha: 1 },
      withoutEnlargement: false,
    })
    .withMetadata({
      density: 72,
      exif: {
        IFD0: {
          Copyright: COPYRIGHT,
          Artist: BRAND,
          ImageDescription: description,
          Software: SOFTWARE,
          XPTitle: title,
          XPComment: description,
          XPAuthor: BRAND,
          XPSubject: meta?.reference
            ? `${title} (${meta.reference})`
            : title,
        },
      },
    })
    .webp({ quality: 82, effort: 4 })
    .toBuffer()
}

function asciiHeader(value: string, max = 100): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max)
}

function filenameSlugFromMeta(meta?: ImageBrandMeta): string {
  const parts = [meta?.title, meta?.reference].filter(Boolean).join(' ')
  return (
    parts
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80) || 'produto-djob'
  )
}

/**
 * Baixa imagem da origem, normaliza WebP e sobe na pasta do produto no Spaces.
 * Retorna media_id pronto para ingest.
 */
export async function ingestSourceImage(
  api: DjobApiClient,
  sourceUrl: string,
  options: IngestImageOptions
): Promise<number> {
  const original = await downloadBytes(sourceUrl, options.cookieHeader)
  const sha256 = sha256Buffer(original)
  const filenameSlug = filenameSlugFromMeta(options.meta)

  const presign = await api.presignMedia({
    sha256,
    byte_size: original.byteLength,
    mime: 'image/jpeg',
    source_url: sourceUrl,
    product_ref: options.productRef,
    role: options.role,
    sort_order: options.sortOrder,
    filename_slug: filenameSlug,
    force: options.force,
  })

  if (presign.already_exists && !options.force) {
    return presign.media_id
  }

  const webp = await normalizeProductImage(original, options.meta)

  await s3.send(
    new PutObjectCommand({
      Bucket: env.STORAGE_BUCKET,
      Key: presign.storage_key,
      Body: webp,
      ContentType: 'image/webp',
      ACL: 'public-read',
      Metadata: {
        brand: 'D.JOB',
        title: asciiHeader(options.meta?.title || 'D.JOB'),
        reference: asciiHeader(options.meta?.reference || '', 64),
      },
    })
  )

  await api.completeMedia({ media_id: presign.media_id, sha256 })
  logger.info(
    `mídia ${presign.media_id}${options.force ? ' (reprocessada)' : ''} → ${presign.cdn_url}`
  )
  return presign.media_id
}
