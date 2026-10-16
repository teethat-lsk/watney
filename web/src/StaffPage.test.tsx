import { cleanup, fireEvent, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import type { StaffAccount } from './staff'
import { admin, fakeApi, fakeStaffDirectory, renderApp } from './testing'

const accounts: StaffAccount[] = [
  { ...admin, active: true },
  { id: 'u3', email: 'reader@example.com', name: 'สมปอง', role: 'meter_reader', active: true },
  { id: 'u4', email: 'old@example.com', name: 'สมใจ', role: 'office', active: false },
]

function openStaffPage(initial = accounts) {
  const api = fakeApi({ staff: fakeStaffDirectory(initial) })
  renderApp({ staff: admin, api, path: '/staff' })
  return api
}

async function row(name: string) {
  return (await screen.findByRole('cell', { name })).closest('tr')!
}

/** The name, email, role and status cells of a row. */
function columns(row: HTMLElement) {
  return within(row).getAllByRole('cell').slice(0, 4).map((cell) => cell.textContent)
}

function fill(form: HTMLElement, label: string, value: string) {
  fireEvent.change(within(form).getByLabelText(label), { target: { value } })
}

afterEach(cleanup)

describe('Staff page', () => {
  it('lists staff with their role and whether they can log in', async () => {
    openStaffPage()

    expect(columns(await row('สมปอง'))).toEqual(['สมปอง', 'reader@example.com', 'เจ้าหน้าที่จดมาตร', 'ใช้งาน'])
    expect(columns(await row('สมใจ'))).toEqual(['สมใจ', 'old@example.com', 'เจ้าหน้าที่สำนักงาน', 'ปิดใช้งาน'])
  })

  it('creates a staff account with a role', async () => {
    const api = openStaffPage()
    const form = screen.getByRole('form', { name: 'เพิ่มพนักงาน' })

    fill(form, 'ชื่อ', 'สมหมาย')
    fill(form, 'อีเมล', 'new@example.com')
    fill(form, 'รหัสผ่าน', 'new-password')
    fill(form, 'บทบาท', 'office')
    fireEvent.click(within(form).getByRole('button', { name: 'เพิ่มพนักงาน' }))

    expect(columns(await row('สมหมาย'))[2]).toBe('เจ้าหน้าที่สำนักงาน')
    expect(api.staff.create).toHaveBeenCalledWith({
      name: 'สมหมาย',
      email: 'new@example.com',
      password: 'new-password',
      role: 'office',
    })
  })

  it('says so when the email is already used', async () => {
    openStaffPage()
    const form = screen.getByRole('form', { name: 'เพิ่มพนักงาน' })

    fill(form, 'ชื่อ', 'ซ้ำ')
    fill(form, 'อีเมล', 'reader@example.com')
    fill(form, 'รหัสผ่าน', 'new-password')
    fireEvent.click(within(form).getByRole('button', { name: 'เพิ่มพนักงาน' }))

    expect((await within(form).findByRole('alert')).textContent).toBe('อีเมลนี้มีผู้ใช้แล้ว')
  })

  it("changes a staff member's name, role and password", async () => {
    const api = openStaffPage()
    fireEvent.click(within(await row('สมปอง')).getByRole('button', { name: 'แก้ไข' }))
    const form = screen.getByRole('form', { name: 'แก้ไขพนักงาน' })

    fill(form, 'ชื่อ', 'สมปองใหม่')
    fill(form, 'บทบาท', 'office')
    fill(form, 'รหัสผ่านใหม่', 'another-password')
    fireEvent.click(within(form).getByRole('button', { name: 'บันทึก' }))

    expect(columns(await row('สมปองใหม่'))[2]).toBe('เจ้าหน้าที่สำนักงาน')
    expect(api.staff.update).toHaveBeenCalledWith('u3', {
      name: 'สมปองใหม่',
      role: 'office',
      password: 'another-password',
    })
  })

  it('keeps the password when the new password is left blank', async () => {
    const api = openStaffPage()
    fireEvent.click(within(await row('สมปอง')).getByRole('button', { name: 'แก้ไข' }))
    const form = screen.getByRole('form', { name: 'แก้ไขพนักงาน' })

    fireEvent.click(within(form).getByRole('button', { name: 'บันทึก' }))

    expect(await screen.findByRole('form', { name: 'เพิ่มพนักงาน' })).toBeDefined()
    expect(api.staff.update).toHaveBeenCalledWith('u3', { name: 'สมปอง', role: 'meter_reader' })
  })

  it('deactivates and reactivates a staff account', async () => {
    const api = openStaffPage()

    fireEvent.click(within(await row('สมปอง')).getByRole('button', { name: 'ปิดใช้งาน' }))
    expect(await within(await row('สมปอง')).findByRole('button', { name: 'เปิดใช้งาน' })).toBeDefined()
    expect(api.staff.update).toHaveBeenCalledWith('u3', { active: false })

    fireEvent.click(within(await row('สมใจ')).getByRole('button', { name: 'เปิดใช้งาน' }))
    expect(await within(await row('สมใจ')).findByRole('button', { name: 'ปิดใช้งาน' })).toBeDefined()
    expect(api.staff.update).toHaveBeenCalledWith('u4', { active: true })
  })

  it("doesn't let admins deactivate themselves or change their own role", async () => {
    openStaffPage()
    const own = await row('สมชาย')

    expect(within(own).queryByRole('button', { name: 'ปิดใช้งาน' })).toBeNull()
    fireEvent.click(within(own).getByRole('button', { name: 'แก้ไข' }))
    expect((within(screen.getByRole('form', { name: 'แก้ไขพนักงาน' })).getByLabelText('บทบาท') as HTMLSelectElement).disabled).toBe(true)
  })
})
