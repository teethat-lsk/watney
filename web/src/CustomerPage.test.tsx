import { cleanup, fireEvent, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { admin, customerApi, renderApp } from './testing'

function fill(form: HTMLElement, label: string, value: string) {
  fireEvent.change(within(form).getByLabelText(label), { target: { value } })
}

async function editForm() {
  const form = await screen.findByRole('form', { name: 'แก้ไขผู้ใช้น้ำ' })
  await within(form).findByRole('option', { name: 'สาย 2' })
  return form
}

/** The number, size, install date, starting reading and status cells of a meter's row. */
function meterRow(number: string) {
  const row = screen.getByRole('cell', { name: number }).closest('tr')!
  return { row, columns: within(row).getAllByRole('cell').slice(0, 5).map((cell) => cell.textContent) }
}

afterEach(cleanup)

describe('Customer page', () => {
  it("edits a customer's details", async () => {
    const api = customerApi()
    renderApp({ staff: admin, api, path: '/customers/c1' })
    const form = await editForm()

    fill(form, 'ชื่อ', 'นายมานะ ใจดีมาก')
    fill(form, 'หมู่ที่', '4')
    fill(form, 'เส้นทาง', 'r2')
    fireEvent.click(within(form).getByRole('button', { name: 'บันทึก' }))

    expect(await screen.findByRole('heading', { name: 'นายมานะ ใจดีมาก' })).toBeDefined()
    expect(api.customers.update).toHaveBeenCalledWith('c1', {
      houseNo: '10',
      moo: 4,
      name: 'นายมานะ ใจดีมาก',
      phone: '0811111111',
      routeId: 'r2',
      status: 'active',
    })
  })

  it('cancels a customer', async () => {
    renderApp({ staff: admin, api: customerApi(), path: '/customers/c1' })
    const form = await editForm()

    fill(form, 'สถานะ', 'cancelled')
    fireEvent.click(within(form).getByRole('button', { name: 'บันทึก' }))

    expect(await screen.findByText('สถานะ: ยกเลิก')).toBeDefined()
  })

  it("won't make a customer active until they have an active meter", async () => {
    renderApp({ staff: admin, api: customerApi(), path: '/customers/c3' })
    const form = await editForm()

    fill(form, 'สถานะ', 'active')
    fireEvent.click(within(form).getByRole('button', { name: 'บันทึก' }))

    expect((await within(form).findByRole('alert')).textContent).toBe('ต้องมีมาตรที่ใช้งานอยู่ก่อน จึงตั้งสถานะเป็นปกติได้')
  })

  it("lists the customer's meters", async () => {
    renderApp({ staff: admin, api: customerApi(), path: '/customers/c4' })

    expect(await screen.findByRole('cell', { name: 'WM-003' })).toBeDefined()
    expect(meterRow('WM-003').columns).toEqual(['WM-003', '½ นิ้ว', '15/1/2569', '0', 'ถอดแล้ว'])
  })

  it('registers a meter for the customer', async () => {
    const api = customerApi()
    renderApp({ staff: admin, api, path: '/customers/c3' })
    const form = await screen.findByRole('form', { name: 'เพิ่มมาตร' })

    fill(form, 'หมายเลขมาตร', 'WM-300')
    fill(form, 'ขนาดมาตร', '1')
    fill(form, 'วันที่ติดตั้ง', '2026-10-02')
    fill(form, 'เลขมาตรเริ่มต้น', '0')
    fireEvent.click(within(form).getByRole('button', { name: 'เพิ่มมาตร' }))

    expect(await screen.findByRole('cell', { name: 'WM-300' })).toBeDefined()
    expect(meterRow('WM-300').columns).toEqual(['WM-300', '1 นิ้ว', '2/10/2569', '0', 'ใช้งาน'])
    expect(api.customers.addMeter).toHaveBeenCalledWith('c3', { number: 'WM-300', size: '1', installedOn: '2026-10-02', startReading: 0 })
  })

  it("won't remove an active customer's last active meter", async () => {
    renderApp({ staff: admin, api: customerApi(), path: '/customers/c1' })
    await screen.findByRole('cell', { name: 'WM-001' })

    fireEvent.click(within(meterRow('WM-001').row).getByRole('button', { name: 'ถอดมาตร' }))

    expect((await screen.findByRole('alert')).textContent).toBe(
      'มาตรนี้เป็นมาตรเดียวที่ใช้งานอยู่ของผู้ใช้น้ำรายนี้ เพิ่มมาตรใหม่หรือเปลี่ยนสถานะผู้ใช้น้ำก่อน',
    )
  })

  it("removes the meter of a customer who isn't active", async () => {
    const api = customerApi()
    renderApp({ staff: admin, api, path: '/customers/c2' })
    await screen.findByRole('cell', { name: 'WM-002' })
    // water cut is not active, so the meter can go
    fireEvent.click(within(meterRow('WM-002').row).getByRole('button', { name: 'ถอดมาตร' }))

    expect(await within(meterRow('WM-002').row).findByRole('cell', { name: 'ถอดแล้ว' })).toBeDefined()
    expect(api.customers.setMeterStatus).toHaveBeenCalledWith('m2', 'removed')
  })
})
