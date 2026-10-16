import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { Api } from './api'
import { customerStatuses, customerStatusLabels } from './customerLabels'
import type { Customer, CustomerStatus } from './customers'
import { queryKeys, useRouteList } from './queries'

interface Filter {
  /** Part of a name, house number or meter number. */
  text: string
  moo: string
  routeId: string
  status: CustomerStatus | ''
}

export function CustomersPage({ api }: { api: Api }) {
  const customers = useQuery({ queryKey: queryKeys.customers, queryFn: () => api.customers.list() })
  const routes = useRouteList(api)
  const [filter, setFilter] = useState<Filter>({ text: '', moo: '', routeId: '', status: '' })
  const set = (key: keyof Filter) => (event: { target: { value: string } }) =>
    setFilter((current) => ({ ...current, [key]: event.target.value }))
  const moos = [...new Set(customers.data?.map((customer) => customer.moo))].sort((a, b) => a - b)

  return (
    <>
      <h1>ผู้ใช้น้ำ</h1>
      <p>
        <Link to="/customers/new">เพิ่มผู้ใช้น้ำ</Link>
      </p>
      <form role="search" aria-label="ค้นหาผู้ใช้น้ำ" onSubmit={(event) => event.preventDefault()}>
        <label>
          ค้นหา{' '}
          <input type="search" value={filter.text} onChange={set('text')} placeholder="ชื่อ บ้านเลขที่ หรือหมายเลขมาตร" />
        </label>
        <label>
          หมู่ที่{' '}
          <select value={filter.moo} onChange={set('moo')}>
            <option value="">ทั้งหมด</option>
            {moos.map((moo) => (
              <option key={moo} value={moo}>
                {moo}
              </option>
            ))}
          </select>
        </label>
        <label>
          เส้นทาง{' '}
          <select value={filter.routeId} onChange={set('routeId')}>
            <option value="">ทั้งหมด</option>
            {routes.data?.map((route) => (
              <option key={route.id} value={route.id}>
                {route.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          สถานะ{' '}
          <select value={filter.status} onChange={set('status')}>
            <option value="">ทั้งหมด</option>
            {customerStatuses.map((status) => (
              <option key={status} value={status}>
                {customerStatusLabels[status]}
              </option>
            ))}
          </select>
        </label>
      </form>

      {customers.isPending && <p>กำลังโหลด…</p>}
      {customers.isError && <p role="alert">โหลดรายชื่อผู้ใช้น้ำไม่สำเร็จ</p>}
      {customers.data && (
        <table aria-label="รายชื่อผู้ใช้น้ำ">
          <thead>
            <tr>
              <th>บ้านเลขที่</th>
              <th>หมู่ที่</th>
              <th>ชื่อ</th>
              <th>โทรศัพท์</th>
              <th>เส้นทาง</th>
              <th>มาตร</th>
              <th>สถานะ</th>
            </tr>
          </thead>
          <tbody>
            {inRouteOrder(customers.data.filter((customer) => matches(customer, filter))).map((customer) => (
              <tr key={customer.id}>
                <td>{customer.houseNo}</td>
                <td>{customer.moo}</td>
                <td>
                  <Link to={`/customers/${customer.id}`}>{customer.name}</Link>
                </td>
                <td>{customer.phone}</td>
                <td>{customer.routeName}</td>
                <td>
                  {customer.meters
                    .filter((meter) => meter.status === 'active')
                    .map((meter) => meter.number)
                    .join(', ')}
                </td>
                <td>{customerStatusLabels[customer.status]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  )
}

/** Whether the customer passes the filter. The text matches any of their meters, removed ones too. */
function matches(customer: Customer, filter: Filter): boolean {
  const text = filter.text.trim().toLowerCase()
  const found =
    !text ||
    customer.name.toLowerCase().includes(text) ||
    customer.houseNo.toLowerCase().includes(text) ||
    customer.meters.some((meter) => meter.number.toLowerCase().includes(text))
  return (
    found &&
    (!filter.moo || customer.moo === Number(filter.moo)) &&
    (!filter.routeId || customer.routeId === filter.routeId) &&
    (!filter.status || customer.status === filter.status)
  )
}

/** Sorted by route, หมู่, then house number, with "9" before "10" and "12/3". */
function inRouteOrder(customers: Customer[]): Customer[] {
  const compare = (a: string, b: string) => a.localeCompare(b, 'th', { numeric: true })
  return [...customers].sort(
    (a, b) => compare(a.routeName, b.routeName) || a.moo - b.moo || compare(a.houseNo, b.houseNo),
  )
}
