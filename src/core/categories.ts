/**
 * Normaliza categorias cruas do fornecedor.
 * Remove prefixos internos, unifica hífens/espaços e aplica title case PT
 * (conjunções como "e", "de" em minúsculo).
 */

const SMALL_WORDS = new Set([
  'a',
  'as',
  'o',
  'os',
  'e',
  'ou',
  'de',
  'da',
  'do',
  'das',
  'dos',
  'em',
  'no',
  'na',
  'nos',
  'nas',
  'ao',
  'à',
  'às',
  'para',
  'por',
  'com',
  'sem',
  'sob',
  'sobre',
  'entre',
])

/** Title case PT: primeira palavra maiúscula; "e/de/da…" minúsculas no meio. */
export function titleCaseCategory(label: string): string {
  const words = label
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
  return words
    .map((w, i) => {
      if (i > 0 && SMALL_WORDS.has(w)) return w
      return w.charAt(0).toUpperCase() + w.slice(1)
    })
    .join(' ')
}

export function normalizeSourceCategory(raw: string): string {
  let name = raw.trim().replace(/\s+/g, ' ')
  if (!name) return name

  // "UD - Foo", "AB – Foo"
  name = name.replace(/^[A-Za-z]{1,5}\s*[-–—]\s+/, '')

  // Unifica hífen / travessão com espaço (Guarda-Chuvas → Guarda Chuvas)
  name = name.replace(/[-–—]+/g, ' ').replace(/\s+/g, ' ').trim()

  name = name
    .replace(/\bDomesticas\b/gi, 'Domésticas')
    .replace(/\bUtilidades Domesticas\b/gi, 'Utilidades Domésticas')
    .replace(/\bAcessorios\b/gi, 'Acessórios')
    .replace(/\bInformatica\b/gi, 'Informática')
    .replace(/\bTermicas\b/gi, 'Térmicas')
    .replace(/\bUtensilios\b/gi, 'Utensílios')
    .replace(/\bEscritorio\b/gi, 'Escritório')
    .replace(/\bNecessaires\b/gi, 'Nécessaires')
    .replace(/\bNecessaire\b/gi, 'Nécessaire')

  return unifyCategoryFamily(titleCaseCategory(name))
}

/**
 * Famílias semânticas: rótulos equivalentes de fornecedores diferentes
 * viram um nome canônico.
 * Copos e Taças NÃO entram em Garrafas e Canecas.
 */
function unifyCategoryFamily(name: string): string {
  let key = name.toLowerCase()
  key = key
    .replace(/\s+personalizad[oa]s?\s*$/i, '')
    .replace(/\s+e\s+chaveiro$/i, '')
    .trim()

  if (/^copos?$/i.test(key)) return 'Copos'
  if (/^ta[cç]as?$/i.test(key)) return 'Taças'

  if (
    /^(canecas?|garrafas?|squeezes?)$/i.test(key) ||
    /^canecas?\s+de\s+viagem$/i.test(key) ||
    /^garrafas?\s+t[eé]rmicas?$/i.test(key) ||
    /^squeezes?\s+e\s+garrafas?$/i.test(key)
  ) {
    return 'Garrafas e Canecas'
  }

  if (
    /^(canetas?|esferogr[aá]ficas?.*)$/i.test(key) ||
    /^l[aá]pis(\s+e\s+lapiseiras?)?$/i.test(key)
  ) {
    return 'Canetas'
  }

  if (
    /^(agendas?\s+e\s+blocos?|blocos?\s+e\s+cadernetas?|blocos?\s+e\s+cadernos?|cadernetas?|cadernos?|bloco\s+de\s+notas)$/i.test(
      key
    )
  ) {
    return 'Agendas e Blocos'
  }

  if (/^chaveiros?$/i.test(key)) return 'Chaveiros'
  if (/^mochilas?$/i.test(key)) return 'Mochilas'
  if (/^guarda[-\s]?chuvas?$/i.test(key)) return 'Guarda Chuvas'
  if (/^carregadores?(\s+port[aá]teis?)?$/i.test(key)) return 'Carregadores'
  if (/^churrasco$/i.test(key) || /^kit\s+churrasco$/i.test(key)) {
    return 'Churrasco'
  }

  return name
}

export function normalizeSourceCategories(raw: string[]): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  for (const item of raw) {
    const name = normalizeSourceCategory(item)
    if (!name) continue
    const key = name.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(name)
  }
  return out
}

/** Label legível a partir do último segmento de path (/brindes/Canecas → Canecas). */
export function categoryLabelFromPath(pathnameOrUrl: string): string {
  try {
    const path = pathnameOrUrl.includes('://')
      ? new URL(pathnameOrUrl).pathname
      : pathnameOrUrl
    const seg = path.split('/').filter(Boolean).pop() || ''
    return decodeURIComponent(seg)
      .replace(/\+/g, ' ')
      .replace(/[-_]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  } catch {
    return ''
  }
}
