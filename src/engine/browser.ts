import './../core/playwright-env.js'
import { chromium, type Browser, type BrowserContext, type Page } from 'playwright'
import { env } from '../core/env.js'
import { logger } from '../core/logger.js'
import fs from 'node:fs/promises'
import path from 'node:path'

export class BrowserPool {
  private browser: Browser | null = null
  private context: BrowserContext | null = null

  constructor(private statePath: string) {}

  async getContext(): Promise<BrowserContext> {
    if (this.context) return this.context

    this.browser = await chromium.launch({
      headless: env.HEADLESS,
    })

    let storageState: string | undefined
    try {
      await fs.access(this.statePath)
      storageState = this.statePath
    } catch {
      // first run
    }

    this.context = await this.browser.newContext({
      storageState,
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      locale: 'pt-BR',
    })
    return this.context
  }

  async newPage(): Promise<Page> {
    const ctx = await this.getContext()
    return ctx.newPage()
  }

  async saveState() {
    if (!this.context) return
    await fs.mkdir(path.dirname(this.statePath), { recursive: true })
    await this.context.storageState({ path: this.statePath })
    logger.info(`storageState salvo em ${this.statePath}`)
  }

  async cookieHeader(): Promise<string | undefined> {
    if (!this.context) return undefined
    const cookies = await this.context.cookies()
    if (!cookies.length) return undefined
    return cookies.map(c => `${c.name}=${c.value}`).join('; ')
  }

  async dispose() {
    await this.context?.close().catch(() => undefined)
    await this.browser?.close().catch(() => undefined)
    this.context = null
    this.browser = null
  }
}
