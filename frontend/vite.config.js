export default {
  server: {
    proxy: {
      '^/(?!api|analytics|me|login|signup)': {
        target: process.env.VITE_API_BASE_URL || 'http://localhost:8000',
        changeOrigin: true,
      }
    }
  }
}