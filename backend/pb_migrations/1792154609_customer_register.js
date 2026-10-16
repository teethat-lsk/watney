/// <reference path="../pb_data/types.d.ts" />

// Customer register (#4, ADR 0001).
// - Routes: office staff and admins keep the list; admins assign routes to
//   meter readers (`users.routes`). A meter reader sees only their own routes.
// - Customers (ผู้ใช้น้ำ) and meters: office staff and admins register and
//   edit them; a meter reader sees those on their routes. Nobody deletes them
//   through the API: customers are cancelled, meters removed.
// - Hooks keep customers and meters consistent (customer_rules.pb.js): every
//   active customer has an active meter, and for now at most one. A new
//   customer is `pending` until a meter is linked; the web admin registers a
//   customer with their first meter in one batch request, so batch is enabled.
// - The link is on the meter, so a customer can have any number of meters
//   (more than one active is a later issue). Meter numbers are unique,
//   ignoring letter case.
migrate((app) => {
  const OFFICE = '(@request.auth.role = "office" || @request.auth.role = "admin")'

  const routes = new Collection({
    type: "base",
    name: "routes",
    listRule: `${OFFICE} || @request.auth.routes.id ?= id`,
    viewRule: `${OFFICE} || @request.auth.routes.id ?= id`,
    createRule: OFFICE,
    updateRule: OFFICE,
    deleteRule: null,
    fields: [
      { type: "text", name: "name", required: true, max: 100 },
      { type: "autodate", name: "created", onCreate: true },
      { type: "autodate", name: "updated", onCreate: true, onUpdate: true },
    ],
    indexes: ["CREATE UNIQUE INDEX idx_routes_name ON routes (name)"],
  })
  app.save(routes)

  const users = app.findCollectionByNameOrId("users")
  users.fields.add(new RelationField({ name: "routes", collectionId: routes.id, maxSelect: 999 }))
  app.save(users)

  const customers = new Collection({
    type: "base",
    name: "customers",
    listRule: `${OFFICE} || @request.auth.routes.id ?= route`,
    viewRule: `${OFFICE} || @request.auth.routes.id ?= route`,
    createRule: OFFICE,
    updateRule: OFFICE,
    deleteRule: null,
    fields: [
      { type: "text", name: "house_no", required: true, max: 50 },
      { type: "number", name: "moo", required: true, onlyInt: true, min: 1 },
      { type: "text", name: "name", required: true, max: 200 },
      { type: "text", name: "phone", max: 50 },
      { type: "select", name: "status", required: true, maxSelect: 1, values: ["pending", "active", "water_cut", "cancelled"] },
      { type: "relation", name: "route", required: true, maxSelect: 1, collectionId: routes.id },
      { type: "autodate", name: "created", onCreate: true },
      { type: "autodate", name: "updated", onCreate: true, onUpdate: true },
    ],
    indexes: ["CREATE INDEX idx_customers_route ON customers (route)"],
  })
  app.save(customers)

  const meters = new Collection({
    type: "base",
    name: "meters",
    listRule: `${OFFICE} || @request.auth.routes.id ?= customer.route`,
    viewRule: `${OFFICE} || @request.auth.routes.id ?= customer.route`,
    createRule: OFFICE,
    updateRule: OFFICE,
    deleteRule: null,
    fields: [
      { type: "text", name: "number", required: true, max: 50 },
      // Pipe size in inches: ½", ¾", 1", 1½", 2".
      { type: "select", name: "size", required: true, maxSelect: 1, values: ["1/2", "3/4", "1", "1-1/2", "2"] },
      { type: "date", name: "installed_on", required: true },
      // The reading the meter's first billed reading is measured from (#6).
      { type: "number", name: "start_reading", min: 0 },
      { type: "relation", name: "customer", required: true, maxSelect: 1, collectionId: customers.id },
      { type: "select", name: "status", required: true, maxSelect: 1, values: ["active", "removed"] },
      { type: "autodate", name: "created", onCreate: true },
      { type: "autodate", name: "updated", onCreate: true, onUpdate: true },
    ],
    indexes: [
      "CREATE UNIQUE INDEX idx_meters_number ON meters (number COLLATE NOCASE)",
      "CREATE INDEX idx_meters_customer ON meters (customer)",
    ],
  })
  app.save(meters)

  const settings = app.settings()
  settings.batch.enabled = true
  settings.batch.maxRequests = 50
  settings.batch.timeout = 10
  app.save(settings)
}, (app) => {
  const settings = app.settings()
  settings.batch.enabled = false
  app.save(settings)

  app.delete(app.findCollectionByNameOrId("meters"))
  app.delete(app.findCollectionByNameOrId("customers"))

  const users = app.findCollectionByNameOrId("users")
  users.fields.removeByName("routes")
  app.save(users)

  app.delete(app.findCollectionByNameOrId("routes"))
})
