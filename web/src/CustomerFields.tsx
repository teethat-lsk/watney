import type { CustomerDetails } from './customers'
import { meterSizeLabels, meterSizes } from './customerLabels'
import type { ReadingRoute } from './routes'

/** The inputs for a customer's details; readCustomerDetails reads them. */
export function CustomerFields({ routes, customer }: { routes: ReadingRoute[]; customer?: CustomerDetails }) {
  return (
    <>
      <label>
        บ้านเลขที่ <input name="houseNo" defaultValue={customer?.houseNo} required />
      </label>
      <label>
        หมู่ที่ <input name="moo" type="number" min={1} step={1} defaultValue={customer?.moo} required />
      </label>
      <label>
        ชื่อ <input name="name" defaultValue={customer?.name} required />
      </label>
      <label>
        โทรศัพท์ <input name="phone" type="tel" defaultValue={customer?.phone} />
      </label>
      <label>
        เส้นทาง{' '}
        <select name="routeId" defaultValue={customer?.routeId ?? ''} required>
          <option value="" disabled>
            เลือกเส้นทาง
          </option>
          {routes.map((route) => (
            <option key={route.id} value={route.id}>
              {route.name}
            </option>
          ))}
        </select>
      </label>
    </>
  )
}

/** The inputs for a new meter; readMeter reads them. */
export function MeterFields({ required }: { required: boolean }) {
  return (
    <>
      <label>
        หมายเลขมาตร <input name="number" required={required} />
      </label>
      <label>
        ขนาดมาตร{' '}
        <select name="size" defaultValue="1/2">
          {meterSizes.map((size) => (
            <option key={size} value={size}>
              {meterSizeLabels[size]}
            </option>
          ))}
        </select>
      </label>
      <label>
        วันที่ติดตั้ง <input name="installedOn" type="date" required={required} />
      </label>
      <label>
        เลขมาตรเริ่มต้น <input name="startReading" type="number" min={0} step="any" defaultValue={0} />
      </label>
    </>
  )
}
