# Dilla University Incubation Center

The application is a React single-page app built with Vite and uses Supabase.

## Deploy to Vercel

1. Push this repository to GitHub.
2. In Vercel, choose **Add New → Project** and import the repository.
3. Use the detected Vite settings, or set:
   - Build command: `npm run build`
   - Output directory: `dist`
   - Install command: `npm install`
4. In the Vercel project's **Settings → Environment Variables**, add:
   - `VITE_SUPABASE_URL` — the project URL from Supabase.
   - `VITE_SUPABASE_ANON_KEY` — the Supabase anon/publishable key.

   Add both variables for the environments you plan to deploy (Production, Preview, and/or Development), then redeploy.
5. If Supabase Auth email links are used, add the deployed domain to the allowed redirect URLs in the Supabase project's Auth URL configuration.

The Vercel configuration includes a rewrite for client-side routes, so direct navigation to pages such as `/login` works. Local `.env.local` files are ignored by Git; enter the variable values directly in Vercel rather than committing them. The anon/publishable key is intended for browser use, but protect your data with appropriate Supabase Row Level Security policies. Never expose a Supabase `service_role` key in this frontend or in a `VITE_` variable.

## Run locally

```sh
npm install
npm run dev
```

Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in a local `.env.local` file before using Supabase features.

## Build and lint

```sh
npm run build
npm run lint
```
