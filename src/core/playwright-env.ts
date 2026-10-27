import os from 'node:os'
import path from 'node:path'

/**
 * Cursor/sandbox costuma apontar PLAYWRIGHT_BROWSERS_PATH para um cache
 * temporário — por isso o Chromium “some” e precisa reinstalar.
 * Forçamos o cache estável do usuário.
 */
const stableBrowsersPath =
  process.env.PLAYWRIGHT_BROWSERS_PATH_STABLE?.trim() ||
  (process.platform === 'darwin'
    ? path.join(os.homedir(), 'Library/Caches/ms-playwright')
    : path.join(os.homedir(), '.cache', 'ms-playwright'))

process.env.PLAYWRIGHT_BROWSERS_PATH = stableBrowsersPath

export const playwrightBrowsersPath = stableBrowsersPath
