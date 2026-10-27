import * as cheerio from 'cheerio'
import {
  categoryLabelFromPath,
  normalizeSourceCategories,
  normalizeSourceCategory,
} from '../../core/categories.js'
import type { CanonicalProduct, SiteAdapter } from '../../core/types.js'
import { logger } from '../../core/logger.js'

function abs(url: string): string {
  if (url.startsWith('http')) return url
  return `https://www.somarcas.com.br${url.startsWith('/') ? '' : '/'}${url}`
}

/** Preferência pela versão grande (/g/), sem thumbs (/p/) nem estampas. */
function pickSomarcasGallery($: cheerio.CheerioAPI): string[] {
  const candidates = $(
    '.images-product img, .block-product-gallery img, .slick-list img'
  )
    .toArray()
    .map(el => $(el).attr('src') || $(el).attr('data-src') || '')
    .filter(src => src.includes('imagens_site'))
    .filter(src => !src.includes('sem_estampa') && !src.includes('somente_logo'))
    .map(abs)

  const large = candidates.filter(src => src.includes('/g/'))
  const pool = large.length ? large : candidates.filter(src => !src.includes('/p/'))

  const byFile = new Map<string, string>()
  for (const src of pool) {
    const file = src.split('/').pop() || src
    if (!byFile.has(file)) byFile.set(file, src)
  }
  return [...byFile.values()]
}

function cleanSomarcasDescription($: cheerio.CheerioAPI): string | null {
  const heading = $('h4')
    .toArray()
    .find(el => /descri[cç][aã]o do produto/i.test($(el).text()))
  if (heading) {
    const nextP = $(heading).nextAll('p').first().text().trim()
    if (nextP) return nextP
  }
  const block = $('.description')
    .toArray()
    .map(el => $(el))
    .find($el => /descri[cç][aã]o do produto/i.test($el.find('h4').text()))
  if (!block) return null
  return block.find('p').first().text().trim() || null
}

type SomarcasApiProduct = {
  codigo?: string
  nome?: string
  imagem?: string
  url_produto?: string
}

type SomarcasCategorySeed = {
  id: string
  url: string
  label: string
}

async function fetchSomarcasCategoryProducts(categoryId: string): Promise<SomarcasApiProduct[]> {
  const res = await fetch('https://www.somarcas.com.br/API_V1_General.php?modulo=buscar_produtos', {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify({
      colecoes: [],
      categorias: [categoryId],
      termo: '',
      precoI: 0,
      precoF: 0,
      estoqueI: 0,
    }),
  })
  if (!res.ok) throw new Error(`Somarcas API HTTP ${res.status}: categoria ${categoryId}`)
  const data = (await res.json()) as {
    produtos?: { produto?: SomarcasApiProduct[] | SomarcasApiProduct }
  }
  const products = data?.produtos?.produto
  if (!products) return []
  return Array.isArray(products) ? products : [products]
}

const FALLBACK_SOMARCAS_CATEGORY_SEEDS = [
  'https://www.somarcas.com.br/176/categorias/copos-personalizados',
  'https://www.somarcas.com.br/170/categorias/caneca-personalizada',
  'https://www.somarcas.com.br/179/categorias/garrafa-personalizada',
  'https://www.somarcas.com.br/197/categorias/tacas-personalizadas',
  'https://www.somarcas.com.br/146/categorias/churrasco',
  'https://www.somarcas.com.br/172/categorias/caneta-personalizada',
  'https://www.somarcas.com.br/168/categorias/caderneta-personalizada',
  'https://www.somarcas.com.br/169/categorias/caderno-personalizado',
  'https://www.somarcas.com.br/166/categorias/bloco-de-notas-personalizado',
  'https://www.somarcas.com.br/162/categorias/mochila-personalizada',
  'https://www.somarcas.com.br/175/categorias/chaveiro-personalizado',
  'https://www.somarcas.com.br/180/categorias/guarda-chuva-personalizado',
  'https://www.somarcas.com.br/174/categorias/carregador-portatil-personalizado',
  'https://www.somarcas.com.br/1/categorias/mochilas-malas-e-necessaires',
  'https://www.somarcas.com.br/6/categorias/escritorio',
  'https://www.somarcas.com.br/12/categorias/queijos-e-vinhos',
  'https://www.somarcas.com.br/13/categorias/bar-petisco-e-pizza',
  'https://www.somarcas.com.br/125/categorias/kits-especiais',
  'https://www.somarcas.com.br/128/categorias/bolsas-termicas-e-sacolas',
  'https://www.somarcas.com.br/15/categorias/utensilios-e-utilidades',
  'https://www.somarcas.com.br/3/categorias/copos-canecas-squeezes-e-garrafas',
  'https://www.somarcas.com.br/121/categorias/lancamentos',
]

