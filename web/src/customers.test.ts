import PocketBase from 'pocketbase'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { pocketbaseCustomerRegister } from './customers'
import { FormError } from './formError'

const meterRecord = {
  id: 'm1',
  collectionName: 'meters',
  number: 'WM-001',
  size: '3/4',
  installed_on: '2026-01-15 00:00:00.000Z',
  start_reading: 12.5,
  customer: 'c1',
  status: 'active',
}

const customerRecord = {
  id: 'c1',
  collectionName: 'customers',
  house_no: '12/3',
  moo: 4,
  name: 'นายมานะ ใจดี',
  phone: '0812345678',
  status: 'active',
  route: 'r1',
  expand: {
    route: { id: 'r1', collectionName: 'routes', name: 'สาย 1' },
    meters_via_customer: [meterRecord],
  },
}

type Fetch = (url: string, init?: RequestInit) => Promise<Response>

/** Answers each request with the next of `responses` (status and body), and records the requests. */
function respond(...responses: [number, unknown][]) {
  const fetch = vi.fn<Fetch>(async () => {
    const [status, body] = responses.shift()!
    return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
  })
  vi.stubGlobal('fetch', fetch)
  return fetch
}

const register = () => pocketbaseCustomerRegister(new PocketBase('http://pb.test'))

describe('pocketbaseCustomerRegister', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('lists customers with their route and meters', async () => {
    respond([200, { items: [customerRecord], page: 1, perPage: 1000, totalItems: 1, totalPages: 1 }])

    expect(await register().list()).toEqual([
      {
        id: 'c1',
        houseNo: '12/3',
        moo: 4,
        name: 'นายมานะ ใจดี',
        phone: '0812345678',
        routeId: 'r1',
        routeName: 'สาย 1',
        status: 'active',
        meters: [{ id: 'm1', number: 'WM-001', size: '3/4', installedOn: '2026-01-15', startReading: 12.5, status: 'active' }],
      },
    ])
  })

  it('registers a customer with their first meter in one batch: pending, the meter, then active', async () => {
    const fetch = respond([200, []], [200, customerRecord])

    const customer = await register().create(
      { houseNo: '12/3', moo: 4, name: 'นายมานะ ใจดี', phone: '0812345678', routeId: 'r1' },
      { number: 'WM-001', size: '3/4', installedOn: '2026-01-15', startReading: 12.5 },
    )

    const [url, init] = fetch.mock.calls[0]
    expect(url).toBe('http://pb.test/api/batch')
    const requests = JSON.parse(String(init?.body)).requests
    const id = requests[0].body.id
    expect(id).toMatch(/^[a-z0-9]{15}$/)
    expect(requests).toEqual([
      {
        method: 'POST',
        url: '/api/collections/customers/records',
        body: { id, house_no: '12/3', moo: 4, name: 'นายมานะ ใจดี', phone: '0812345678', route: 'r1', status: 'pending' },
      },
      {
        method: 'POST',
        url: '/api/collections/meters/records',
        body: { number: 'WM-001', size: '3/4', installed_on: '2026-01-15', start_reading: 12.5, customer: id, status: 'active' },
      },
      { method: 'PATCH', url: `/api/collections/customers/records/${id}`, body: { status: 'active' } },
    ])
    expect(customer.status).toBe('active')
  })

  it("reports the fields a batch request rejected, such as a meter number that's taken", async () => {
    respond([400, {
      status: 400,
      message: 'Batch transaction failed.',
      data: {
        requests: {
          1: {
            code: 'batch_request_failed',
            message: 'Batch request failed.',
            response: { status: 400, message: 'Failed to create record.', data: { number: { code: 'validation_not_unique', message: 'Value must be unique.' } } },
          },
        },
      },
    }])

    await expect(register().create(
      { houseNo: '1', moo: 1, name: 'ซ้ำ', phone: '', routeId: 'r1' },
      { number: 'WM-001', size: '1/2', installedOn: '2026-01-15', startReading: 0 },
    )).rejects.toEqual(new FormError({ number: 'validation_not_unique' }))
  })

  it('registers a customer without a meter as pending', async () => {
    const fetch = respond([200, { ...customerRecord, status: 'pending', expand: { ...customerRecord.expand, meters_via_customer: undefined } }])

    const customer = await register().create({ houseNo: '1', moo: 1, name: 'รอมาตร', phone: '', routeId: 'r1' })

    expect(JSON.parse(String(fetch.mock.calls[0][1]?.body))).toMatchObject({ status: 'pending' })
    expect([customer.status, customer.meters]).toEqual(['pending', []])
  })
})
