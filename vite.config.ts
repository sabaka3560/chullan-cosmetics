import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
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
