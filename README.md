# TestFlare

Share Android test builds with your team. Upload a build from the browser, your CI pipeline or the
command line; testers install it from a Play Store-style page or by scanning a QR code.

> Status: early development (MVP in progress).

## How it works

- **Companies** sign up, verify their email and start a 7-day access period.
- **Apps** are either public (anyone with the link) or limited to invited testers.
- **Builds** (APKs) are uploaded straight to storage; TestFlare reads the version and package from the
  APK and shows "What's new" notes the way the Play Store does.
- **Access tokens**, like cloud IAM keys, let pipelines and scripts upload. They expire with the
  company's access period.

## Stack

All on Cloudflare: **Workers** (API, with [Hono](https://hono.dev)), **D1** (database), **R2** (build
files), **KV** (rate limits), **Turnstile** (bot check). The web app is React + Vite, served by the same
Worker.

## Local development

Requirements: Node 22 or newer.

```bash
npm install
cp .dev.vars.example .dev.vars        # local secrets (Turnstile test key)
npm run db:migrate:local              # create the local database
npm run dev                           # http://localhost:5173 (site and API together)
```

Locally everything runs offline (D1, R2 and KV are simulated) and Turnstile uses Cloudflare's test
keys, which always pass.

| Command | What it does |
| --- | --- |
| `npm run dev` | Site and API with hot reload |
| `npm run typecheck` / `lint` / `test` / `format:check` | Checks (all run on pull requests) |
| `npm run build` | Production build |
| `npm run db:migrate:local` | Apply database migrations locally |

## Releases

Work happens on `dev`. A release is a pull request from `dev` into `prod`; the **Checks** workflow must
pass before it can be merged. `prod` is protected: no direct pushes, force-pushes or deletion.

## License

[MIT](LICENSE)
