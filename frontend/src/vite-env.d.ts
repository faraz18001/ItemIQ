/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** API base URL. Defaults to /api, which the dev proxy and the production static mount both serve. */
  readonly VITE_API_URL?: string;
  /** Password behind the quick-login role cards; must match ITEMIQ_DEMO_PASSWORD on the server. */
  readonly VITE_DEMO_PASSWORD?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
