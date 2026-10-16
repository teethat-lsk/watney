import PocketBase from 'pocketbase'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { pocketbaseApi } from './api.ts'
import { pocketbaseAuth } from './auth.ts'

// Same origin as the page: Vite proxies /api to PocketBase in development,
// and PocketBase serves this build in production.
const pb = new PocketBase('/')
// React Query already de-duplicates requests; the SDK's auto-cancellation would
// cancel a refetch that overlaps another request to the same collection.
pb.autoCancellation(false)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App auth={pocketbaseAuth(pb)} api={pocketbaseApi(pb)} />
    </BrowserRouter>
  </StrictMode>,
)
