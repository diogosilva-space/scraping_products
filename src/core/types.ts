export type SupplierCode = 'SPOT' | 'XBZ' | 'SOMA' | 'NEO'
export type PricingMode = 'public' | 'login_required' | 'quote'
export type ColorSwatchType = 'hex' | 'image' | 'named'
export type ImageRole = 'gallery' | 'color' | '360'

export type SiteAdapterId = 'spot' | 'xbz' | 'somarcas' | 'neoplas'

export interface CanonicalVariant {
  identity_key: string
  supplier_sku?: string | null
  name: string | null
  type: ColorSwatchType
  hex?: string | null
  code?: string | null
  source_sku?: string | null
  sort_order: number
  stock_qty?: number | null
  in_stock?: boolean | null
  /** URL origem do swatch (ainda não no CDN) */
  source_swatch_url?: string | null
}

export interface CanonicalImage {
  source_url: string
  role: ImageRole
  sort_order: number
  variant_identity_key?: string | null
}

export interface CanonicalPrice {
  min_qty: number
  max_qty?: number | null
  amount: number
  currency: 'BRL'
}

export interface CanonicalProduct {
  supplier_code: SupplierCode
  parent_supplier_sku: string
  internal_reference: string
  name: string
  description?: string | null
  additional_info?: string | null
  source_url: string
  pricing_mode: PricingMode
  stock_qty?: number | null
  stock_future_qty?: number | null
  in_stock?: boolean | null
  material?: string | null
  capacity?: string | null
  weight_grams?: number | null
  dimensions?: Record<string, unknown> | null
  packaging?: Record<string, unknown> | null
  video_url?: string | null
  source_categories?: string[]
  attributes?: Array<{ key: string; value: string }>
  images: CanonicalImage[]
  prices?: CanonicalPrice[]
  variants?: CanonicalVariant[]
  raw_payload?: Record<string, unknown>
}

export interface SiteAdapter {
  id: SiteAdapterId
  supplierCode: SupplierCode
  discover(options?: { limit?: number }): Promise<string[]>
  extract(url: string): Promise<CanonicalProduct>
  dispose?(): Promise<void>
}
