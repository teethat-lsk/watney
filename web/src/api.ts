import type PocketBase from 'pocketbase'
import { pocketbaseStaffDirectory, type StaffDirectory } from './staff'

/** The backend data the admin pages use. The app depends on this, so tests can swap in fakes. */
export interface Api {
  staff: StaffDirectory
}

export function pocketbaseApi(pb: PocketBase): Api {
  return {
    staff: pocketbaseStaffDirectory(pb),
  }
}
