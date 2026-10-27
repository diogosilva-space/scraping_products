import path from 'node:path'
import { fileURLToPath } from 'node:url'
import * as cheerio from 'cheerio'
import {
  normalizeSourceCategories,
  normalizeSourceCategory,
} from '../../core/categories.js'
import { env } from '../../core/env.js'
import { logger } from '../../core/logger.js'
import { BrowserPool } from '../../engine/browser.js'
import type { CanonicalProduct, SiteAdapter, CanonicalVariant } from '../../core/types.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function absUrl(href: string): string {
  if (href.startsWith('http')) return href
  return `https://www.spotgifts.com.br${href.startsWith('/') ? '' : '/'}${href}`
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Spot titles are almost always "LINHA. Descrição do produto"
 * (e.g. "TURIM II. Mochila em poliéster...", "GIFT BAG M. Sacola média...").
 * Strip the line/model prefix when it looks like a short brand code, not a sentence.
 */
function normalizeName(raw: string): string {
  const trimmed = raw.trim()
  const m = trimmed.match(/^(.+?)\.\s+(.+)$/)
  if (!m) return trimmed

  const before = m[1].trim()
  const after = m[2].trim()
  if (after.length < 8) return trimmed

  const words = before.split(/\s+/).filter(Boolean)
  const looksLikeLinePrefix =
    before.length <= 45 &&
    words.length >= 1 &&
    words.length <= 5 &&
    !/[,;:]/.test(before) &&
    words.every(w => w.length <= 16)

  if (!looksLikeLinePrefix) return trimmed
  return after
}

/**
 * URL PDP: /pt/catalogo/{categoria}/{ref}/
 * Ex.: .../pt/catalogo/squeezes/94690/ → "squeezes"
 */
export function categoryFromSpotUrl(url: string): string | null {
  try {
    const parts = new URL(absUrl(url)).pathname.split('/').filter(Boolean)
    const catalogoIdx = parts.findIndex(p => p.toLowerCase() === 'catalogo')
    if (catalogoIdx < 0) return null

    const catSlug = parts[catalogoIdx + 1]
    const productSeg = parts[catalogoIdx + 2]
    if (!catSlug || !productSeg) return null
    // slug numérico = não é categoria
    if (/^\d+$/.test(catSlug)) return null

    const label = normalizeSourceCategory(
      decodeURIComponent(catSlug).replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim()
    )
    return label || null
  } catch {
    return null
  }
}

/** Preferir versão HD (_1) e evitar thumbs/catalogos da página. */
function pickSpotGalleryImages(srcs: string[]): string[] {
  const produtos = srcs.filter(s => s.includes('/fotos/produtos/'))
  const byKey = new Map<string, { url: string; score: number }>()
  for (const src of produtos) {
    const file = src.split('/').pop() || src
    const key = file.replace(/_1(?=\.[a-z0-9]+$)/i, '')
    const score = /_1\.[a-z0-9]+$/i.test(file) ? 2 : 1
    const prev = byKey.get(key)
    if (!prev || score > prev.score) byKey.set(key, { url: src, score })
  }
  return [...byKey.values()].map(v => v.url)
}

/**
 * Na Spot, alguns produtos (especialmente agendas) começam com uma foto
 * técnica/aberta e trazem depois a composição comercial com sufixo `_set`.
 * Para esses casos, `_set_1` é a imagem de capa desejada no catálogo D.JOB.
 */
function pickSpotFeaturedImage(gallery: string[]): string | null {
  return (
    gallery.find(src => /_set(?:_\d+)?\.[a-z0-9]+$/i.test(src.split('/').pop() || '')) ||
    gallery[0] ||
    null
  )
}

/**
 * Filename Spot: {sku}_{colorCode}[-sufixo]_{n}.ext
 * Ex.: 94690_103_1.jpg, 94690_137-logo_1.jpg, 93640_160-b_2.jpg
 */
export function matchSpotImageVariantKey(
  imageUrl: string,
  sku: string,
  variants: Array<{ identity_key: string; code?: string | null }>
): string | null {
  const file = (imageUrl.split('/').pop() || '').toLowerCase()
  const skuLower = sku.toLowerCase()
  if (!file.startsWith(`${skuLower}_`)) return null

  const ranked = variants
    .filter(v => v.code?.trim())
    .map(v => ({ identity_key: v.identity_key, code: v.code!.trim().toLowerCase() }))
    .sort((a, b) => b.code.length - a.code.length)

  for (const v of ranked) {
    const re = new RegExp(
      `^${escapeRegExp(skuLower)}_${escapeRegExp(v.code)}(?:-[a-z0-9]+)?_\\d+\\.`,
      'i'
    )
    if (re.test(file)) return v.identity_key
  }
  return null
}

