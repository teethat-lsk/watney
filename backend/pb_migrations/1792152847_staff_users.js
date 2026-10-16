/// <reference path="../pb_data/types.d.ts" />

// Staff accounts live in the built-in `users` auth collection.
// - Adds the staff role (tech-spec §4).
// - Closes public sign-up and self-edits, so nobody can create an account or
//   change their own role. Until #3 adds role-based rules, only superusers
//   manage staff.
migrate((app) => {
  const users = app.findCollectionByNameOrId("users")
  users.createRule = null
  users.updateRule = null
  users.deleteRule = null
  users.fields.add(new SelectField({
    name: "role",
    required: true,
    maxSelect: 1,
    values: ["meter_reader", "office", "admin"],
  }))
  app.save(users)
}, (app) => {
  const users = app.findCollectionByNameOrId("users")
  users.createRule = ""
  users.updateRule = "id = @request.auth.id"
  users.deleteRule = "id = @request.auth.id"
  users.fields.removeByName("role")
  app.save(users)
})
