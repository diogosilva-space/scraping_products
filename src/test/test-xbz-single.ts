import '../../src/core/playwright-env.js'
import fs from 'node:fs/promises'
import path from 'node:path'
import { XbzAdapter } from '../sites/xbz/adapter.js'

const url = process.argv[2]

if (!url || !/^https:\/\/([\w-]+\.)?xbzbrindes\.com\.br\//i.test(url)) {
  console.error(
    'Uso: pnpm exec tsx src/test/test-xbz-single.ts https://www.xbzbrindes.com.br/PRODUTO'
  )
  process.exit(2)
}

const adapter = new XbzAdapter()

try {
  const product = await adapter.extract(url)
  const output = {
    scraped_at: new Date().toISOString(),
    source_url: url,
    product,
    validation: {
      has_reference: Boolean(product.parent_supplier_sku),
      has_name: Boolean(product.name?.trim()),
      has_description: Boolean(product.description?.trim()),
      gallery_images: product.images.filter(image => image.role === 'gallery').length,
      variants: product.variants?.length ?? 0,
      source_categories: product.source_categories ?? [],
    },
  }

  const outputPath = path.resolve('tmp/xbz-single-product.json')
  await fs.mkdir(path.dirname(outputPath), { recursive: true })
  await fs.writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8')

  console.log(JSON.stringify(output, null, 2))
  console.error(`\nJSON salvo em: ${outputPath}`)
} finally {
  await adapter.dispose()
}
