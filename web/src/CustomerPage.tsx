import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import type { Api } from './api'
import { CustomerFields, MeterFields } from './CustomerFields'
import { customerMessages, readCustomerDetails, readMeter } from './customerForm'
import { customerStatuses, customerStatusLabels, meterSizeLabels, meterStatusLabels, thaiDate } from './customerLabels'
import type { Customer, CustomerChanges, CustomerRegister, CustomerStatus, MeterStatus, NewMeter } from './customers'
import { saveErrorMessage } from './formError'
import { queryKeys, useRouteList } from './queries'
import type { ReadingRoute } from './routes'

/** One customer: edit their details and status, and manage their meters. */
export function CustomerPage({ api }: { api: Api }) {
  const id = useParams().id!
  const register = api.customers
  const queryClient = useQueryClient()
  const customer = useQuery({ queryKey: queryKeys.customer(id), queryFn: () => register.get(id) })
  const routes = useRouteList(api)
  // Also refreshes this customer, whose key starts with the same prefix.
  const refresh = () => queryClient.invalidateQueries({ queryKey: queryKeys.customers })
  const setMeterStatus = useMutation({
    mutationFn: ({ meterId, status }: { meterId: string; status: MeterStatus }) => register.setMeterStatus(meterId, status),
    onSuccess: refresh,
  })

  if (customer.isPending) return <p>กำลังโหลด…</p>
  if (customer.isError) return <p role="alert">โหลดข้อมูลผู้ใช้น้ำไม่สำเร็จ</p>
  const { data } = customer

  return (
    <>
      <p>
        <Link to="/customers">ผู้ใช้น้ำทั้งหมด</Link>
      </p>
      <h1>{data.name}</h1>
      <p>สถานะ: {customerStatusLabels[data.status]}</p>
      {routes.data && <EditCustomerForm customer={data} routes={routes.data} register={register} onSaved={refresh} />}

      <h2>มาตรน้ำ</h2>
      {setMeterStatus.isError && <p role="alert">{saveErrorMessage(setMeterStatus.error, customerMessages)}</p>}
      <table aria-label="มาตรน้ำ">
        <thead>
          <tr>
            <th>หมายเลขมาตร</th>
            <th>ขนาด</th>
            <th>วันที่ติดตั้ง</th>
            <th>เลขมาตรเริ่มต้น</th>
            <th>สถานะ</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {data.meters.map((meter) => (
            <tr key={meter.id}>
              <td>{meter.number}</td>
              <td>{meterSizeLabels[meter.size]}</td>
              <td>{thaiDate(meter.installedOn)}</td>
              <td>{meter.startReading}</td>
              <td>{meterStatusLabels[meter.status]}</td>
              <td>
                {meter.status === 'active' && (
                  <button
                    type="button"
                    disabled={setMeterStatus.isPending}
                    onClick={() => setMeterStatus.mutate({ meterId: meter.id, status: 'removed' })}
                  >
                    ถอดมาตร
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {data.meters.some((meter) => meter.status === 'active') ? (
        <p>ผู้ใช้น้ำมีมาตรที่ใช้งานอยู่ได้ครั้งละหนึ่งเครื่อง การเปลี่ยนมาตรจะรองรับในขั้นต่อไป</p>
      ) : (
        <NewMeterForm customerId={data.id} register={register} onAdded={refresh} />
      )}
    </>
  )
}

interface EditCustomerFormProps {
  customer: Customer
  routes: ReadingRoute[]
  register: CustomerRegister
  onSaved: () => void
}

function EditCustomerForm({ customer, routes, register, onSaved }: EditCustomerFormProps) {
  const update = useMutation({
    mutationFn: (changes: CustomerChanges) => register.update(customer.id, changes),
    onSuccess: onSaved,
  })

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    update.mutate({ ...readCustomerDetails(data), status: data.get('status') as CustomerStatus })
  }

  return (
    <form aria-label="แก้ไขผู้ใช้น้ำ" onSubmit={handleSubmit}>
      <h2>ข้อมูลผู้ใช้น้ำ</h2>
      <CustomerFields routes={routes} customer={customer} />
      <label>
        สถานะ{' '}
        <select name="status" defaultValue={customer.status}>
          {/* `pending` is only for a new customer still waiting for their meter. */}
          {customerStatuses
            .filter((status) => status !== 'pending' || customer.status === 'pending')
            .map((status) => (
              <option key={status} value={status}>
                {customerStatusLabels[status]}
              </option>
            ))}
        </select>
      </label>
      {update.isError && <p role="alert">{saveErrorMessage(update.error, customerMessages)}</p>}
      <button type="submit" disabled={update.isPending}>
        บันทึก
      </button>
    </form>
  )
}

interface NewMeterFormProps {
  customerId: string
  register: CustomerRegister
  onAdded: () => void
}

function NewMeterForm({ customerId, register, onAdded }: NewMeterFormProps) {
  const add = useMutation({
    mutationFn: (meter: NewMeter) => register.addMeter(customerId, meter),
    onSuccess: onAdded,
  })

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const meter = readMeter(new FormData(form))
    if (meter) add.mutate(meter, { onSuccess: () => form.reset() })
  }

  return (
    <form aria-label="เพิ่มมาตร" onSubmit={handleSubmit}>
      <h2>เพิ่มมาตร</h2>
      <MeterFields required />
      {add.isError && <p role="alert">{saveErrorMessage(add.error, customerMessages)}</p>}
      <button type="submit" disabled={add.isPending}>
        เพิ่มมาตร
      </button>
    </form>
  )
}
