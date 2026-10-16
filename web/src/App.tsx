import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import { Route, Routes } from 'react-router-dom'
import type { Api } from './api'
import type { Auth, Role, Staff } from './auth'
import { Home } from './Home'
import { Layout, NoAccess, NotFound } from './Layout'
import { LoginForm } from './LoginForm'
import { StaffPage } from './StaffPage'

/** A page with a menu entry, open only to the listed roles. The backend's access rules enforce the same. */
export interface Page {
  path: string
  label: string
  roles: Role[]
  render: () => ReactNode
}

function App({ auth, api }: { auth: Auth; api: Api }) {
  const [staff, setStaff] = useState<Staff | null>(() => auth.current())
  const [queryClient] = useState(() => new QueryClient())

  if (!staff) {
    return <LoginForm auth={auth} onLogin={setStaff} />
  }

  function logout() {
    auth.logout()
    queryClient.clear()
    setStaff(null)
  }

  const pages: Page[] = [
    { path: '/staff', label: 'พนักงาน', roles: ['admin'], render: () => <StaffPage directory={api.staff} self={staff} /> },
  ]
  const allowed = (page: Page) => page.roles.includes(staff.role)

  return (
    <QueryClientProvider client={queryClient}>
      <Routes>
        <Route element={<Layout staff={staff} menu={pages.filter(allowed)} onLogout={logout} />}>
          <Route index element={<Home staff={staff} />} />
          {pages.map((page) => (
            <Route key={page.path} path={page.path} element={allowed(page) ? page.render() : <NoAccess />} />
          ))}
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </QueryClientProvider>
  )
}

export default App
