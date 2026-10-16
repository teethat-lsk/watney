/// <reference path="../pb_data/types.d.ts" />

// Staff sessions last 45 days instead of PocketBase's 5 (#5). A meter reader
// may open the field app only once a monthly round, and each start renews
// the session. Deactivating an account still ends its sessions at once.
migrate((app) => {
  const users = app.findCollectionByNameOrId("users")
  users.authToken.duration = 45 * 24 * 60 * 60
  app.save(users)
}, (app) => {
  const users = app.findCollectionByNameOrId("users")
  users.authToken.duration = 5 * 24 * 60 * 60
  app.save(users)
})
