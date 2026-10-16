import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import type { Api } from './api'
import { saveErrorMessage, type FieldMessages } from './formError'
import { queryKeys, useRouteList } from './queries'
import type { ReadingRoute } from './routes'

const messages: FieldMessages = {
  name: { validation_not_unique: 'มีเส้นทางชื่อนี้แล้ว' },
}

export function RoutesPage({ api }: { api: Api }) {
  const directory = api.routes
  const queryClient = useQueryClient()
  const routes = useRouteList(api)
  const [renaming, setRenaming] = useState<ReadingRoute | null>(null)
  const refresh = () => queryClient.invalidateQueries({ queryKey: queryKeys.routes })

  return (
    <>
      <h1>เส้นทาง</h1>
      <p>เส้นทางที่เจ้าหน้าที่จดมาตรเดินจดมาตร ผู้ดูแลระบบกำหนดเส้นทางให้เจ้าหน้าที่จดมาตรแต่ละคนได้ที่หน้าพนักงาน</p>
      {renaming ? (
        <RouteNameForm
          key={renaming.id}
          label="เปลี่ยนชื่อเส้นทาง"
          initialName={renaming.name}
          save={(name) => directory.rename(renaming.id, name)}
          onSaved={() => {
            setRenaming(null)
            refresh()
          }}
          onCancel={() => setRenaming(null)}
        />
      ) : (
        <RouteNameForm label="เพิ่มเส้นทาง" save={(name) => directory.create(name)} onSaved={refresh} />
      )}

      {routes.isPending && <p>กำลังโหลด…</p>}
      {routes.isError && <p role="alert">โหลดเส้นทางไม่สำเร็จ</p>}
      {routes.data && (
        <table aria-label="เส้นทาง">
          <thead>
            <tr>
              <th>ชื่อเส้นทาง</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {routes.data.map((route) => (
              <tr key={route.id}>
                <td>{route.name}</td>
                <td>
                  <button type="button" onClick={() => setRenaming(route)}>
                    เปลี่ยนชื่อ
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  )
}

interface RouteNameFormProps {
  /** The form's name, also its submit button's when adding. */
  label: string
  initialName?: string
  save: (name: string) => Promise<ReadingRoute>
  onSaved: () => void
  /** Shown as a cancel button when given. */
  onCancel?: () => void
}

function RouteNameForm({ label, initialName, save, onSaved, onCancel }: RouteNameFormProps) {
  const mutation = useMutation({ mutationFn: save, onSuccess: onSaved })

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    mutation.mutate(String(new FormData(form).get('name')).trim(), { onSuccess: () => form.reset() })
  }

  return (
    <form aria-label={label} onSubmit={handleSubmit}>
      <h2>{label}</h2>
      <label>
        ชื่อเส้นทาง <input name="name" defaultValue={initialName} required />
      </label>
      {mutation.isError && <p role="alert">{saveErrorMessage(mutation.error, messages)}</p>}
      <button type="submit" disabled={mutation.isPending}>
        {onCancel ? 'บันทึก' : label}
      </button>
      {onCancel && (
        <button type="button" onClick={onCancel}>
          ยกเลิก
        </button>
      )}
    </form>
  )
}
