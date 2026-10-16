import { cleanup, fireEvent, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { LoginError } from './auth'
import { admin, fakeAuth, office, reader, renderApp } from './testing'

function submitLogin(email: string, password: string) {
  fireEvent.change(screen.getByLabelText('อีเมล'), { target: { value: email } })
  fireEvent.change(screen.getByLabelText('รหัสผ่าน'), { target: { value: password } })
  fireEvent.click(screen.getByRole('button', { name: 'เข้าสู่ระบบ' }))
}

function menuItems() {
  return within(screen.getByRole('navigation', { name: 'เมนูหลัก' }))
    .queryAllByRole('link')
    .map((link) => link.textContent)
}

afterEach(cleanup)

describe('App', () => {
  it('shows the login form when nobody is logged in', () => {
    renderApp({ staff: null })
    expect(screen.getByRole('form', { name: 'เข้าสู่ระบบ' })).toBeDefined()
  })

  it('logs a staff member in and shows who is logged in', async () => {
    const auth = fakeAuth()
    renderApp({ auth })

    submitLogin('admin@example.com', 'secret-password')

    expect(await screen.findByText('สมชาย')).toBeDefined()
    expect(screen.getByText(/ผู้ดูแลระบบ/)).toBeDefined()
    expect(auth.login).toHaveBeenCalledWith('admin@example.com', 'secret-password')
  })

  it('shows an error for wrong credentials and stays on the login form', async () => {
    renderApp({ auth: fakeAuth({ login: vi.fn(async () => Promise.reject(new LoginError('invalid'))) }) })

    submitLogin('admin@example.com', 'wrong-password')

    expect((await screen.findByRole('alert')).textContent).toBe('อีเมลหรือรหัสผ่านไม่ถูกต้อง')
    expect(screen.getByRole('form', { name: 'เข้าสู่ระบบ' })).toBeDefined()
  })

  it('tells the user when the backend is unreachable', async () => {
    renderApp({ auth: fakeAuth({ login: vi.fn(async () => Promise.reject(new LoginError('unreachable'))) }) })

    submitLogin('admin@example.com', 'secret-password')

    expect((await screen.findByRole('alert')).textContent).toBe('ติดต่อเซิร์ฟเวอร์ไม่ได้ ลองใหม่อีกครั้ง')
  })

  it('tells a deactivated staff member their account is closed', async () => {
    renderApp({ auth: fakeAuth({ login: vi.fn(async () => Promise.reject(new LoginError('inactive'))) }) })

    submitLogin('old@example.com', 'secret-password')

    expect((await screen.findByRole('alert')).textContent).toBe('บัญชีนี้ถูกปิดใช้งาน ติดต่อผู้ดูแลระบบ')
  })

  it('goes back to the login form when the backend no longer accepts the stored session', async () => {
    renderApp({ auth: fakeAuth({ current: () => admin, refresh: vi.fn(async () => null) }) })

    expect(await screen.findByRole('form', { name: 'เข้าสู่ระบบ' })).toBeDefined()
  })

  it('shows the menus for the role the backend reports now, not the stored one', async () => {
    renderApp({ auth: fakeAuth({ current: () => admin, refresh: vi.fn(async () => ({ ...admin, role: 'office' as const })) }) })

    expect(await screen.findByText(/เจ้าหน้าที่สำนักงาน/)).toBeDefined()
    expect(menuItems()).not.toContain('พนักงาน')
  })

  it('starts on the home screen when a session is stored', () => {
    renderApp({ staff: admin })
    expect(screen.getByText('สมชาย')).toBeDefined()
  })

  it('logs out back to the login form', () => {
    const { auth } = renderApp({ staff: admin })

    fireEvent.click(screen.getByRole('button', { name: 'ออกจากระบบ' }))

    expect(auth.logout).toHaveBeenCalledOnce()
    expect(screen.getByRole('form', { name: 'เข้าสู่ระบบ' })).toBeDefined()
  })

  it('shows each role only the menus it may use', () => {
    const expected = [
      [admin, ['หน้าแรก', 'ผู้ใช้น้ำ', 'เส้นทาง', 'พนักงาน']],
      [office, ['หน้าแรก', 'ผู้ใช้น้ำ', 'เส้นทาง']],
      [reader, ['หน้าแรก']],
    ] as const
    for (const [staff, menus] of expected) {
      renderApp({ staff })
      expect(menuItems()).toEqual(menus)
      cleanup()
    }
  })

  it("tells staff who open a page their role can't use that they have no access", () => {
    for (const [staff, path] of [[office, '/staff'], [reader, '/customers'], [reader, '/customers/c1']] as const) {
      renderApp({ staff, path })
      expect(screen.getByRole('heading', { name: 'ไม่มีสิทธิ์เข้าถึงหน้านี้' })).toBeDefined()
      cleanup()
    }
  })
})
