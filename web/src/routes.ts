import type PocketBase from 'pocketbase'
import type { RecordModel } from 'pocketbase'
import { toFormError } from './formError'

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

    create(name) {
      return save(routes.create({ name }))
    },

    rename(id, name) {
      return save(routes.update(id, { name }))
    },
  }
}

async function save(request: Promise<RecordModel>): Promise<ReadingRoute> {
  try {
    return toRoute(await request)
  } catch (error) {
    throw toFormError(error)
  }
}

function toRoute(record: RecordModel): ReadingRoute {
  return { id: record.id, name: record.name }
}
