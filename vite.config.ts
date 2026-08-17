import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * `/api` is served by Vercel Functions in production, which Vite knows nothing
 * about — so locally those requests 404 and the cart looks broken for reasons
 * that have nothing to do with the cart.
 *
 * Proxying to `vercel dev` on 3100 makes local behave like production: same
 * paths, same origin, no CORS, no separate client config. Run the two side by
 * side:
 *
 *   COMMERCE_MODE=mock npx vercel dev --listen 3100     # API
 *   npm run dev                                         # storefront
 *
 * `changeOrigin` matters because the checkout session builds its return URL
 * from the incoming Origin header; without it the redirect points at the proxy
 * target rather than the page the buyer is actually on.
 */
const apiProxy = {
  '/api': {
    target: 'http://localhost:3100',
    changeOrigin: false,
  },
};

export default defineConfig({
  plugins: [react()],
  server: { proxy: apiProxy },
  preview: { proxy: apiProxy },
  build: {
    // three + drei are only needed once a 3D slot scrolls into range, so keep
    // them out of the entry chunk that gates first paint.
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three'],
          drei: ['@react-three/fiber', '@react-three/drei'],
        },
      },
    },
  },
})
