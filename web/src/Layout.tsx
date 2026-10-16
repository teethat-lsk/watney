import { NavLink, Outlet } from 'react-router-dom'
import type { Staff } from './auth'
import { roleLabels } from './roles'

interface LayoutProps {
  staff: Staff
  /** The pages the logged-in role may use. */
  menu: { path: string; label: string }[]
  onLogout: () => void
}

export function Layout({ staff, menu, onLogout }: LayoutProps) {
  return (
    <>
      <header className="app-header">
        <strong>Watney Admin</strong>
        <nav aria-label="เมนูหลัก">
          <NavLink to="/" end>
            หน้าแรก
          </NavLink>
          {menu.map((page) => (
            <NavLink key={page.path} to={page.path}>
              {page.label}
            </NavLink>
          ))}
        </nav>
        <p>
          เข้าสู่ระบบในชื่อ <strong>{staff.name || staff.email}</strong> ({roleLabels[staff.role]}){' '}
          <button type="button" onClick={onLogout}>
            ออกจากระบบ
          </button>
        </p>
      </header>
      <main>
        <Outlet />
      </main>
    </>
  )
}

export function NoAccess() {
  return <h1>ไม่มีสิทธิ์เข้าถึงหน้านี้</h1>
}

export function NotFound() {
  return <h1>ไม่พบหน้านี้</h1>
}