function somarcasSeedFromUrl(url: string): SomarcasCategorySeed | null {
  const clean = abs(url.split('?')[0]!)
  const match = clean.match(/\/(\d+)\/categorias\/([^/#?]+)/)
  if (!match) return null
  const label = normalizeSourceCategory(categoryLabelFromPath(clean))
  if (!label) return null
  return { id: match[1]!, url: clean, label }
}

function somarcasCategoryPriority(seed: SomarcasCategorySeed): number {
  const slug = seed.url.split('/').pop() || ''
  if (/lan[cç]amentos|promo/i.test(seed.label)) return 4
  if (/personalizado|personalizada|personalizados|personalizadas|^kit-/i.test(slug)) {
    return 0
  }
  if (/^(1|3|6|9|12|13|14|15|121|125|128|159|160|199)$/.test(seed.id)) {
    return 3
  }
  return 1
}

async function discoverSomarcasCategorySeeds(): Promise<SomarcasCategorySeed[]> {
  const urls = new Set<string>()
  try {
    const res = await fetch('https://www.somarcas.com.br/')
    if (res.ok) {
      const html = await res.text()
      const matches = html.matchAll(
        /(?:https?:\/\/www\.somarcas\.com\.br)?\/\d+\/categorias\/[a-z0-9-]+/g
      )
      for (const match of matches) urls.add(abs(match[0]!))
    }
  } catch (err) {
    logger.warn(
      `Somarcas categorias pela home falharam, usando fallback: ${
        err instanceof Error ? err.message : String(err)
      }`
    )
  }

  for (const url of FALLBACK_SOMARCAS_CATEGORY_SEEDS) urls.add(url)

  const byId = new Map<string, SomarcasCategorySeed>()
  for (const url of urls) {
    const seed = somarcasSeedFromUrl(url)
    if (!seed) continue
    byId.set(seed.id, seed)
  }

  return [...byId.values()].sort((a, b) => {
    const priority = somarcasCategoryPriority(a) - somarcasCategoryPriority(b)
    if (priority !== 0) return priority
    return a.label.localeCompare(b.label, 'pt-BR')
  })
}

/**
 * Categoria na PDP: links /categorias/ no bloco do produto (não o menu global).
 * Preferimos slugs específicos (ex.: churrasco, caneca-personalizada).
 */
function extractSomarcasPdpCategories($: cheerio.CheerioAPI): string[] {
  const candidates: string[] = []
  // Breadcrumb / crumbs perto do produto
  $(
    '.breadcrumb a[href*="/categorias/"], .breadcrumbs a[href*="/categorias/"], .product-info a[href*="/categorias/"]'
  ).each((_, el) => {
    const href = $(el).attr('href') || ''
    const label =
      normalizeSourceCategory(categoryLabelFromPath(href)) ||
      normalizeSourceCategory($(el).text().trim())
    if (label && !/lan[cç]amentos|promo/i.test(label)) candidates.push(label)
  })

  // JSON-LD category se existir
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const data = JSON.parse($(el).html() || '')
      const cat = data?.category || data?.itemCategory
      if (typeof cat === 'string' && cat.trim()) {
        const label = normalizeSourceCategory(cat)
        if (label) candidates.push(label)
      }
    } catch {
      /* ignore */
    }
  })

  return [...new Set(candidates)]
}

export class SomarcasAdapter implements SiteAdapter {
  id = 'somarcas' as const
  supplierCode = 'SOMA' as const
  /** Categoria da listagem → URLs de PDP */
  private categoriesByUrl = new Map<string, Set<string>>()

