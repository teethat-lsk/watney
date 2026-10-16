import { cleanup, fireEvent, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { fakeApi, fakeRouteDirectory, office, renderApp } from './testing'

function openRoutesPage() {
  const api = fakeApi({ routes: fakeRouteDirectory([{ id: 'r1', name: 'สายเหนือ' }]) })
  renderApp({ staff: office, api, path: '/routes' })
  return api
}

afterEach(cleanup)

describe('Routes page', () => {
  it('adds a route', async () => {
    const api = openRoutesPage()
    const form = screen.getByRole('form', { name: 'เพิ่มเส้นทาง' })

    fireEvent.change(within(form).getByLabelText('ชื่อเส้นทาง'), { target: { value: 'สายใต้' } })
    fireEvent.click(within(form).getByRole('button', { name: 'เพิ่มเส้นทาง' }))

    expect(await screen.findByRole('cell', { name: 'สายใต้' })).toBeDefined()
    expect(api.routes.create).toHaveBeenCalledWith('สายใต้')
  })

  it('renames a route', async () => {
    const api = openRoutesPage()
    const row = (await screen.findByRole('cell', { name: 'สายเหนือ' })).closest('tr')!

    fireEvent.click(within(row).getByRole('button', { name: 'เปลี่ยนชื่อ' }))
    const form = screen.getByRole('form', { name: 'เปลี่ยนชื่อเส้นทาง' })
    fireEvent.change(within(form).getByLabelText('ชื่อเส้นทาง'), { target: { value: 'สายเหนือบน' } })
    fireEvent.click(within(form).getByRole('button', { name: 'บันทึก' }))

    expect(await screen.findByRole('cell', { name: 'สายเหนือบน' })).toBeDefined()
    expect(api.routes.rename).toHaveBeenCalledWith('r1', 'สายเหนือบน')
  })

  it('says so when the route name is already used', async () => {
    openRoutesPage()
    const form = screen.getByRole('form', { name: 'เพิ่มเส้นทาง' })

    fireEvent.change(within(form).getByLabelText('ชื่อเส้นทาง'), { target: { value: 'สายเหนือ' } })
    fireEvent.click(within(form).getByRole('button', { name: 'เพิ่มเส้นทาง' }))

    expect((await within(form).findByRole('alert')).textContent).toBe('มีเส้นทางชื่อนี้แล้ว')
  })
})
