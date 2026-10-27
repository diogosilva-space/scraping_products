import 'dotenv/config'
import { z } from 'zod'

const envSchema = z.object({
  HEADLESS: z
    .enum(['true', 'false'])
    .default('true')
    .transform(v => v === 'true'),
  DJOB_API_BASE_URL: z.string().url().default('http://127.0.0.1:4140'),
  DJOB_USERNAME: z.string().email(),
  DJOB_PASSWORD: z.string().min(1),
  STORAGE_APP_PREFIX: z.string().default('scraping-products'),
  STORAGE_BUCKET: z.string().min(1),
  STORAGE_REGION: z.string().min(1),
  STORAGE_ENDPOINT: z.string().url(),
  STORAGE_ACCESS_KEY_ID: z.string().min(1),
  STORAGE_SECRET_ACCESS_KEY: z.string().min(1),
  STORAGE_PUBLIC_BASE_URL: z.string().url(),
  SPOTGIFTS_EMAIL: z.string().optional(),
  SPOTGIFTS_PASSWORD: z.string().optional(),
})

function loadEnv() {
  const parsed = envSchema.safeParse(process.env)
  if (!parsed.success) {
    const details = parsed.error.issues
      .map(i => `${i.path.join('.')}: ${i.message}`)
      .join('; ')
    throw new Error(`Invalid scraping env: ${details}`)
  }
  return parsed.data
}

export const env = loadEnv()
