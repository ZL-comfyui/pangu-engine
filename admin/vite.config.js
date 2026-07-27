import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1',  // 安全：仅绑定本地回环，禁止公网暴露
    port: 18791,
    proxy: {
      '/api': {
        target: 'http://localhost:18790',
        changeOrigin: true,
      }
    }
  },
  build: {
    outDir: 'dist',
  }
})
