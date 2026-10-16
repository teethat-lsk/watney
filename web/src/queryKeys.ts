/** React Query cache keys, shared so that a save on one page refreshes the others. */
export const queryKeys = {
  staff: ['staff'],
  routes: ['routes'],
  customers: ['customers'],
  customer: (id: string) => ['customers', id],
}
