import { useQuery } from '@tanstack/react-query'
import type { Api } from './api'

/** React Query cache keys, shared so that a save on one page refreshes the others. */
export const queryKeys = {
  staff: ['staff'],
  routes: ['routes'],
  customers: ['customers'],
  customer: (id: string) => ['customers', id],
}

/** The list of routes, which several pages offer to choose from. */
export function useRouteList(api: Api) {
  return useQuery({ queryKey: queryKeys.routes, queryFn: () => api.routes.list() })
}
