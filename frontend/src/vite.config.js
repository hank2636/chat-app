import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    allowedHosts: 'all',
    host: true // 讓 Vite 可透過本地網域或 IP 存取
  }
});
