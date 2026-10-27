import { createHash } from 'node:crypto'
import type { CanonicalProduct } from './types.js'

/** Hash estável do payload canônico (sem raw_payload / source urls de imagem). */
export function contentFingerprint(product: CanonicalProduct): string {
  const stable = {
    supplier_code: product.supplier_code,
    parent_supplier_sku: product.parent_supplier_sku,
    internal_reference: product.internal_reference,
    name: product.name,
    description: product.description ?? null,
    additional_info: product.additional_info ?? null,
    source_url: product.source_url,
    pricing_mode: product.pricing_mode,
    stock_qty: product.stock_qty ?? null,
    stock_future_qty: product.stock_future_qty ?? null,
    material: product.material ?? null,
    capacity: product.capacity ?? null,
    weight_grams: product.weight_grams ?? null,
    dimensions: product.dimensions ?? null,
    packaging: product.packaging ?? null,
    source_categories: product.source_categories ?? [],
    attributes: product.attributes ?? [],
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
    })),
    images: product.images.map(i => ({
      source_url: i.source_url,
      role: i.role,
      sort_order: i.sort_order,
      variant_identity_key: i.variant_identity_key ?? null,
    })),
  }
  return createHash('sha256').update(JSON.stringify(stable)).digest('hex')
}

export function sha256Buffer(buf: Buffer): string {
  return createHash('sha256').update(buf).digest('hex')
}
