# Chullan Cosmetics

Production storefront for Chullan Cosmetics, built with React, TypeScript, Vite,
Vercel Functions, Razorpay, and Shiprocket.

## Local development

Requirements: Node.js 20.19+ (or 22.12+) and npm.

```powershell
npm ci
Copy-Item .env.example .env.local
```

Run the Vercel Functions and frontend in separate terminals:

```powershell
npx vercel dev --listen 3100
```

```powershell
npm run dev
```

## Verification

```powershell
npm run lint
npm run build
npm run test:all
```

## Deployment

The application is configured for Vercel. Set the server-only values documented
in `.env.example` in the appropriate Vercel environments. Never prefix commerce
credentials with `VITE_`, and never enable `COMMERCE_MODE=mock` in Production.

`vercel.json` defines SPA routing, security headers, API cache policy, and static
asset caching.
