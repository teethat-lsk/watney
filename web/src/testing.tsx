// Test helpers: in-memory fakes of the backend interfaces, and rendering the whole app.
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'
import type { Api } from './api'
import App from './App'
import type { Auth, Staff } from './auth'
import type { Customer, CustomerRegister, Meter, MeterStatus } from './customers'
import { FormError } from './formError'
import type { ReadingRoute, RouteDirectory } from './routes'
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
      const account: StaffAccount = { id: `new${accounts.length + 1}`, email, name, role, active: true, routes: [] }
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

/** Routes kept in memory. Like the backend, it rejects a second route with the same name. */
export function fakeRouteDirectory(initial: ReadingRoute[] = []): RouteDirectory {
  const routes = initial.map((route) => ({ ...route }))
  const checkUnique = (name: string, id?: string) => {
    if (routes.some((route) => route.name === name && route.id !== id)) {
      throw new FormError({ name: 'validation_not_unique' })
    }
  }
  return {
    list: vi.fn(async () => routes.map((route) => ({ ...route }))),
    create: vi.fn(async (name) => {
      checkUnique(name)
      const route = { id: `r${routes.length + 1}`, name }
      routes.push(route)
      return { ...route }
    }),
    rename: vi.fn(async (id, name) => {
      checkUnique(name, id)
      const route = routes.find((candidate) => candidate.id === id)!
      route.name = name
      return { ...route }
    }),
  }
}

/**
 * A customer register kept in memory. Like the backend, it rejects a meter number
 * that's already used, a customer becoming active without an active meter or
 * getting a second one, and removing an active customer's meter; and a pending
 * customer becomes active when their meter is registered.
 */
export function fakeCustomerRegister(initial: Customer[] = [], routes: ReadingRoute[] = []): CustomerRegister {
  const customers: Customer[] = structuredClone(initial)
  const find = (id: string) => customers.find((customer) => customer.id === id)!
  const copy = (customer: Customer) => structuredClone(customer)
  const routeName = (routeId: string) => routes.find((route) => route.id === routeId)?.name ?? ''
  const hasActiveMeter = (customer: Customer) => customer.meters.some((meter) => meter.status === 'active')
  let meterCount = 0
  const newMeter = (meter: Omit<Meter, 'id' | 'status'>): Meter => {
    if (customers.some((customer) => customer.meters.some((existing) => existing.number === meter.number))) {
      throw new FormError({ number: 'validation_not_unique' })
    }
    meterCount++
    return { id: `m-new${meterCount}`, ...meter, status: 'active' }
  }

  return {
    list: vi.fn(async () => customers.map(copy)),
    get: vi.fn(async (id) => copy(find(id))),
    create: vi.fn(async (details, meter) => {
      const meters = meter ? [newMeter(meter)] : []
      const customer: Customer = {
        id: `c-new${customers.length + 1}`,
        ...details,
        routeName: routeName(details.routeId),
        status: meter ? 'active' : 'pending',
        meters,
      }
      customers.push(customer)
      return copy(customer)
    }),
    update: vi.fn(async (id, changes) => {
      const customer = find(id)
      if (changes.status === 'active' && customer.status !== 'active' && !hasActiveMeter(customer)) {
        throw new FormError({ status: 'validation_no_active_meter' })
      }
      if (changes.status === 'pending' && customer.status !== 'pending') {
        throw new FormError({ status: 'validation_pending_only_new' })
      }
      Object.assign(customer, changes)
      customer.routeName = routeName(customer.routeId)
      return copy(customer)
    }),
    addMeter: vi.fn(async (customerId, meter) => {
      const customer = find(customerId)
      if (hasActiveMeter(customer)) throw new FormError({ customer: 'validation_customer_has_active_meter' })
      const added = newMeter(meter)
      customer.meters.push(added)
      if (customer.status === 'pending') customer.status = 'active'
      return { ...added }
    }),
    setMeterStatus: vi.fn(async (meterId, status) => {
      const customer = customers.find((candidate) => candidate.meters.some((meter) => meter.id === meterId))!
      const meter = customer.meters.find((candidate) => candidate.id === meterId)!
      if (status !== 'active' && customer.status === 'active') {
        throw new FormError({ status: 'validation_customer_needs_active_meter' })
      }
      meter.status = status
      return { ...meter }
    }),
  }
}

export function fakeApi(overrides: Partial<Api> = {}): Api {
  return {
    staff: fakeStaffDirectory(),
    routes: fakeRouteDirectory(),
    customers: fakeCustomerRegister(),
    ...overrides,
  }
}

/** Sample data for the customer pages. */
export const sampleRoutes: ReadingRoute[] = [
  { id: 'r1', name: 'สาย 1' },
  { id: 'r2', name: 'สาย 2' },
]

const sampleMeter = (id: string, number: string, status: MeterStatus = 'active') => ({
  id,
  number,
  size: '1/2' as const,
  installedOn: '2026-01-15',
  startReading: 0,
  status,
})

export const sampleCustomers: Customer[] = [
  { id: 'c1', houseNo: '10', moo: 2, name: 'นายมานะ ใจดี', phone: '0811111111', routeId: 'r1', routeName: 'สาย 1', status: 'active', meters: [sampleMeter('m1', 'WM-001')] },
  { id: 'c2', houseNo: '9', moo: 2, name: 'นางสมศรี มีสุข', phone: '', routeId: 'r1', routeName: 'สาย 1', status: 'water_cut', meters: [sampleMeter('m2', 'WM-002')] },
  { id: 'c3', houseNo: '12/3', moo: 1, name: 'นายปิติ ชูใจ', phone: '', routeId: 'r1', routeName: 'สาย 1', status: 'pending', meters: [] },
  { id: 'c4', houseNo: '2', moo: 2, name: 'นางวีณา รักษ์ดี', phone: '', routeId: 'r1', routeName: 'สาย 1', status: 'cancelled', meters: [sampleMeter('m3', 'WM-003', 'removed')] },
  { id: 'c5', houseNo: '1', moo: 1, name: 'นายกล้า หาญ', phone: '', routeId: 'r2', routeName: 'สาย 2', status: 'active', meters: [sampleMeter('m5', 'WM-005')] },
]

/** An Api with the sample routes and customers. */
export function customerApi() {
  return fakeApi({
    customers: fakeCustomerRegister(sampleCustomers, sampleRoutes),
    routes: fakeRouteDirectory(sampleRoutes),
  })
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
