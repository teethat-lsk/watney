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
