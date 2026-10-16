/// <reference path="../pb_data/types.d.ts" />

// Customers (ผู้ใช้น้ำ, #4): office staff and admins keep the register; every
// active customer has an active meter (ADR 0001); meter readers see only the
// customers on their routes.
module.exports = ({ test, expect, ids, newId, guest, as, createStaff, createRoute, createCustomer, createMeter }) => {
  const details = (route, fields) => ({
    house_no: "12/3",
    moo: 4,
    name: "นายมานะ ใจดี",
    phone: "0812345678",
    route: route.id,
    ...fields,
  })
  const records = (collection) => `/api/collections/${collection}/records`

  test("office staff and admins register a customer with their first meter in one batch, and the customer is active", () => {
    for (const role of ["office", "admin"]) {
      const staff = as(createStaff({ role }))
      const id = newId()

      const res = staff.batch([
        { method: "POST", url: records("customers"), body: { id, ...details(createRoute()), status: "pending" } },
        {
          method: "POST",
          url: records("meters"),
          body: { number: `M-${newId()}`, size: "3/4", installed_on: "2026-10-01", start_reading: 125.5, customer: id, status: "active" },
        },
      ])

      expect(res).toHaveStatus(200)
      expect(res.body.map((r) => r.status)).toEqual([200, 200])
      expect(staff.view("customers", id).body.status).toBe("active")
    }
  })

  test("a batch with a meter number that's taken saves nothing", () => {
    const office = as(createStaff({ role: "office" }))
    createMeter(createCustomer(createRoute()), { number: "WM-TAKEN" })
    const id = newId()

    const res = office.batch([
      { method: "POST", url: records("customers"), body: { id, ...details(createRoute()), status: "pending" } },
      {
        method: "POST",
        url: records("meters"),
        body: { number: "WM-TAKEN", size: "1/2", installed_on: "2026-10-01", start_reading: 0, customer: id, status: "active" },
      },
    ])

    expect(res).toHaveStatus(400)
    expect(office.view("customers", id)).toHaveStatus(404)
  })

  test("a customer waiting for a meter is registered as pending", () => {
    const office = createStaff({ role: "office" })

    const res = as(office).create("customers", { ...details(createRoute()), status: "pending" })

    expect(res).toHaveStatus(200)
    expect(res.body.status).toBe("pending")
  })

  test("a customer can't be active without an active meter", () => {
    const office = as(createStaff({ role: "office" }))
    const route = createRoute()

    const created = office.create("customers", { ...details(route), status: "active" })
    expect(created).toHaveStatus(400)
    expect(created.body.data.status.code).toBe("validation_no_active_meter")

    const customer = createCustomer(route, { status: "pending" })
    createMeter(customer, { status: "removed" })
    expect(office.update("customers", customer.id, { status: "active" })).toHaveStatus(400)

    createMeter(customer)
    expect(office.update("customers", customer.id, { status: "active" })).toHaveStatus(200)
  })

  test("only a new customer can be pending", () => {
    const office = as(createStaff({ role: "office" }))
    const customer = createCustomer(createRoute())
    createMeter(customer)

    const res = office.update("customers", customer.id, { status: "pending" })

    expect(res).toHaveStatus(400)
    expect(res.body.data.status.code).toBe("validation_pending_only_new")
  })

  test("office staff edit a customer, cut their water, and cancel them", () => {
    const office = as(createStaff({ role: "office" }))
    const customer = createCustomer(createRoute())
    createMeter(customer)
    const otherRoute = createRoute()

    const edited = office.update("customers", customer.id, { name: "นางสมใจ", phone: "", moo: 5, route: otherRoute.id })
    expect(edited).toHaveStatus(200)
    expect([edited.body.name, edited.body.moo, edited.body.route]).toEqual(["นางสมใจ", 5, otherRoute.id])
    expect(office.update("customers", customer.id, { status: "water_cut" })).toHaveStatus(200)
    expect(office.update("customers", customer.id, { status: "cancelled" })).toHaveStatus(200)
  })

  test("nobody deletes customers through the API; they are cancelled instead", () => {
    const admin = createStaff({ role: "admin" })

    expect(as(admin).remove("customers", createCustomer(createRoute()).id)).toHaveStatus(403)
  })

  test("meter readers see only the customers on their routes", () => {
    const north = createRoute()
    const south = createRoute()
    const east = createRoute()
    const onNorth = createCustomer(north)
    const onSouth = createCustomer(south)
    const onEast = createCustomer(east)
    const reader = as(createStaff({ role: "meter_reader", routes: [north.id, south.id] }))

    expect(ids(reader.list("customers"))).toEqual([onNorth.id, onSouth.id].sort())
    expect(reader.view("customers", onNorth.id)).toHaveStatus(200)
    expect(reader.view("customers", onEast.id)).toHaveStatus(404)
    expect(ids(as(createStaff({ role: "meter_reader" })).list("customers"))).toEqual([])
  })

  test("expanding related records doesn't show meter readers anything off their routes", () => {
    const mine = createRoute()
    const other = createRoute()
    const onMine = createCustomer(mine)
    const meterOnMine = createMeter(onMine)
    createMeter(createCustomer(other))
    const reader = as(createStaff({ role: "meter_reader", routes: [mine.id] }))

    const customers = reader.list("customers", "expand=route,meters_via_customer")
    expect(ids(customers)).toEqual([onMine.id])
    expect(customers.body.items[0].expand.meters_via_customer.map((m) => m.id)).toEqual([meterOnMine.id])
    const routes = reader.list("routes", "expand=customers_via_route")
    expect(routes.body.items[0].expand.customers_via_route.map((c) => c.id)).toEqual([onMine.id])
    expect(ids(reader.list("meters", `filter=(customer.route='${other.id}')`))).toEqual([])
  })

  test("meter readers can't create or edit customers, even on their routes", () => {
    const route = createRoute()
    const customer = createCustomer(route)
    const reader = as(createStaff({ role: "meter_reader", routes: [route.id] }))

    expect(reader.create("customers", { ...details(route), status: "pending" })).toHaveStatus(400)
    expect(reader.update("customers", customer.id, { name: "แก้ชื่อ" })).toHaveStatus(404)
  })

  test("a guest can't see or create customers", () => {
    const route = createRoute()
    const customer = createCustomer(route)

    expect(ids(guest.list("customers"))).toEqual([])
    expect(guest.view("customers", customer.id)).toHaveStatus(404)
    expect(guest.create("customers", { ...details(route), status: "pending" })).toHaveStatus(400)
  })
}
