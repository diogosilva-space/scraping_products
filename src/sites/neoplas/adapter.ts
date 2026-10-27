import * as cheerio from 'cheerio'
import { normalizeSourceCategories } from '../../core/categories.js'
import type { CanonicalProduct, SiteAdapter } from '../../core/types.js'
import { logger } from '../../core/logger.js'

type WooVariation = {
  attributes?: Record<string, string>
  sku?: string
  image?: { url?: string; src?: string; full_src?: string }
  is_in_stock?: boolean
  display_price?: number
}

function abs(url: string): string {
  if (url.startsWith('http')) return url
  return `https://neoplas.com.br${url.startsWith('/') ? '' : '/'}${url}`
}

/** Remove prefixos de catálogo tipo "00 – ", "00-", "01 - ", "02 ". */
export function stripNeoplasTitlePrefix(name: string): string {
  const trimmed = name.trim()
  const withoutDash = trimmed.replace(/^\d{1,3}\s*[-–—]\s*/, '').trim()
  const withoutBare = withoutDash.replace(/^\d{1,3}\s+(?=[A-Za-zÀ-ÿ])/, '').trim()
  return withoutBare || trimmed
}

export class NeoplasAdapter implements SiteAdapter {
  id = 'neoplas' as const
  supplierCode = 'NEO' as const

  async discover(options?: { limit?: number }): Promise<string[]> {
    const categories = [
      'https://neoplas.com.br/categoria/copos/',
      'https://neoplas.com.br/categoria/tacas/',
      'https://neoplas.com.br/categoria/squeezes/',
      'https://neoplas.com.br/categoria/baldes/',
      'https://neoplas.com.br/categoria/canecas/',
      'https://neoplas.com.br/loja/',
    ]
    const links = new Set<string>()
    for (const cat of categories) {
      let page = 1
      while (page <= 20) {
        const url = page === 1 ? cat : `${cat}page/${page}/`
        const res = await fetch(url)
        if (!res.ok) break
        const html = await res.text()
        const $ = cheerio.load(html)
        $('a[href*="/produto/"]').each((_, el) => {
          const href = $(el).attr('href')
          if (href && href.includes('/produto/')) links.add(href.split('?')[0]!)
        })
        const hasNext = $('.next.page-numbers, a.next').length > 0
        if (!hasNext || (options?.limit && links.size >= options.limit)) break
        page += 1
      }
      if (options?.limit && links.size >= options.limit) break
    }
    const list = [...links]
    logger.info(`Neoplas discover: ${list.length}`)
    return options?.limit ? list.slice(0, options.limit) : list
  }

  async extract(url: string): Promise<CanonicalProduct> {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`Neoplas HTTP ${res.status}: ${url}`)
    const html = await res.text()
    const $ = cheerio.load(html)

    const rawName = $('h1.product_title, h1').first().text().trim()
    const name = stripNeoplasTitlePrefix(rawName)
    const form = $('form.variations_form, form.cart').first()
    const bodyClass = $('body').attr('class') || ''
    const postIdMatch = bodyClass.match(/postid-(\d+)/)
    const parentId =
      form.attr('data-product_id') ||
      $('input[name="product_id"]').attr('value') ||
      $('.product').first().attr('data-product_id') ||
      postIdMatch?.[1] ||
      ''

    let variations: WooVariation[] = []
    const raw = form.attr('data-product_variations')
    if (raw && raw !== 'false') {
      try {
        variations = JSON.parse(raw) as WooVariation[]
      } catch {
        variations = []
      }
    }

    // Somente galeria do PDP (não produtos relacionados / "mais desta sessão")
    const gallery = [
      ...new Set(
        $('.woocommerce-product-gallery')
          .first()
          .find('img')
          .toArray()
          .map(
            el =>
              $(el).attr('data-large_image') ||
              $(el).attr('data-src') ||
              $(el).attr('src') ||
              ''
          )
          .filter(Boolean)
          .map(abs)
      ),
    ]

    const shortDescription =
      $('.product-short-description, .woocommerce-product-details__short-description')
        .first()
        .text()
        .trim() || ''
    const longDescription =
      $('#tab-description').text().trim() ||
      $('.woocommerce-Tabs-panel--description').text().trim() ||
      ''
    const descriptionParts = [shortDescription, longDescription].filter(Boolean)
    const description = descriptionParts.length
      ? [...new Set(descriptionParts)].join('\n\n')
      : null

    const cats = normalizeSourceCategories(
      $('.product_meta .posted_in a, .summary .posted_in a')
        .toArray()
        .map(el => $(el).text().trim())
        .filter(Boolean)
    )

    if (!parentId) throw new Error(`Neoplas sem product_id: ${url}`)
    if (!gallery.length && !variations.length) {
      throw new Error(`Neoplas sem imagens: ${url}`)
    }

    const identityKeyCounts = new Map<string, number>()
    const supplierSkuCounts = new Map<string, number>()
    const variants = variations.map((v, idx) => {
      const attr = Object.values(v.attributes || {})[0] || `cor-${idx}`
      const sourceSku = v.sku || `${parentId}-${idx}`
      const img = v.image?.full_src || v.image?.url || v.image?.src || null
      const baseIdentityKey = `sku:${sourceSku}`
      const occurrence = (identityKeyCounts.get(baseIdentityKey) ?? 0) + 1
      identityKeyCounts.set(baseIdentityKey, occurrence)
      const skuOccurrence = (supplierSkuCounts.get(sourceSku) ?? 0) + 1
      supplierSkuCounts.set(sourceSku, skuOccurrence)
      const supplierSku =
        skuOccurrence === 1 ? sourceSku : `${sourceSku}-variant-${idx}`
      return {
        // Alguns produtos da Neoplas repetem o mesmo SKU em mais de uma
        // variação. A API exige identity_key único dentro do produto.
        identity_key:
          occurrence === 1 ? baseIdentityKey : `${baseIdentityKey}:variant-${idx}`,
        supplier_sku: supplierSku,
        name: String(attr),
        type: (img ? 'image' : 'named') as 'image' | 'named',
        source_sku: sourceSku,
        sort_order: idx,
        in_stock: v.is_in_stock ?? null,
        source_swatch_url: img ? abs(img) : null,
      }
    })

    const variationUrls = new Set(
      variants.map(v => v.source_swatch_url).filter((u): u is string => Boolean(u))
    )
    // Galeria = fotos do produto; cores das variações ficam em variants
    let galleryOnly = gallery.filter(src => !variationUrls.has(src))
    if (!galleryOnly.length && gallery.length) galleryOnly = [gallery[0]!]
    if (!galleryOnly.length) {
      galleryOnly = variants.map(v => v.source_swatch_url!).filter(Boolean).slice(0, 1)
    }

    return {
      supplier_code: 'NEO',
      parent_supplier_sku: parentId,
      internal_reference: `NE-${parentId}`,
      name,
      description,
      source_url: url,
      pricing_mode: 'quote',
      source_categories: cats,
      images: galleryOnly.map((source_url, sort_order) => ({
        source_url,
        role: 'gallery' as const,
        sort_order,
      })),
      prices: [],
      variants,
      raw_payload: { parentId, variationsCount: variations.length, rawName },
    }
  }
}
