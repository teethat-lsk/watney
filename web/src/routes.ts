import type PocketBase from 'pocketbase'
import type { RecordModel } from 'pocketbase'
import { withFormErrors } from './formError'

/** A meter-reading route (เส้นทาง). Customers are on one route; admins assign routes to meter readers. */
export interface ReadingRoute {
  id: string
  name: string
}

/** The list of routes. Save failures the user can fix are thrown as FormError. */
export interface RouteDirectory {
  list(): Promise<ReadingRoute[]>
  create(name: string): Promise<ReadingRoute>
  rename(id: string, name: string): Promise<ReadingRoute>
}

export function pocketbaseRouteDirectory(pb: PocketBase): RouteDirectory {
  const routes = pb.collection('routes')
  return {
    async list() {
      return (await routes.getFullList({ sort: 'name' })).map(toRoute)
    },

    async create(name) {
      return toRoute(await withFormErrors(routes.create({ name })))
    },

    async rename(id, name) {
      return toRoute(await withFormErrors(routes.update(id, { name })))
    },
  }
}

function toRoute(record: RecordModel): ReadingRoute {
  return { id: record.id, name: record.name }
}
