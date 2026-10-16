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

  it('shows admins the staff menu', () => {
    renderApp({ staff: admin })
    expect(menuItems()).toContain('พนักงาน')
  })

  it('shows office staff and meter readers no staff menu', () => {
    for (const staff of [office, reader]) {
      renderApp({ staff })
      expect(menuItems()).not.toContain('พนักงาน')
      cleanup()
    }
  })

  it("tells staff who open a page their role can't use that they have no access", () => {
    renderApp({ staff: office, path: '/staff' })

    expect(screen.getByRole('heading', { name: 'ไม่มีสิทธิ์เข้าถึงหน้านี้' })).toBeDefined()
  })
})
