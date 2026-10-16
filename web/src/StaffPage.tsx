import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import type { Role, Staff } from './auth'
import type { Api } from './api'
import { saveErrorMessage, type FieldMessages } from './formError'
import { queryKeys, useRouteList } from './queries'
import { roleLabels, roles } from './roles'
import type { ReadingRoute } from './routes'
import type { NewStaffAccount, StaffAccount, StaffChanges, StaffDirectory } from './staff'

const messages: FieldMessages = {
  email: {
    validation_not_unique: 'อีเมลนี้มีผู้ใช้แล้ว',
    validation_is_email: 'อีเมลไม่ถูกต้อง',
  },
  password: {
    validation_min_text_constraint: 'รหัสผ่านต้องยาวอย่างน้อย 8 ตัวอักษร',
  },
}

interface StaffPageProps {
  api: Api
  /** The logged-in admin, who can't deactivate themselves or change their own role. */
  self: Staff
}

export function StaffPage({ api, self }: StaffPageProps) {
  const directory = api.staff
  const queryClient = useQueryClient()
  const accounts = useQuery({ queryKey: queryKeys.staff, queryFn: () => directory.list() })
  const routeList = useRouteList(api)
  const [editing, setEditing] = useState<StaffAccount | null>(null)
  const refresh = () => queryClient.invalidateQueries({ queryKey: queryKeys.staff })
  const routeNames = (ids: string[]) =>
    (routeList.data ?? [])
      .filter((route) => ids.includes(route.id))
      .map((route) => route.name)
      .join(', ')
  const setActive = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => directory.update(id, { active }),
    onSuccess: refresh,
  })

  return (
    <>
      <h1>พนักงาน</h1>
      {editing && routeList.data ? (
        <EditStaffForm
          key={editing.id}
          account={editing}
          routes={routeList.data}
          isSelf={editing.id === self.id}
          directory={directory}
          onDone={() => {
            setEditing(null)
            refresh()
          }}
        />
      ) : (
        <NewStaffForm directory={directory} onCreated={refresh} />
      )}

      {(accounts.isPending || routeList.isPending) && <p>กำลังโหลด…</p>}
      {(accounts.isError || routeList.isError) && <p role="alert">โหลดรายชื่อพนักงานไม่สำเร็จ</p>}
      {setActive.isError && <p role="alert">{saveErrorMessage(setActive.error, messages)}</p>}
      {accounts.data && routeList.data && (
        <table>
          <thead>
            <tr>
              <th>ชื่อ</th>
              <th>อีเมล</th>
              <th>บทบาท</th>
              <th>เส้นทาง</th>
              <th>สถานะ</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {accounts.data.map((account) => (
              <tr key={account.id}>
                <td>{account.name}</td>
                <td>{account.email}</td>
                <td>{roleLabels[account.role]}</td>
                <td>{routeNames(account.routes)}</td>
                <td>{account.active ? 'ใช้งาน' : 'ปิดใช้งาน'}</td>
                <td>
                  <button type="button" onClick={() => setEditing(account)}>
                    แก้ไข
                  </button>{' '}
                  {account.id !== self.id && (
                    <button
                      type="button"
                      disabled={setActive.isPending}
                      onClick={() => setActive.mutate({ id: account.id, active: !account.active })}
                    >
                      {account.active ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  )
}

function NewStaffForm({ directory, onCreated }: { directory: StaffDirectory; onCreated: () => void }) {
  const create = useMutation({
    mutationFn: (account: NewStaffAccount) => directory.create(account),
    onSuccess: onCreated,
  })

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)
    create.mutate(
      {
        name: String(data.get('name')),
        email: String(data.get('email')),
        password: String(data.get('password')),
        role: data.get('role') as Role,
      },
      { onSuccess: () => form.reset() },
    )
  }

  return (
    <form aria-label="เพิ่มพนักงาน" onSubmit={handleSubmit}>
      <h2>เพิ่มพนักงาน</h2>
      <label>
        ชื่อ <input name="name" required />
      </label>
      <label>
        อีเมล <input name="email" type="email" required />
      </label>
      <label>
        รหัสผ่าน <input name="password" type="password" autoComplete="new-password" minLength={8} required />
      </label>
      <label>
        บทบาท <RoleSelect name="role" defaultValue="meter_reader" />
      </label>
      {create.isError && <p role="alert">{saveErrorMessage(create.error, messages)}</p>}
      <button type="submit" disabled={create.isPending}>
        เพิ่มพนักงาน
      </button>
    </form>
  )
}

interface EditStaffFormProps {
  account: StaffAccount
  routes: ReadingRoute[]
  isSelf: boolean
  directory: StaffDirectory
  onDone: () => void
}

function EditStaffForm({ account, routes, isSelf, directory, onDone }: EditStaffFormProps) {
  const update = useMutation({
    mutationFn: (changes: StaffChanges) => directory.update(account.id, changes),
    onSuccess: onDone,
  })

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const changes: StaffChanges = { name: String(data.get('name')), email: String(data.get('email')) }
    // A disabled field isn't submitted: admins can't change their own role.
    if (data.has('role')) changes.role = data.get('role') as Role
    changes.routes = data.getAll('routes').map(String)
    if (data.get('password')) changes.password = String(data.get('password'))
    update.mutate(changes)
  }

  return (
    <form aria-label="แก้ไขพนักงาน" onSubmit={handleSubmit}>
      <h2>แก้ไขพนักงาน: {account.name || account.email}</h2>
      <label>
        ชื่อ <input name="name" defaultValue={account.name} required />
      </label>
      <label>
        อีเมล <input name="email" type="email" defaultValue={account.email} required />
      </label>
      <label>
        บทบาท <RoleSelect name="role" defaultValue={account.role} disabled={isSelf} />
      </label>
      {routes.length > 0 && (
        <fieldset>
          <legend>เส้นทางที่จดมาตร (สำหรับเจ้าหน้าที่จดมาตร)</legend>
          {routes.map((route) => (
            <label key={route.id} className="checkbox">
              <input type="checkbox" name="routes" value={route.id} defaultChecked={account.routes.includes(route.id)} />{' '}
              {route.name}
            </label>
          ))}
        </fieldset>
      )}
      <label>
        รหัสผ่านใหม่ <input name="password" type="password" autoComplete="new-password" minLength={8} placeholder="เว้นว่างถ้าไม่เปลี่ยน" />
      </label>
      {update.isError && <p role="alert">{saveErrorMessage(update.error, messages)}</p>}
      <button type="submit" disabled={update.isPending}>
        บันทึก
      </button>{' '}
      <button type="button" onClick={onDone}>
        ยกเลิก
      </button>
    </form>
  )
}

function RoleSelect(props: { name: string; defaultValue: Role; disabled?: boolean }) {
  return (
    <select {...props}>
      {roles.map((role) => (
        <option key={role} value={role}>
          {roleLabels[role]}
        </option>
      ))}
    </select>
  )
}
