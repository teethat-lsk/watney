import type { CustomerStatus, MeterSize, MeterStatus } from './customers'

export const customerStatusLabels: Record<CustomerStatus, string> = {
  pending: 'รอติดตั้งมาตร',
  active: 'ปกติ',
  water_cut: 'ตัดน้ำ',
  cancelled: 'ยกเลิก',
}

export const customerStatuses = Object.keys(customerStatusLabels) as CustomerStatus[]

export const meterSizeLabels: Record<MeterSize, string> = {
  '1/2': '½ นิ้ว',
  '3/4': '¾ นิ้ว',
  '1': '1 นิ้ว',
  '1-1/2': '1½ นิ้ว',
  '2': '2 นิ้ว',
}

export const meterSizes = Object.keys(meterSizeLabels) as MeterSize[]

export const meterStatusLabels: Record<MeterStatus, string> = {
  active: 'ใช้งาน',
  removed: 'ถอดแล้ว',
}

/** A YYYY-MM-DD date as Thai readers expect it: day/month/Buddhist-era year. */
export function thaiDate(date: string): string {
  const [year, month, day] = date.split('-').map(Number)
  return `${day}/${month}/${year + 543}`
}
