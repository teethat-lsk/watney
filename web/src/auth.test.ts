import PocketBase from 'pocketbase'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LoginError, pocketbaseAuth } from './auth'

// A token PocketBase's auth store accepts as unexpired (it only decodes the payload).
const payload = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })).replace(/=+$/, '')
const token = `e30.${payload}.signature`

const record = {
  id: 'u1',
  collectionId: 'users',
  collectionName: 'users',
  email: 'admin@example.com',
  name: 'สมชาย',
  role: 'admin',
}

function respond(status: number, body: unknown) {
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })))
}

describe('pocketbaseAuth', () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => vi.unstubAllGlobals())

  it('logs in, keeps the session, and logs out', async () => {
    respond(200, { token, record })
    const auth = pocketbaseAuth(new PocketBase('http://pb.test'))

    const staff = await auth.login('admin@example.com', 'secret-password')

    expect(staff).toEqual({ id: 'u1', email: 'admin@example.com', name: 'สมชาย', role: 'admin' })
    expect(auth.current()).toEqual(staff)
    auth.logout()
    expect(auth.current()).toBeNull()
  })

  it('rejects wrong credentials as invalid', async () => {
    respond(400, { status: 400, message: 'Failed to authenticate.', data: {} })
    const auth = pocketbaseAuth(new PocketBase('http://pb.test'))

    await expect(auth.login('admin@example.com', 'wrong-password')).rejects.toEqual(new LoginError('invalid'))
    expect(auth.current()).toBeNull()
  })

  it('rejects a deactivated account as inactive', async () => {
    respond(403, { status: 403, message: "The request doesn't satisfy the collection requirements to authenticate.", data: {} })
    const auth = pocketbaseAuth(new PocketBase('http://pb.test'))

    await expect(auth.login('old@example.com', 'secret-password')).rejects.toEqual(new LoginError('inactive'))
  })

  it('refreshes a stored session with the current role', async () => {
    respond(200, { token, record })
    const pb = new PocketBase('http://pb.test')
    pb.authStore.save(token, { ...record, role: 'office' })

    expect(await pocketbaseAuth(pb).refresh()).toMatchObject({ role: 'admin' })
  })

  it('drops a stored session the backend no longer accepts', async () => {
    const pb = new PocketBase('http://pb.test')
    pb.authStore.save(token, record)
    const auth = pocketbaseAuth(pb)

    for (const status of [401, 403]) {
      respond(status, { status, message: 'Rejected.', data: {} })
      expect(await auth.refresh()).toBeNull()
      expect(auth.current()).toBeNull()
      pb.authStore.save(token, record)
    }
  })

  it('keeps the stored session when the backend can\'t be reached to refresh it', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new TypeError('fetch failed'))))
    const pb = new PocketBase('http://pb.test')
    pb.authStore.save(token, record)

    expect(await pocketbaseAuth(pb).refresh()).toMatchObject({ id: 'u1', role: 'admin' })
  })

  it('reports a backend that does not answer as unreachable', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new TypeError('fetch failed'))))
    const auth = pocketbaseAuth(new PocketBase('http://pb.test'))

    await expect(auth.login('admin@example.com', 'secret-password')).rejects.toMatchObject({ reason: 'unreachable' })
  })

  it('reports a proxy error as unreachable', async () => {
    respond(500, {})
    const auth = pocketbaseAuth(new PocketBase('http://pb.test'))

    await expect(auth.login('admin@example.com', 'secret-password')).rejects.toMatchObject({ reason: 'unreachable' })
  })
})
