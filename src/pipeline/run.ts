import pLimit from 'p-limit'
import { DjobApiClient } from '../clients/djob-api.js'
import { contentFingerprint } from '../core/fingerprint.js'
import { logger } from '../core/logger.js'
import type { CanonicalProduct, SiteAdapter } from '../core/types.js'
import { ingestSourceImage } from '../media/pipeline.js'
import { SpotAdapter } from '../sites/spot/adapter.js'
import { NeoplasAdapter } from '../sites/neoplas/adapter.js'
import { SomarcasAdapter } from '../sites/somarcas/adapter.js'
import { XbzAdapter } from '../sites/xbz/adapter.js'

export type RunOptions = {
  site: 'spot' | 'xbz' | 'somarcas' | 'neoplas'
  limit?: number
  concurrency?: number
  force?: boolean
  /** Se informado, discover ainda roda (mapa de categorias) e só estas URLs são extraídas. */
  urls?: string[]
}

function createAdapter(site: RunOptions['site']): SiteAdapter {
  switch (site) {
    case 'spot':
      return new SpotAdapter()
    case 'neoplas':
      return new NeoplasAdapter()
    case 'somarcas':
      return new SomarcasAdapter()
    case 'xbz':
      return new XbzAdapter()
    default:
      throw new Error(`Site desconhecido: ${site}`)
  }
}

/** Produtos sem descrição útil ou sem imagem de galeria não entram no catálogo. */
export function assertPublishableProduct(product: CanonicalProduct): void {
  const description = product.description?.trim() ?? ''
  if (!description) {
    throw new Error(`Descartado (sem descrição): ${product.internal_reference}`)
  }
  const hasGallery = product.images.some(
    img => img.role === 'gallery' && Boolean(img.source_url?.trim())
  )
  if (!hasGallery) {
    throw new Error(`Descartado (sem imagem): ${product.internal_reference}`)
  }
}

export async function publishProduct(
  api: DjobApiClient,
  product: CanonicalProduct,
  cookieHeader?: string,
  options?: { forceMedia?: boolean; forceProduct?: boolean }
) {
  assertPublishableProduct(product)

  const mediaIdBySource = new Map<string, number>()
  const productRef = product.internal_reference
  const baseMeta = {
    title: product.name,
    description: product.description ?? undefined,
    reference: product.internal_reference,
  }

  for (const img of product.images) {
    if (mediaIdBySource.has(img.source_url)) continue
    const id = await ingestSourceImage(api, img.source_url, {
      cookieHeader,
      force: options?.forceMedia,
      productRef,
      role: img.role === '360' ? '360' : 'gallery',
      sortOrder: img.sort_order,
      meta: baseMeta,
    })
    mediaIdBySource.set(img.source_url, id)
  }

  for (const variant of product.variants ?? []) {
    if (!variant.source_swatch_url) continue
    if (mediaIdBySource.has(variant.source_swatch_url)) continue
    const id = await ingestSourceImage(api, variant.source_swatch_url, {
      cookieHeader,
      force: options?.forceMedia,
      productRef,
      role: 'color',
      sortOrder: variant.sort_order,
      meta: {
        ...baseMeta,
        title: variant.name
          ? `${product.name} — ${variant.name}`
          : product.name,
      },
    })
    mediaIdBySource.set(variant.source_swatch_url, id)
  }

  const images = [
    ...product.images.map(img => ({
      media_id: mediaIdBySource.get(img.source_url)!,
      role: img.role,
      sort_order: img.sort_order,
      variant_identity_key: img.variant_identity_key ?? null,
    })),
  ]

  for (const variant of product.variants ?? []) {
    if (!variant.source_swatch_url) continue
    images.push({
      media_id: mediaIdBySource.get(variant.source_swatch_url)!,
      role: 'color',
      sort_order: variant.sort_order,
      variant_identity_key: variant.identity_key,
    })
  }

  const dedupedImages = []
  const seen = new Set<string>()
  for (const img of images) {
    const key = `${img.media_id}:${img.role}:${img.variant_identity_key ?? ''}`
    if (seen.has(key)) continue
    seen.add(key)
    dedupedImages.push(img)
  }

  const body = {
    supplier_code: product.supplier_code,
    parent_supplier_sku: product.parent_supplier_sku,
    internal_reference: product.internal_reference,
    name: product.name,
    description: product.description ?? null,
    additional_info: product.additional_info ?? null,
    source_url: product.source_url,
    pricing_mode: product.pricing_mode,
    content_fingerprint: contentFingerprint(product),
    stock_qty: product.stock_qty ?? null,
    stock_future_qty: product.stock_future_qty ?? null,
    in_stock: product.in_stock ?? null,
    material: product.material ?? null,
    capacity: product.capacity ?? null,
    weight_grams: product.weight_grams ?? null,
    dimensions: product.dimensions ?? null,
    packaging: product.packaging ?? null,
    video_url: product.video_url ?? null,
    source_categories: product.source_categories ?? [],
    attributes: product.attributes ?? [],
    images: dedupedImages,
    prices: product.prices ?? [],
    variants: (product.variants ?? []).map(v => ({
      identity_key: v.identity_key,
      supplier_sku: v.supplier_sku ?? null,
      name: v.name,
      type: v.type,
      hex: v.hex ?? null,
      code: v.code ?? null,
      source_sku: v.source_sku ?? null,
      sort_order: v.sort_order,
      stock_qty: v.stock_qty ?? null,
      in_stock: v.in_stock ?? null,
    })),
    raw_payload: product.raw_payload ?? {},
    force: options?.forceProduct ?? false,
  }

  return api.putProduct(body)
}

export async function runScrape(options: RunOptions) {
  const adapter = createAdapter(options.site)
  const api = new DjobApiClient()
  await api.login()

  // Discover monta categoriesByUrl. Com --urls: SOMA ainda precisa do mapa;
  // XBZ lê categorias da própria PDP.
  let urls: string[]
  if (options.urls?.length) {
    if (options.site === 'somarcas') {
      await adapter.discover({})
    }
    urls = options.urls
  } else {
    urls = await adapter.discover({ limit: options.limit })
  }
  logger.info(`${options.site}: ${urls.length} PDPs para extrair`)

  const limit = pLimit(options.concurrency ?? 2)
  let ok = 0
  let fail = 0
  let skipped = 0

  await Promise.all(
    urls.map((url, index) =>
      limit(async () => {
        try {
          const product = await adapter.extract(url)
          try {
            assertPublishableProduct(product)
          } catch (discard) {
            skipped += 1
            logger.warn(
              `[${index + 1}/${urls.length}] ${discard instanceof Error ? discard.message : discard}`
            )
            return
          }
          const cookieHeader =
            adapter instanceof SpotAdapter ? await adapter.getCookieHeader() : undefined
          const result = await publishProduct(api, product, cookieHeader, {
            forceMedia: options.force,
            forceProduct: options.force,
          })
          ok += 1
          logger.success(
            `[${index + 1}/${urls.length}] ${result.internal_reference} → ${result.action}`
          )
        } catch (error) {
          fail += 1
          logger.error(`[${index + 1}/${urls.length}] ${url}`, error)
        }
      })
    )
  )

  await adapter.dispose?.()
  logger.info(`Fim ${options.site}: ok=${ok} skip=${skipped} fail=${fail}`)
  return { ok, skipped, fail, total: urls.length }
}
