import type PocketBase from 'pocketbase'
import type { RecordModel } from 'pocketbase'
import { toFormError } from './formError'

/** `pending` customers wait for a meter; only `active` ones need an active meter. */
export type CustomerStatus = 'pending' | 'active' | 'water_cut' | 'cancelled'

/** A customer's details as office staff enter them. */
export interface CustomerDetails {
  houseNo: string
  moo: number
  name: string
  phone: string
  routeId: string
}

/** A customer (ผู้ใช้น้ำ) with their route's name and every meter linked to them. */
export interface Customer extends CustomerDetails {
  id: string
  routeName: string
  status: CustomerStatus
  meters: Meter[]
}

/** Pipe size in inches. */
export type MeterSize = '1/2' | '3/4' | '1' | '1-1/2' | '2'

export type MeterStatus = 'active' | 'removed'

export interface NewMeter {
  number: string
  size: MeterSize
  /** YYYY-MM-DD */
  installedOn: string
  /** The reading the meter's first billed reading is measured from. */
  startReading: number
}

export interface Meter extends NewMeter {
  id: string
  status: MeterStatus
}

export type CustomerChanges = Partial<CustomerDetails> & { status?: CustomerStatus }

/**
 * The customer and meter register. Save failures the user can fix are thrown as
 * FormError, with the backend's field names (`number`, `status`, …).
 */
export interface CustomerRegister {
  list(): Promise<Customer[]>
  get(id: string): Promise<Customer>
  /** With a first meter the customer is active; without one, pending. Saves both or neither. */
  create(details: CustomerDetails, meter?: NewMeter): Promise<Customer>
  update(id: string, changes: CustomerChanges): Promise<Customer>
  /** Registers an active meter for the customer. */
  addMeter(customerId: string, meter: NewMeter): Promise<Meter>
  setMeterStatus(meterId: string, status: MeterStatus): Promise<Meter>
}

// The route's name and the customer's meters come along with each customer.
const expand = 'route,meters_via_customer'
const records = (collection: string) => `/api/collections/${collection}/records`

export function pocketbaseCustomerRegister(pb: PocketBase): CustomerRegister {
  const customers = pb.collection('customers')
  const meters = pb.collection('meters')

  async function get(id: string) {
    return toCustomer(await customers.getOne(id, { expand }))
  }

  return {
    async list() {
      return (await customers.getFullList({ expand })).map(toCustomer)
    },

    get,

    async create(details, meter) {
      if (!meter) {
        return toCustomer(await saving(customers.create({ ...toCustomerBody(details), status: 'pending' }, { expand })))
      }
      // An active customer needs an active meter, and the meter needs the customer
      // to exist: so create the customer as pending, then its meter, then activate
      // it, in one transaction. The client picks the id so the meter can refer to it.
      const id = newRecordId()
      await saving(
        pb.send('/api/batch', {
          method: 'POST',
          body: {
            requests: [
              { method: 'POST', url: records('customers'), body: { id, ...toCustomerBody(details), status: 'pending' } },
              { method: 'POST', url: records('meters'), body: { ...toMeterBody(meter), customer: id, status: 'active' } },
              { method: 'PATCH', url: `${records('customers')}/${id}`, body: { status: 'active' } },
            ],
          },
        }),
      )
      return get(id)
    },

    async update(id, { status, ...details }) {
      return toCustomer(await saving(customers.update(id, { ...toCustomerBody(details), status }, { expand })))
    },

    async addMeter(customerId, meter) {
      return toMeter(await saving(meters.create({ ...toMeterBody(meter), customer: customerId, status: 'active' })))
    },

    async setMeterStatus(meterId, status) {
      return toMeter(await saving(meters.update(meterId, { status })))
    },
  }
}

async function saving<T>(request: Promise<T>): Promise<T> {
  try {
    return await request
  } catch (error) {
    throw toFormError(error)
  }
}

/** A random id in PocketBase's format: 15 characters of a–z and 0–9. */
function newRecordId(): string {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789'
  return Array.from(crypto.getRandomValues(new Uint8Array(15)), (byte) => alphabet[byte % alphabet.length]).join('')
}

function toCustomerBody(details: Partial<CustomerDetails>) {
  return {
    house_no: details.houseNo,
    moo: details.moo,
    name: details.name,
    phone: details.phone,
    route: details.routeId,
  }
}

function toMeterBody(meter: NewMeter) {
  return {
    number: meter.number,
    size: meter.size,
    installed_on: meter.installedOn,
    start_reading: meter.startReading,
  }
}

function toCustomer(record: RecordModel): Customer {
  return {
    id: record.id,
    houseNo: record.house_no,
    moo: record.moo,
    name: record.name,
    phone: record.phone ?? '',
    routeId: record.route,
    routeName: record.expand?.route?.name ?? '',
    status: record.status,
    meters: (record.expand?.meters_via_customer ?? []).map(toMeter),
  }
}

function toMeter(record: RecordModel): Meter {
  return {
    id: record.id,
    number: record.number,
    size: record.size,
    // PocketBase dates look like "2026-01-15 00:00:00.000Z".
    installedOn: record.installed_on.slice(0, 10),
    startReading: record.start_reading,
    status: record.status,
  }
}
