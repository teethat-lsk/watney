import { cleanup, fireEvent, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { customerApi, office, renderApp } from './testing'

/** The names in the customer table, top to bottom. */
function listedNames() {
  const table = screen.getByRole('table', { name: 'รายชื่อผู้ใช้น้ำ' })
  return within(table).getAllByRole('row').slice(1).map((row) => within(row).getAllByRole('cell')[2].textContent)
}

function search(label: string, value: string) {
  fireEvent.change(within(screen.getByRole('search')).getByLabelText(label), { target: { value } })
}

function fill(form: HTMLElement, label: string, value: string) {
  fireEvent.change(within(form).getByLabelText(label), { target: { value } })
}

afterEach(cleanup)

describe('Customers page', () => {
  it('lists customers by route, หมู่ and house number, with their meters and status', async () => {
    renderApp({ staff: office, api: customerApi(), path: '/customers' })

    expect(await screen.findByRole('cell', { name: 'นายมานะ ใจดี' })).toBeDefined()
    expect(listedNames()).toEqual(['นายปิติ ชูใจ', 'นางวีณา รักษ์ดี', 'นางสมศรี มีสุข', 'นายมานะ ใจดี', 'นายกล้า หาญ'])
    const row = screen.getByRole('cell', { name: 'นายมานะ ใจดี' }).closest('tr')!
    expect(within(row).getAllByRole('cell').map((cell) => cell.textContent)).toEqual([
      '10', '2', 'นายมานะ ใจดี', '0811111111', 'สาย 1', 'WM-001', 'ปกติ',
    ])
  })

  it('searches by name, house number or meter number', async () => {
    renderApp({ staff: office, api: customerApi(), path: '/customers' })
    await screen.findByRole('cell', { name: 'นายมานะ ใจดี' })

    search('ค้นหา', 'สมศรี')
    expect(listedNames()).toEqual(['นางสมศรี มีสุข'])
    search('ค้นหา', '12/3')
    expect(listedNames()).toEqual(['นายปิติ ชูใจ'])
    search('ค้นหา', 'wm-005')
    expect(listedNames()).toEqual(['นายกล้า หาญ'])
  })

  it('filters by หมู่, route and status', async () => {
    renderApp({ staff: office, api: customerApi(), path: '/customers' })
    await screen.findByRole('cell', { name: 'นายมานะ ใจดี' })

    search('หมู่ที่', '1')
    expect(listedNames()).toEqual(['นายปิติ ชูใจ', 'นายกล้า หาญ'])
    search('หมู่ที่', '')
    search('เส้นทาง', 'r2')
    expect(listedNames()).toEqual(['นายกล้า หาญ'])
    search('เส้นทาง', '')
    search('สถานะ', 'cancelled')
    expect(listedNames()).toEqual(['นางวีณา รักษ์ดี'])
  })

  it('registers a customer with their first meter, who is then active', async () => {
    const api = customerApi()
    renderApp({ staff: office, api, path: '/customers/new' })
    const form = await screen.findByRole('form', { name: 'เพิ่มผู้ใช้น้ำ' })
    await within(form).findByRole('option', { name: 'สาย 2' })

    fill(form, 'บ้านเลขที่', '45')
    fill(form, 'หมู่ที่', '3')
    fill(form, 'ชื่อ', 'นายใหม่ ใจงาม')
    fill(form, 'โทรศัพท์', '0899999999')
    fill(form, 'เส้นทาง', 'r2')
    fill(form, 'หมายเลขมาตร', 'WM-100')
    fill(form, 'ขนาดมาตร', '3/4')
    fill(form, 'วันที่ติดตั้ง', '2026-10-01')
    fill(form, 'เลขมาตรเริ่มต้น', '12.5')
    fireEvent.click(within(form).getByRole('button', { name: 'บันทึก' }))

    expect(await screen.findByRole('heading', { name: 'นายใหม่ ใจงาม' })).toBeDefined()
    expect(screen.getByText('สถานะ: ปกติ')).toBeDefined()
    expect(api.customers.create).toHaveBeenCalledWith(
      { houseNo: '45', moo: 3, name: 'นายใหม่ ใจงาม', phone: '0899999999', routeId: 'r2' },
      { number: 'WM-100', size: '3/4', installedOn: '2026-10-01', startReading: 12.5 },
    )
  })

  it('registers a customer without a meter as waiting for one', async () => {
    const api = customerApi()
    renderApp({ staff: office, api, path: '/customers/new' })
    const form = await screen.findByRole('form', { name: 'เพิ่มผู้ใช้น้ำ' })
    await within(form).findByRole('option', { name: 'สาย 2' })

    fill(form, 'บ้านเลขที่', '46')
    fill(form, 'หมู่ที่', '3')
    fill(form, 'ชื่อ', 'นางรอ มาตร')
    fill(form, 'เส้นทาง', 'r1')
    fireEvent.click(within(form).getByRole('button', { name: 'บันทึก' }))

    expect(await screen.findByText('สถานะ: รอติดตั้งมาตร')).toBeDefined()
    expect(api.customers.create).toHaveBeenCalledWith(
      { houseNo: '46', moo: 3, name: 'นางรอ มาตร', phone: '', routeId: 'r1' },
      undefined,
    )
  })

  it('says so when the meter number is already registered', async () => {
    renderApp({ staff: office, api: customerApi(), path: '/customers/new' })
    const form = await screen.findByRole('form', { name: 'เพิ่มผู้ใช้น้ำ' })
    await within(form).findByRole('option', { name: 'สาย 2' })

    fill(form, 'บ้านเลขที่', '47')
    fill(form, 'หมู่ที่', '3')
    fill(form, 'ชื่อ', 'นายซ้ำ')
    fill(form, 'เส้นทาง', 'r1')
    fill(form, 'หมายเลขมาตร', 'WM-001')
    fill(form, 'วันที่ติดตั้ง', '2026-10-01')
    fireEvent.click(within(form).getByRole('button', { name: 'บันทึก' }))

    expect((await within(form).findByRole('alert')).textContent).toBe('หมายเลขมาตรนี้มีอยู่แล้ว')
  })
})
