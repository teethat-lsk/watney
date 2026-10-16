import PocketBase, { ClientResponseError, type RecordModel } from 'pocketbase'

export type Role = 'meter_reader' | 'office' | 'admin'

export interface Staff {
  id: string
  email: string
  name: string
  role: Role
}

/** Why a login failed: wrong email or password, a deactivated account, or the backend can't be reached. */
export type LoginFailure = 'invalid' | 'inactive' | 'unreachable'

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
  /**
   * Checks the stored session with the backend and returns the staff member as
   * they are now (their role may have changed), or null once the backend no
   * longer accepts the session. If the backend can't be reached, keeps the stored session.
   */
  refresh(): Promise<Staff | null>
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

    async refresh() {
      try {
        const { record } = await pb.collection('users').authRefresh()
        return toStaff(record)
      } catch (error) {
        // 401: the token is no longer valid; 403: the account was deactivated.
        if (error instanceof ClientResponseError && (error.status === 401 || error.status === 403)) {
          pb.authStore.clear()
          return null
        }
        return this.current()
      }
    },

    logout() {
      pb.authStore.clear()
    },
  }
}

export function toStaff(record: RecordModel): Staff {
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
  // The auth rule (`active = true`) rejects deactivated accounts.
  if (error.status === 403) return new LoginError('inactive')
  // 0: the request never got a response; 5xx: includes the Vite proxy when PocketBase is down.
  if (error.status === 0 || error.status >= 500) return new LoginError('unreachable')
  return error
}
