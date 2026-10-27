import path from 'node:path'
import { fileURLToPath } from 'node:url'
import * as cheerio from 'cheerio'
import {
  categoryLabelFromPath,
  normalizeSourceCategories,
  normalizeSourceCategory,
} from '../../core/categories.js'
import { BrowserPool } from '../../engine/browser.js'
import { logger } from '../../core/logger.js'
import type { CanonicalProduct, SiteAdapter } from '../../core/types.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function abs(url: string): string {
  if (url.startsWith('http')) return url
  return `https://www.xbzbrindes.com.br${url.startsWith('/') ? '' : '/'}${url}`
}

function isXbzProductUrl(href: string): boolean {
  try {
    const u = new URL(href)
    if (!u.hostname.includes('xbzbrindes.com.br')) return false
    const seg = u.pathname.replace(/\/$/, '').split('/').filter(Boolean)
    if (seg.length !== 1) return false
    const s = seg[0]!
    if (
      /^(brindes|cadastro|contato|download|login|lancamentos|presentes|institucional|produtos|ponta|edicao)/i.test(
        s
      )
    ) {
      return false
    }
    return /\d{3,}/.test(s)
  } catch {
    return false
  }
}

function pathBasename(url: string): string {
  try {
    return new URL(url).pathname.split('/').pop() || 'swatch'
  } catch {
    return 'swatch'
  }
}

/**
 * O XBZ repete `.produto-nome` nos cards de "Compre Junto" e nos produtos
 * relacionados. O primeiro elemento da página pode ser um item sugerido,
 * portanto o nome precisa ser procurado dentro da PDP principal.
 */
export function extractXbzProductName($: cheerio.CheerioAPI): string | null {
  const main = $('#detalhe_produto_ p.produto-nome, #detalhe_produto_ .produto-nome')
    .toArray()
    .filter(el => !$(el).closest('#swiper-comprejunto, #swiper-comprejuntomobile').length)
    .map(el => $(el).text().trim())
    .find(Boolean)
  return main || null
}

