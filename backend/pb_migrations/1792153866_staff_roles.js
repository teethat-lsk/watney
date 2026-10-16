/// <reference path="../pb_data/types.d.ts" />

// Staff accounts and roles (#3).
// - Admins see, create and edit staff, including their role and password.
//   Other staff see only their own account.
// - Admins can't change their own role or status, so they can't lock
//   themselves out.
// - Staff are deactivated, not deleted: the `active` flag, checked at login by
//   the auth rule. A new account is inactive unless `active` is set.
migrate((app) => {
  const ADMIN = '@request.auth.role = "admin"'
  const users = app.findCollectionByNameOrId("users")
  users.fields.add(new BoolField({ name: "active" }))
  users.authRule = "active = true"
  users.listRule = `id = @request.auth.id || ${ADMIN}`
  users.viewRule = users.listRule
  users.createRule = ADMIN
  users.updateRule = `${ADMIN} && (id != @request.auth.id || (@request.body.role:isset = false && @request.body.active:isset = false))`
  users.manageRule = ADMIN
  app.save(users)

  // Staff created before this migration stay able to log in.
  app.db().newQuery("UPDATE users SET active = TRUE").execute()
}, (app) => {
  const users = app.findCollectionByNameOrId("users")
  users.authRule = ""
  users.listRule = "id = @request.auth.id"
  users.viewRule = "id = @request.auth.id"
  users.createRule = null
  users.updateRule = null
  users.manageRule = null
  users.fields.removeByName("active")
  app.save(users)
})
