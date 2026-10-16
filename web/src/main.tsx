import PocketBase from 'pocketbase'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { pocketbaseAuth } from './auth.ts'

// Same origin as the page: Vite proxies /api to PocketBase in development,
// and PocketBase serves this build in production.
const auth = pocketbaseAuth(new PocketBase('/'))

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App auth={auth} />
  </StrictMode>,
)
