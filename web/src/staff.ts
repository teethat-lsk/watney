import type PocketBase from 'pocketbase'
import type { RecordModel } from 'pocketbase'
import type { Role } from './auth'
import { toFormError } from './formError'

/** A staff account as admins manage it. Inactive accounts can't log in. */
export interface StaffAccount {
  id: string
  email: string
  name: string
  role: Role
  active: boolean
}

export interface NewStaffAccount {
  email: string
  name: string
  password: string
  role: Role
}

export interface StaffChanges {
  name?: string
  role?: Role
  password?: string
  active?: boolean
}

/** Staff account management. Save failures the user can fix are thrown as FormError. */
export interface StaffDirectory {
  list(): Promise<StaffAccount[]>
  create(account: NewStaffAccount): Promise<StaffAccount>
  update(id: string, changes: StaffChanges): Promise<StaffAccount>
}

export function pocketbaseStaffDirectory(pb: PocketBase): StaffDirectory {
  const users = pb.collection('users')
  return {
    async list() {
      return (await users.getFullList({ sort: 'name' })).map(toAccount)
    },

    async create({ password, ...account }) {
      try {
        return toAccount(await users.create({ ...account, password, passwordConfirm: password, active: true }))
      } catch (error) {
        throw toFormError(error)
      }
    },

    async update(id, { password, ...changes }) {
      const body = password ? { ...changes, password, passwordConfirm: password } : changes
      try {
        return toAccount(await users.update(id, body))
      } catch (error) {
        throw toFormError(error)
      }
    },
  }
}

function toAccount(record: RecordModel): StaffAccount {
  return {
    id: record.id,
    email: record.email,
    name: record.name ?? '',
    role: record.role,
    active: record.active,
  }
}
