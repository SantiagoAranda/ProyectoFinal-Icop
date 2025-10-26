import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  preview: {
    allowedHosts: ['pagina-de-gestion-de-salon.onrender.com'],
    port: 5173,
    host: '0.0.0.0',
  },
})
