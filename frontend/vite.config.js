import path from 'path'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const toOrigin = (value) => {
  if (!value) return null
  try {
    return new URL(value).origin
  } catch {
    return null
  }
}

const unique = (values) => [...new Set(values.filter(Boolean))]

const buildCspHeader = ({ mode, env }) => {
  const cspMode = (env.VITE_CSP_MODE || 'report-only').toLowerCase()
  if (cspMode === 'off') {
    return {}
  }

  const apiOrigin = toOrigin(env.VITE_API_URL)
  const socketOrigin = toOrigin(env.VITE_SOCKET_URL)
  const reportUri = env.VITE_CSP_REPORT_URI || (apiOrigin ? `${apiOrigin}/api/v1/security/csp-report` : '/api/v1/security/csp-report')

  const connectSrc = unique([
    "'self'",
    'https://res.cloudinary.com',
    apiOrigin,
    socketOrigin,
    mode !== 'production' ? 'ws:' : null,
    mode !== 'production' ? 'wss:' : null,
    mode !== 'production' ? 'http:' : null,
    mode !== 'production' ? 'https:' : null,
  ])

  const scriptSrc = unique([
    "'self'",
    mode !== 'production' ? "'unsafe-inline'" : null,
    mode !== 'production' ? "'unsafe-eval'" : null,
  ])

  const directives = [
    "default-src 'self'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "object-src 'none'",
    `script-src ${scriptSrc.join(' ')}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' data: https://fonts.gstatic.com",
    "img-src 'self' data: blob: https://res.cloudinary.com",
    `connect-src ${connectSrc.join(' ')}`,
    `report-uri ${reportUri}`,
  ]

  if (mode === 'production') {
    directives.push('upgrade-insecure-requests')
  }

  const headerName = cspMode === 'enforce'
    ? 'Content-Security-Policy'
    : 'Content-Security-Policy-Report-Only'

  return {
    [headerName]: directives.join('; '),
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const cspHeaders = buildCspHeader({ mode, env })

  return {
    plugins: [react(), tailwindcss()],
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom', 'react-router-dom'],
            charts: ['recharts'],
            ui: ['framer-motion', 'lucide-react', 'react-icons'],
            query: ['@tanstack/react-query'],
          },
        },
      },
    },
    server: {
      headers: cspHeaders,
    },
    preview: {
      headers: {
        ...cspHeaders,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
  }
})
