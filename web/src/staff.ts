import type PocketBase from 'pocketbase'
import type { RecordModel } from 'pocketbase'
import { toStaff, type Role, type Staff } from './auth'
import { withFormErrors } from './formError'

/** A staff account as admins manage it. Inactive accounts can't log in. */
export interface StaffAccount extends Staff {
  active: boolean
  /** The ids of the routes a meter reader reads. */
  routes: string[]
}

export interface NewStaffAccount {
  email: string
  name: string
  password: string
  role: Role
}

export interface StaffChanges {
  name?: string
  email?: string
  role?: Role
  password?: string
  active?: boolean
  routes?: string[]
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
      return toAccount(await withFormErrors(users.create({ ...account, ...withConfirmation(password), active: true })))
    },

    async update(id, { password, ...changes }) {
      return toAccount(await withFormErrors(users.update(id, { ...changes, ...withConfirmation(password) })))
    },
  }
}

/** PocketBase wants a new password twice. */
function withConfirmation(password: string | undefined) {
  return password ? { password, passwordConfirm: password } : {}
}

function toAccount(record: RecordModel): StaffAccount {
  return { ...toStaff(record), active: record.active, routes: record.routes ?? [] }
}
