import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Api } from './api'
import { CustomerFields, MeterFields } from './CustomerFields'
import { customerMessages, readCustomerDetails, readMeter } from './customerForm'
import type { CustomerDetails, NewMeter } from './customers'
import { saveErrorMessage } from './formError'
import { queryKeys, useRouteList } from './queries'

export function NewCustomerPage({ api }: { api: Api }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const routes = useRouteList(api)
  const create = useMutation({
    mutationFn: ({ details, meter }: { details: CustomerDetails; meter?: NewMeter }) => api.customers.create(details, meter),
    onSuccess: (customer) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.customers })
      navigate(`/customers/${customer.id}`)
    },
  })

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    create.mutate({ details: readCustomerDetails(data), meter: readMeter(data) })
  }

  return (
    <>
      <h1>เพิ่มผู้ใช้น้ำ</h1>
      {routes.isPending && <p>กำลังโหลด…</p>}
      {routes.data && (
        <form aria-label="เพิ่มผู้ใช้น้ำ" onSubmit={handleSubmit}>
          <CustomerFields routes={routes.data} />
          <fieldset>
            <legend>มาตรน้ำ</legend>
            <p>ถ้ายังไม่ได้ติดตั้งมาตร ให้เว้นหมายเลขมาตรว่างไว้ ผู้ใช้น้ำจะมีสถานะรอติดตั้งมาตร</p>
            <MeterFields required={false} />
          </fieldset>
          {create.isError && <p role="alert">{saveErrorMessage(create.error, customerMessages)}</p>}
          <button type="submit" disabled={create.isPending}>
            บันทึก
          </button>
        </form>
      )}
    </>
  )
}