/** Texto de descrição + specs do .caracs (sem "Veja mais" / relacionados). */
function extractXbzDescription($: cheerio.CheerioAPI): string | null {
  const lines = $('.caracs .desc')
    .toArray()
    .map(el => $(el).text().replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .filter(t => !/veja mais/i.test(t))

  if (!lines.length) return null

  const prose = lines
    .filter(t => /^descri/i.test(t))
    .map(t => t.replace(/^descri[cç][aã]o\s*:\s*/i, '').trim())
    .filter(Boolean)

  const specs = lines.filter(t => !/^descri/i.test(t) && /:/.test(t))

  const parts = [...prose, ...specs]
  return parts.length ? parts.join('\n\n') : null
}

/**
 * Categoria primária na PDP: primeiro link top-level do bloco "Veja mais"
 * (não acumula relacionados / sazonais / subcategorias).
 */
function extractXbzPrimaryPdpCategory($: cheerio.CheerioAPI): string[] {
  const tit = $('p.desc-tit')
    .toArray()
    .find(el => /veja mais/i.test($(el).text()))
  if (!tit) return []

  const sub = $(tit).nextAll('p.desc-sub').first()
  if (!sub.length) return []

  const cats: string[] = []
  sub.find('a[href*="/brindes/"]').each((_, el) => {
    if (cats.length) return false
    const href = $(el).attr('href') || ''
    const text = $(el).text().replace(/\u00a0/g, ' ').trim()
    if (!text || /\*|outubro|ver[aã]o|lan[cç]amento/i.test(text)) return
    try {
      const path = new URL(href, 'https://www.xbzbrindes.com.br').pathname
      const parts = path.split('/').filter(Boolean)
      if (parts.length !== 2 || parts[0]!.toLowerCase() !== 'brindes') return
      const label = normalizeSourceCategory(categoryLabelFromPath(href) || text)
      if (label) cats.push(label)
    } catch {
      /* ignore */
    }
    return
  })
  return cats
}

export class XbzAdapter implements SiteAdapter {
  id = 'xbz' as const
  supplierCode = 'XBZ' as const
  private pool = new BrowserPool(path.join(__dirname, '../../../.browser-state/xbz.json'))
  /** Categoria da listagem /brindes/{cat} → URLs de PDP (só a 1ª). */
  private categoriesByUrl = new Map<string, Set<string>>()

  private rememberCategory(productUrl: string, category: string) {
    const key = productUrl.split('?')[0]!
    const label = normalizeSourceCategory(category)
    if (!label) return
    // Só a 1ª listagem — acumular várias vitrines poluía o produto.
    if (this.categoriesByUrl.has(key)) return
    this.categoriesByUrl.set(key, new Set([label]))
  }

  private categoriesFor(url: string): string[] {
    return [...(this.categoriesByUrl.get(url.split('?')[0]!) || [])]
  }

  async discover(options?: { limit?: number }): Promise<string[]> {
    const page = await this.pool.newPage()
    const links = new Set<string>()
    try {
      await page.goto('https://www.xbzbrindes.com.br/brindes', {
        waitUntil: 'domcontentloaded',
        timeout: 90000,
      })
      await page.waitForTimeout(2000)

      const categoryHrefs = await page.$$eval('a[href*="/brindes/"]', els =>
        els.map(a => (a as HTMLAnchorElement).href)
      )

      const cats = [...new Set(categoryHrefs)].slice(0, 40)
      for (const cat of cats) {
        const catLabel =
          normalizeSourceCategory(categoryLabelFromPath(cat)) ||
          normalizeSourceCategory(cat.split('/brindes/')[1] || '')
        if (!catLabel || /\*|outubro|ver[aã]o/i.test(catLabel)) continue

        await page.goto(cat, { waitUntil: 'domcontentloaded', timeout: 60000 })
        await page.waitForTimeout(800)
        const productLinks = await page.$$eval('a[href]', els =>
          els.map(a => (a as HTMLAnchorElement).href)
        )
        for (const h of productLinks) {
          if (!isXbzProductUrl(h)) continue
          const clean = h.split('?')[0]!
          const already = links.has(clean)
          const room = !options?.limit || links.size < options.limit
          if (already || room) {
            links.add(clean)
            this.rememberCategory(clean, catLabel)
          }
        }
        if (options?.limit && links.size >= options.limit) break
      }

      const list = [...links]
      logger.info(`XBZ discover: ${list.length}`)
      return options?.limit ? list.slice(0, options.limit) : list
    } finally {
      await page.close()
    }
  }

  async extract(url: string): Promise<CanonicalProduct> {
    const page = await this.pool.newPage()
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 })
      await page.waitForTimeout(1000)
      const $ = cheerio.load(await page.content())

      const ref = $('h1').first().text().trim()
      const name = extractXbzProductName($)
      if (!name) throw new Error(`XBZ sem nome comercial no detalhe principal: ${url}`)
      const description = extractXbzDescription($)

      const imgs = [
        ...new Set(
          $('img.js-detalheimg')
            .toArray()
            .map(el => $(el).attr('src') || $(el).attr('data-src') || '')
            .filter(src => src.includes('/img/produtos/'))
            .filter(src => !/\/360\.(jpe?g|png|gif|webp)$/i.test(src))
            .map(abs)
        ),
      ]

      const colors = $('img.imagem_cor, img.cor')
        .toArray()
        .map((el, idx) => ({
          src: abs($(el).attr('src') || ''),
          alt: $(el).attr('alt') || $(el).attr('title') || `cor-${idx}`,
          sort: idx,
        }))
        .filter(c => c.src && c.src.includes('/img/'))

      const sku = ref.replace(/^XB-?/i, '').trim()
      if (!sku) throw new Error(`XBZ sem código: ${url}`)
      if (!imgs.length) throw new Error(`XBZ sem imagens: ${url}`)

      // PDP (categoria primária) > listagem (1ª)
      const pdpCats = extractXbzPrimaryPdpCategory($)
      const listingCats = this.categoriesFor(url)
      const source_categories = normalizeSourceCategories(
        pdpCats.length ? pdpCats : listingCats
      )

      return {
        supplier_code: 'XBZ',
        parent_supplier_sku: sku,
        internal_reference: `XB-${sku}`,
        name,
        description,
        source_url: abs(url),
        pricing_mode: 'login_required',
        source_categories,
        images: imgs.map((source_url, sort_order) => ({
          source_url,
          role: 'gallery' as const,
          sort_order,
        })),
        prices: [],
        variants: colors.map((c, idx) => ({
          identity_key: `img:${pathBasename(c.src)}`,
          name: c.alt,
          type: 'image' as const,
          sort_order: idx,
          source_swatch_url: c.src,
        })),
      }
    } finally {
      await page.close()
    }
  }

  async dispose() {
    await this.pool.dispose()
  }
}
