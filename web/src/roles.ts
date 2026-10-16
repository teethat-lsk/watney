import type { Role } from './auth'

export const roleLabels: Record<Role, string> = {
  meter_reader: 'เจ้าหน้าที่จดมาตร',
  office: 'เจ้าหน้าที่สำนักงาน',
  admin: 'ผู้ดูแลระบบ',
}

export const roles = Object.keys(roleLabels) as Role[]
