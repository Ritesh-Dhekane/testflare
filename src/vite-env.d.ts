/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Turnstile site key (public). Unset locally: Cloudflare's always-pass test key is used. */
  readonly VITE_TURNSTILE_SITE_KEY?: string
}
