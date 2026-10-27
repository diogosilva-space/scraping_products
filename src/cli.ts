#!/usr/bin/env node
import './core/playwright-env.js'
import { runScrape, type RunOptions } from './pipeline/run.js'
import { logger } from './core/logger.js'

function parseArgs(argv: string[]): RunOptions {
  const opts: RunOptions = { site: 'spot', urls: [] }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--site' && argv[i + 1]) {
      opts.site = argv[++i] as RunOptions['site']
    } else if (arg === '--limit' && argv[i + 1]) {
      opts.limit = Number(argv[++i])
    } else if (arg === '--concurrency' && argv[i + 1]) {
      opts.concurrency = Number(argv[++i])
    } else if (arg === '--force') {
      opts.force = true
    } else if (arg === '--url' && argv[i + 1]) {
      opts.urls = opts.urls ?? []
      opts.urls.push(argv[++i]!)
    } else if (arg === '--help' || arg === '-h') {
      console.log(`Uso:
  pnpm scrape:spot -- --limit 5
  tsx src/cli.ts --site neoplas --limit 10
  tsx src/cli.ts --site somarcas --limit 5
  tsx src/cli.ts --site xbz --limit 5
  tsx src/cli.ts --site xbz --url https://... --url https://...

Requer apps/api rodando e DJOB_USERNAME admin.`)
      process.exit(0)
    }
  }
  if (opts.urls && opts.urls.length === 0) delete opts.urls
  return opts
}

async function main() {
  const opts = parseArgs(process.argv.slice(2))
  logger.info(
    `Iniciando scrape site=${opts.site} limit=${opts.limit ?? 'all'} urls=${opts.urls?.length ?? 0}`
  )
  const result = await runScrape(opts)
  if (result.fail > 0) process.exitCode = 1
}

main().catch(error => {
  logger.error(error)
  process.exit(1)
})
