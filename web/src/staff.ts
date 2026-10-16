import type PocketBase from 'pocketbase'
import type { RecordModel } from 'pocketbase'
import { toStaff, type Role, type Staff } from './auth'
import { toFormError } from './formError'

/** A staff account as admins manage it. Inactive accounts can't log in. */
export interface StaffAccount extends Staff {
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
  email?: string
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

    create({ password, ...account }) {
      return save(users.create({ ...account, ...withConfirmation(password), active: true }))
    },

    update(id, { password, ...changes }) {
      return save(users.update(id, { ...changes, ...withConfirmation(password) }))
    },
  }
}

/** PocketBase wants a new password twice. */
function withConfirmation(password: string | undefined) {
  return password ? { password, passwordConfirm: password } : {}
}

async function save(request: Promise<RecordModel>): Promise<StaffAccount> {
  try {
    return toAccount(await request)
  } catch (error) {
    throw toFormError(error)
  }
}

function toAccount(record: RecordModel): StaffAccount {
  return { ...toStaff(record), active: record.active }
}
