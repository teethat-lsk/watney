// Test helpers: in-memory fakes of the backend interfaces, and rendering the whole app.
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'
import type { Api } from './api'
import App from './App'
import type { Auth, Staff } from './auth'
import { FormError } from './formError'
import type { StaffAccount, StaffDirectory } from './staff'

export const admin: Staff = { id: 'u1', email: 'admin@example.com', name: 'สมชาย', role: 'admin' }
export const office: Staff = { id: 'u2', email: 'office@example.com', name: 'สมศรี', role: 'office' }
export const reader: Staff = { id: 'u3', email: 'reader@example.com', name: 'สมปอง', role: 'meter_reader' }

export function fakeAuth(overrides: Partial<Auth> = {}): Auth {
  const auth: Auth = {
    current: () => null,
    login: vi.fn(async () => admin),
    refresh: vi.fn(async () => auth.current()),
    logout: vi.fn(),
    ...overrides,
  }
  return auth
}

/** A staff directory kept in memory. Like the backend, it rejects a second account with the same email. */
export function fakeStaffDirectory(initial: StaffAccount[] = []): StaffDirectory {
  const accounts = initial.map((account) => ({ ...account }))
  return {
    list: vi.fn(async () => accounts.map((account) => ({ ...account }))),
    create: vi.fn(async ({ email, name, role }) => {
      if (accounts.some((account) => account.email === email)) {
        throw new FormError({ email: 'validation_not_unique' })
      }
      const account: StaffAccount = { id: `new${accounts.length + 1}`, email, name, role, active: true }
      accounts.push(account)
      return { ...account }
    }),
    update: vi.fn(async (id, changes) => {
      const account = accounts.find((candidate) => candidate.id === id)
      if (!account) throw new Error(`No staff account ${id}`)
      const fields = { ...changes }
      delete fields.password
      Object.assign(account, fields)
      return { ...account }
    }),
  }
}

export function fakeApi(overrides: Partial<Api> = {}): Api {
  return {
    staff: fakeStaffDirectory(),
    ...overrides,
  }
}

/** Renders the app at `path`, logged in as `staff` (or logged out when null). */
export function renderApp({ staff = admin, api = fakeApi(), auth, path = '/' }: {
  staff?: Staff | null
  api?: Api
  auth?: Auth
  path?: string
} = {}) {
  const usedAuth = auth ?? fakeAuth({ current: () => staff })
  render(
    <MemoryRouter initialEntries={[path]}>
      <App auth={usedAuth} api={api} />
    </MemoryRouter>,
  )
  return { auth: usedAuth, api }
}