export class SpotAdapter implements SiteAdapter {
  id = 'spot' as const
  supplierCode = 'SPOT' as const
  private pool = new BrowserPool(path.join(__dirname, '../../../.browser-state/spot.json'))
  private loggedIn = false

  private async ensureLogin() {
    if (this.loggedIn) return
    if (!env.SPOTGIFTS_EMAIL || !env.SPOTGIFTS_PASSWORD) {
      throw new Error('SPOTGIFTS_EMAIL/PASSWORD obrigatórios no .env')
    }

    const page = await this.pool.newPage()
    try {
      await page.goto('https://www.spotgifts.com.br/pt/area-reservada/login/', {
        waitUntil: 'domcontentloaded',
        timeout: 60000,
      })

      const already =
        (await page.locator('a[href*="logout"], .logout').count()) +
        (await page.getByText('Sair', { exact: true }).count())
      const loginForm = page.locator('input#fld_login, input[name="login"], input[type="email"]').first()
      const formVisible = await loginForm.isVisible().catch(() => false)

      if (already > 0 || !formVisible) {
        this.loggedIn = true
        logger.info('Spot: sessão já autenticada')
        return
      }

      await loginForm.fill(env.SPOTGIFTS_EMAIL)
      await page
        .locator('input#fld_pwd, input[name="password"], input[type="password"]')
        .first()
        .fill(env.SPOTGIFTS_PASSWORD)
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => null),
        page.locator('input[type="submit"], button[type="submit"]').first().click(),
      ])
      await this.pool.saveState()
      this.loggedIn = true
      logger.success('Spot: login OK')
    } finally {
      await page.close()
    }
  }

  async discover(options?: { limit?: number }): Promise<string[]> {
    await this.ensureLogin()
    const page = await this.pool.newPage()
    const links = new Set<string>()
    try {
      await page.goto('https://www.spotgifts.com.br/pt/catalogo/', {
        waitUntil: 'domcontentloaded',
        timeout: 60000,
      })

      // O catálogo carrega os produtos por AJAX/infinite scroll. Em alguns
      // momentos a lista fica temporariamente estável enquanto a próxima
      // página ainda está sendo buscada; por isso não devemos parar após
      // apenas três ciclos sem novidades.
      let stable = 0
      let lastCount = 0
      let declaredTotal: number | null = null
      const maxScrolls = 300

      await page.waitForTimeout(1500)

      for (let i = 0; i < maxScrolls; i++) {
        const hrefs = await page.$$eval('a.produto.fav-container', els =>
          els.map(el => (el as HTMLAnchorElement).href).filter(Boolean)
        )
        for (const h of hrefs) links.add(h)

        if (options?.limit && links.size >= options.limit) break

        const totalAttr = await page
          .$eval('#produtos-wrap', el => el.getAttribute('data-total'))
          .catch(() => null)
        const parsedTotal = Number(totalAttr)
        if (Number.isFinite(parsedTotal) && parsedTotal > 0) {
          declaredTotal = parsedTotal
        }

        if (declaredTotal && links.size >= declaredTotal) break

        await page.evaluate(() => {
          window.scrollTo({
            top: document.body.scrollHeight,
            behavior: 'auto',
          })
        })
        await page.waitForTimeout(1500)

        if (links.size === lastCount) {
          stable += 1
          // Só encerramos depois de vários ciclos estáveis e apenas quando
          // não existe um total declarado maior do que o que foi encontrado.
          if (stable >= 8 && (!declaredTotal || links.size >= declaredTotal)) {
            break
          }
        } else {
          stable = 0
          lastCount = links.size
        }
      }

      const list = [...links]
      logger.info(
        `Spot discover: ${list.length} URLs` +
          (declaredTotal ? ` (total declarado: ${declaredTotal})` : '')
      )
      return options?.limit ? list.slice(0, options.limit) : list
    } finally {
      await page.close()
    }
  }

  async extract(url: string): Promise<CanonicalProduct> {
    await this.ensureLogin()
    const page = await this.pool.newPage()
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 })
      const html = await page.content()
      const $ = cheerio.load(html)

      const ref =
        $('#produto-detalhe .ref').first().text().trim() ||
        $('.ref').first().text().trim()
      const nome =
        $('#produto-detalhe h1.titulo').first().text().trim() ||
        $('h1.titulo').first().text().trim() ||
        $('h1').first().text().trim()
      const descricao =
        $('#produto-detalhe .texto').first().text().trim() ||
        $('.texto').first().text().trim()

      const colors = $('#produto-detalhe .color, .color')
        .toArray()
        .map((el, idx) => {
          const $el = $(el)
          const span = $el.find('span').first()
          const style = span.attr('style') || $el.attr('style') || ''
          const hexMatch = style.match(/#([0-9A-Fa-f]{6})/)
          const bgImage = style.match(/url\(["']?(.*?)["']?\)/)
          return {
            title: $el.attr('title') || '',
            code: $el.text().trim(),
            hex: hexMatch ? `#${hexMatch[1]}` : null,
            swatchUrl: bgImage?.[1] || null,
            sort: idx,
          }
        })

      // Seletor legado: galeria HD do produto (não thumbs / catálogos laterais)
      const galleryCandidates = $('.img-wrap.center > span > span > img')
        .toArray()
        .map(el => {
          const $el = $(el)
          const src = $el.attr('src') || $el.attr('data-src') || ''
          return { src }
        })
        .filter(({ src }) => src && !src.includes('data:'))

      const imgs = pickSpotGalleryImages(galleryCandidates.map(({ src }) => src))
      // Regra observada no HTML da Spot: o primeiro .overimage da galeria é
      // a foto exibida em destaque. O pipeline usa sort_order=0 como capa.
      const featuredImage = pickSpotFeaturedImage(imgs)
      if (featuredImage) {
        const featuredIndex = imgs.indexOf(featuredImage)
        if (featuredIndex > 0) {
          imgs.splice(featuredIndex, 1)
          imgs.unshift(featuredImage)
        }
      }

      const priceCells = $('.tabela-precos tbody td:nth-child(2)')
        .toArray()
        .map(el => $(el).text() || '')
        .map(t => t.replace(/[^\d,.-]/g, '').replace(',', '.'))
        .map(Number)
        .filter(n => Number.isFinite(n) && n > 0)

      // Preferir categoria do path; GA só como fallback
      let gaCategory: string | null = null
      $('script').each((_, el) => {
        const text = $(el).html() || ''
        const m = text.match(/var arrItems = (\[[\s\S]*?\]);/)
        if (m?.[1]) {
          try {
            const arr = JSON.parse(m[1]) as Array<{ item_category2?: string }>
            gaCategory = arr[0]?.item_category2 || null
          } catch {
            // ignore
          }
          return false
        }
      })

      if (!ref) {
        throw new Error(`Spot PDP sem referência: ${url}`)
      }
      if (!priceCells.length) {
        throw new Error(`Spot sem preço após login (PRICE_EXPECTED): ${url}`)
      }
      if (!imgs.length) {
        throw new Error(`Spot sem imagens: ${url}`)
      }

      const sku = ref.replace(/^SP-?/i, '').trim()
      const categoryFromUrl = categoryFromSpotUrl(url)
      const source_categories = normalizeSourceCategories(
        categoryFromUrl ? [categoryFromUrl] : gaCategory ? [gaCategory] : []
      )

      const variants: CanonicalVariant[] = colors.map((c, idx) => {
        const hex = c.hex ? c.hex.toUpperCase() : null
        const code = c.code?.trim() || null
        const identity = code
          ? `code:${code}`
          : hex
            ? `hex:${hex}`
            : `name:${(c.title || `cor-${idx}`).toLowerCase().replace(/\s+/g, '-')}`
        return {
          identity_key: identity,
          supplier_sku: code ? `${sku}-${code}` : null,
          name: c.title || null,
          type: hex ? 'hex' : c.swatchUrl ? 'image' : 'named',
          hex,
          code,
          sort_order: idx,
          source_swatch_url: c.swatchUrl ? absUrl(c.swatchUrl) : null,
        }
      })

      const images = imgs.map((src, sort_order) => {
        const source_url = absUrl(src)
        return {
          source_url,
          role: 'gallery' as const,
          sort_order,
          variant_identity_key: matchSpotImageVariantKey(source_url, sku, variants),
        }
      })

      return {
        supplier_code: 'SPOT',
        parent_supplier_sku: sku,
        internal_reference: `SP-${sku}`,
        name: normalizeName(nome),
        description: descricao || null,
        source_url: absUrl(url),
        pricing_mode: 'public',
        source_categories,
        images,
        prices: [
          {
            min_qty: 1,
            max_qty: null,
            amount: Math.min(...priceCells),
            currency: 'BRL' as const,
          },
        ],
        variants,
        raw_payload: {
          spot: {
            ref,
            nome,
            colors: colors.length,
            imgs: imgs.length,
            categoryFromUrl,
            gaCategory,
            featuredImage: featuredImage ? absUrl(featuredImage) : null,
            featuredImageRule: 'image ending in _set when available, otherwise first gallery image',
            imagesLinked: images.filter(i => i.variant_identity_key).length,
          },
        },
      }
    } finally {
      await page.close()
    }
  }

  async dispose() {
    await this.pool.dispose()
  }

  async getCookieHeader() {
    return this.pool.cookieHeader()
  }
}
