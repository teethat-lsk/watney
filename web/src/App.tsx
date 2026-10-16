import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEffect, useState, type ReactNode } from 'react'
import { Route, Routes } from 'react-router-dom'
import type { Api } from './api'
import type { Auth, Role, Staff } from './auth'
import { CustomerPage } from './CustomerPage'
import { CustomersPage } from './CustomersPage'
import { Home } from './Home'
import { Layout, NoAccess, NotFound } from './Layout'
import { LoginForm } from './LoginForm'
import { NewCustomerPage } from './NewCustomerPage'
import { RoutesPage } from './RoutesPage'
import { StaffPage } from './StaffPage'

/**
 * A page open only to the listed roles; the backend's access rules enforce the same.
 * Pages with a label get a menu entry.
 */
export interface Page {
  path: string
  label?: string
  roles: Role[]
  render: () => ReactNode
}

type MenuPage = Page & { label: string }

const officeStaff: Role[] = ['office', 'admin']

function App({ auth, api }: { auth: Auth; api: Api }) {
  const [staff, setStaff] = useState<Staff | null>(() => auth.current())
  const [queryClient] = useState(() => new QueryClient())

  // A session stored from before may be out of date: the role changed, or the account was deactivated.
  useEffect(() => {
    if (!auth.current()) return
    let current = true
    auth.refresh().then((refreshed) => {
      // Unless they logged out meanwhile.
      if (current) setStaff((shown) => (shown ? refreshed : null))
    })
    return () => {
      current = false
    }
  }, [auth])

  if (!staff) {
    return <LoginForm auth={auth} onLogin={setStaff} />
  }

  function logout() {
    auth.logout()
    queryClient.clear()
    setStaff(null)
  }

  const pages: Page[] = [
    {
      path: '/customers',
      label: 'ผู้ใช้น้ำ',
      roles: officeStaff,
      render: () => <CustomersPage register={api.customers} routes={api.routes} />,
    },
    { path: '/customers/new', roles: officeStaff, render: () => <NewCustomerPage register={api.customers} routes={api.routes} /> },
    { path: '/customers/:id', roles: officeStaff, render: () => <CustomerPage register={api.customers} routes={api.routes} /> },
    { path: '/routes', label: 'เส้นทาง', roles: officeStaff, render: () => <RoutesPage directory={api.routes} /> },
    {
      path: '/staff',
      label: 'พนักงาน',
      roles: ['admin'],
      render: () => <StaffPage directory={api.staff} routes={api.routes} self={staff} />,
    },
  ]
  const allowed = (page: Page) => page.roles.includes(staff.role)
  const menu = pages.filter((page): page is MenuPage => page.label !== undefined && allowed(page))

  return (
    <QueryClientProvider client={queryClient}>
      <Routes>
        <Route element={<Layout staff={staff} menu={menu} onLogout={logout} />}>
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
