import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { LoginError, type Auth, type Staff } from './auth'

const admin: Staff = { id: 'u1', email: 'admin@example.com', name: 'สมชาย', role: 'admin' }

function fakeAuth(overrides: Partial<Auth> = {}): Auth {
  return {
    current: () => null,
    login: vi.fn(async () => admin),
    logout: vi.fn(),
    ...overrides,
  }
}

function submitLogin(email: string, password: string) {
  fireEvent.change(screen.getByLabelText('อีเมล'), { target: { value: email } })
  fireEvent.change(screen.getByLabelText('รหัสผ่าน'), { target: { value: password } })
  fireEvent.click(screen.getByRole('button', { name: 'เข้าสู่ระบบ' }))
}

afterEach(cleanup)

describe('App', () => {
  it('shows the login form when nobody is logged in', () => {
    render(<App auth={fakeAuth()} />)
    expect(screen.getByRole('form', { name: 'เข้าสู่ระบบ' })).toBeDefined()
  })

  it('logs a staff member in and shows who is logged in', async () => {
    const auth = fakeAuth()
    render(<App auth={auth} />)

    submitLogin('admin@example.com', 'secret-password')

    expect(await screen.findByText('สมชาย')).toBeDefined()
    expect(screen.getByText(/ผู้ดูแลระบบ/)).toBeDefined()
    expect(auth.login).toHaveBeenCalledWith('admin@example.com', 'secret-password')
  })

  it('shows an error for wrong credentials and stays on the login form', async () => {
    render(<App auth={fakeAuth({ login: vi.fn(async () => Promise.reject(new LoginError('invalid'))) })} />)

    submitLogin('admin@example.com', 'wrong-password')

    expect((await screen.findByRole('alert')).textContent).toBe('อีเมลหรือรหัสผ่านไม่ถูกต้อง')
    expect(screen.getByRole('form', { name: 'เข้าสู่ระบบ' })).toBeDefined()
  })

  it('tells the user when the backend is unreachable', async () => {
    render(<App auth={fakeAuth({ login: vi.fn(async () => Promise.reject(new LoginError('unreachable'))) })} />)

    submitLogin('admin@example.com', 'secret-password')

    expect((await screen.findByRole('alert')).textContent).toBe('ติดต่อเซิร์ฟเวอร์ไม่ได้ ลองใหม่อีกครั้ง')
  })

  it('starts on the home screen when a session is stored', () => {
    render(<App auth={fakeAuth({ current: () => admin })} />)
    expect(screen.getByText('สมชาย')).toBeDefined()
  })

  it('logs out back to the login form', () => {
    const auth = fakeAuth({ current: () => admin })
    render(<App auth={auth} />)

    fireEvent.click(screen.getByRole('button', { name: 'ออกจากระบบ' }))

    expect(auth.logout).toHaveBeenCalledOnce()
    expect(screen.getByRole('form', { name: 'เข้าสู่ระบบ' })).toBeDefined()
  })
})
