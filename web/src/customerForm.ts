import type { CustomerDetails, MeterSize, NewMeter } from './customers'
import type { FieldMessages } from './formError'

/** Messages for what the backend rejects on customer and meter saves. */
export const customerMessages: FieldMessages = {
  number: { validation_not_unique: 'หมายเลขมาตรนี้มีอยู่แล้ว' },
  installed_on: { validation_required: 'กรอกวันที่ติดตั้งมาตร' },
  status: {
    validation_no_active_meter: 'ต้องมีมาตรที่ใช้งานอยู่ก่อน จึงตั้งสถานะเป็นปกติได้',
    validation_customer_needs_active_meter:
      'มาตรนี้เป็นมาตรเดียวที่ใช้งานอยู่ของผู้ใช้น้ำรายนี้ เพิ่มมาตรใหม่หรือเปลี่ยนสถานะผู้ใช้น้ำก่อน',
  },
}

/** Reads the fields that CustomerFields renders. */
export function readCustomerDetails(data: FormData): CustomerDetails {
  return {
    houseNo: String(data.get('houseNo')).trim(),
    moo: Number(data.get('moo')),
    name: String(data.get('name')).trim(),
    phone: String(data.get('phone')).trim(),
    routeId: String(data.get('routeId')),
  }
}

/** Reads the fields that MeterFields renders, or nothing when the meter number is blank. */
export function readMeter(data: FormData): NewMeter | undefined {
  const number = String(data.get('number')).trim()
  if (!number) return undefined
  return {
    number,
    size: data.get('size') as MeterSize,
    installedOn: String(data.get('installedOn')),
    startReading: Number(data.get('startReading') || 0),
  }
}
