import PocketBase, { ClientResponseError, type RecordModel } from 'pocketbase'

export type Role = 'meter_reader' | 'office' | 'admin'

export interface Staff {
  id: string
  email: string
  name: string
  role: Role
}

/** Why a login failed: wrong email or password, or the backend can't be reached. */
export type LoginFailure = 'invalid' | 'unreachable'

export class LoginError extends Error {
  readonly reason: LoginFailure

  constructor(reason: LoginFailure) {
    super(`Login failed: ${reason}`)
    this.reason = reason
  }
}

/** Staff login and logout. The app depends on this, so tests can swap in a fake. */
export interface Auth {
  /** The staff member whose session is stored and not yet expired, if any. */
  current(): Staff | null
  login(email: string, password: string): Promise<Staff>
  logout(): void
}

export function pocketbaseAuth(pb: PocketBase): Auth {
  return {
    current() {
      const record = pb.authStore.record
      return pb.authStore.isValid && record ? toStaff(record) : null
    },

    async login(email, password) {
      try {
        const { record } = await pb.collection('users').authWithPassword(email, password)
        return toStaff(record)
      } catch (error) {
        throw toLoginError(error)
      }
    },

    logout() {
      pb.authStore.clear()
    },
  }
}

function toStaff(record: RecordModel): Staff {
  return {
    id: record.id,
    email: record.email,
    name: record.name ?? '',
    role: record.role,
  }
}

function toLoginError(error: unknown): unknown {
  if (!(error instanceof ClientResponseError) || error.isAbort) return error
  if (error.status === 400) return new LoginError('invalid')
  // 0: the request never got a response; 5xx: includes the Vite proxy when PocketBase is down.
  if (error.status === 0 || error.status >= 500) return new LoginError('unreachable')
  return error
}