  private rememberCategory(productUrl: string, category: string) {
    const key = productUrl.split('?')[0]!
    const label = normalizeSourceCategory(category)
    if (!label) return
    // Só a 1ª listagem: páginas da Só Marcas repetem produtos em blocos
    // de outras categorias; acumular gerava 6 categorias falsas por produto.
    if (this.categoriesByUrl.has(key)) return
    this.categoriesByUrl.set(key, new Set([label]))
  }

  private categoriesFor(url: string): string[] {
    return [...(this.categoriesByUrl.get(url.split('?')[0]!) || [])]
  }

  async discover(options?: { limit?: number }): Promise<string[]> {
    const seeds = await discoverSomarcasCategorySeeds()
    const productUrlByKey = new Map<string, string>()
    let rawCount = 0
    for (const seed of seeds) {
      const catLabel = seed.label

      try {
        const products = await fetchSomarcasCategoryProducts(seed.id)
        rawCount += products.length
        for (const product of products) {
          if (!product.url_produto) continue
          const clean = abs(product.url_produto.split('?')[0]!)
          const key = product.codigo?.trim() ? `code:${product.codigo.trim()}` : `url:${clean}`
          const canonicalUrl = productUrlByKey.get(key) ?? clean
          if (!productUrlByKey.has(key)) {
            productUrlByKey.set(key, clean)
          }
          if (!/lan[cç]amentos|promo/i.test(catLabel)) {
            this.rememberCategory(canonicalUrl, catLabel)
          }
        }
        continue
      } catch (err) {
        logger.warn(
          `Somarcas API categoria ${seed.id} falhou, usando HTML: ${
            err instanceof Error ? err.message : String(err)
          }`
        )
      }

      const res = await fetch(seed.url)
      if (!res.ok) continue
      const $ = cheerio.load(await res.text())
      $('a[href*="/produto/"]').each((_, el) => {
        const href = $(el).attr('href')
        if (!href) return
        const clean = abs(href.split('?')[0]!)
        productUrlByKey.set(`url:${clean}`, clean)
        rawCount += 1
        if (!/lan[cç]amentos|promo/i.test(catLabel)) {
          this.rememberCategory(clean, catLabel)
        }
      })
    }
    const list = [...new Set(productUrlByKey.values())]
    logger.info(
      `Somarcas discover: ${list.length} produtos únicos (${rawCount} ocorrências em ${seeds.length} categorias)`
    )
    return options?.limit ? list.slice(0, options.limit) : list
  }

  async extract(url: string): Promise<CanonicalProduct> {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`Somarcas HTTP ${res.status}: ${url}`)
    const $ = cheerio.load(await res.text())

    const name = $('h1').first().text().trim()
    const code =
      $('.codes, .product-info-code').first().text().trim() ||
      (name.match(/[A-Z]{2}-\d+[A-Z]?/) || [])[0] ||
      ''

    const description = cleanSomarcasDescription($)
    const uniqueImgs = pickSomarcasGallery($)

    const hexes = $('.cores-disponiveis')
      .toArray()
      .map(el => {
        const cls = $(el).attr('class') || ''
        const style = $(el).attr('style') || ''
        const m = (cls + style).match(/#([0-9A-Fa-f]{6})/)
        return m ? `#${m[1].toUpperCase()}` : null
      })
      .filter((h): h is string => Boolean(h))

    if (!code) throw new Error(`Somarcas sem código: ${url}`)
    if (!uniqueImgs.length) throw new Error(`Somarcas sem imagens: ${url}`)

    const variants = [...new Set(hexes)].map((hex, idx) => ({
      identity_key: `hex:${hex}`,
      name: null,
      type: 'hex' as const,
      hex,
      sort_order: idx,
    }))

    const pdpCats = extractSomarcasPdpCategories($)
    const listingCats = this.categoriesFor(url)
    const source_categories = normalizeSourceCategories(
      pdpCats.length ? pdpCats : listingCats
    )

    return {
      supplier_code: 'SOMA',
      parent_supplier_sku: code,
      internal_reference: `SM-${code}`,
      name,
      description,
      source_url: url,
      pricing_mode: 'quote',
      source_categories,
      images: uniqueImgs.map((source_url, sort_order) => ({
        source_url,
        role: 'gallery' as const,
        sort_order,
      })),
      prices: [],
      variants,
    }
  }
}
