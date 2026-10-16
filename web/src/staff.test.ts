import PocketBase from 'pocketbase'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { FormError } from './formError'
import { pocketbaseStaffDirectory } from './staff'

const record = {
  id: 'u3',
  collectionId: 'users',
  collectionName: 'users',
  email: 'reader@example.com',
  name: 'สมปอง',
  role: 'meter_reader',
  active: true,
  verified: true,
}

function respond(status: number, body: unknown) {
  const fetch = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(async () => new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  }))
  vi.stubGlobal('fetch', fetch)
  return fetch
}

function sentBody(fetch: ReturnType<typeof respond>) {
  return JSON.parse(String(fetch.mock.calls[0][1]?.body))
}

describe('pocketbaseStaffDirectory', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('lists staff accounts', async () => {
    respond(200, { items: [record], page: 1, perPage: 1000, totalItems: 1, totalPages: 1 })

    const accounts = await pocketbaseStaffDirectory(new PocketBase('http://pb.test')).list()

    expect(accounts).toEqual([{ id: 'u3', email: 'reader@example.com', name: 'สมปอง', role: 'meter_reader', active: true }])
  })

  it('creates an account that can log in straight away', async () => {
    const fetch = respond(200, record)

    await pocketbaseStaffDirectory(new PocketBase('http://pb.test')).create({
      email: 'reader@example.com',
      name: 'สมปอง',
      password: 'secret-password',
      role: 'meter_reader',
    })

    expect(sentBody(fetch)).toEqual({
      email: 'reader@example.com',
      name: 'สมปอง',
      password: 'secret-password',
      passwordConfirm: 'secret-password',
      role: 'meter_reader',
      active: true,
    })
  })

  it('reports which fields the backend rejected', async () => {
    respond(400, {
      status: 400,
      message: 'Failed to create record.',
      data: { email: { code: 'validation_not_unique', message: 'Value must be unique.' } },
    })
    const staff = pocketbaseStaffDirectory(new PocketBase('http://pb.test'))

    await expect(staff.create({ email: 'reader@example.com', name: 'ซ้ำ', password: 'secret-password', role: 'office' }))
      .rejects.toEqual(new FormError({ email: 'validation_not_unique' }))
  })

  it('confirms a new password when changing it', async () => {
    const fetch = respond(200, record)

    await pocketbaseStaffDirectory(new PocketBase('http://pb.test')).update('u3', { password: 'another-password' })

    expect(sentBody(fetch)).toEqual({ password: 'another-password', passwordConfirm: 'another-password' })
  })
})
