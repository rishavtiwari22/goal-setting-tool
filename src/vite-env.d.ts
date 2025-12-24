/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
  readonly VITE_API_TOKEN: string
  readonly VITE_HUGGINGFACE_API_KEY?: string
  readonly VITE_HUGGINGFACE_API_URL: string
  readonly VITE_HUGGINGFACE_MODEL?: string
  readonly VITE_GA4_MEASUREMENT_ID?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
