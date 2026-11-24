import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Em desenvolvimento, /api é encaminhado para o backend: front e API ficam na mesma origem,
// o que permite o cookie httpOnly de autenticação e o carregamento de imagens/PDFs protegidos.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: { '/api': { target: process.env.VITE_API_PROXY ?? 'http://localhost:3333', changeOrigin: false } },
  },
});
