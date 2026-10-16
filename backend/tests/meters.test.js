/// <reference path="../pb_data/types.d.ts" />

// Meters (#4, ADR 0001): office staff and admins register meters with unique
// numbers and link them to customers; meter readers see the meters on their routes.
module.exports = ({ test, expect, ids, guest, as, createStaff, createSuperuser, createRoute, createCustomer, createMeter }) => {
  const newMeter = (customer, fields) => ({
    number: "WM-0001",
    size: "1/2",
    installed_on: "2026-10-01",
    start_reading: 0,
    customer: customer.id,
    status: "active",
    ...fields,
  })

  test("office staff and admins register a meter and link it to a customer", () => {
    for (const role of ["office", "admin"]) {
      const customer = createCustomer(createRoute(), { status: "pending" })

      const res = as(createStaff({ role })).create("meters", newMeter(customer, { number: `WM-${role}`, size: "1" }))

      expect(res).toHaveStatus(200)
      expect([res.body.customer, res.body.size, res.body.installed_on]).toEqual([customer.id, "1", "2026-10-01 00:00:00.000Z"])
    }
  })

  test("registering a pending customer's meter makes them active", () => {
    const office = as(createStaff({ role: "office" }))
    const customer = createCustomer(createRoute(), { status: "pending" })

    expect(office.create("meters", newMeter(customer, { number: "WM-FIRST" }))).toHaveStatus(200)

    expect(office.view("customers", customer.id).body.status).toBe("active")
  })

  test("meter numbers are unique, whatever their letter case", () => {
    const office = as(createStaff({ role: "office" }))
    const customer = createCustomer(createRoute(), { status: "cancelled" })
    createMeter(customer, { number: "WM-DUP", status: "removed" })

    for (const number of ["WM-DUP", "wm-dup"]) {
      const res = office.create("meters", newMeter(customer, { number }))
      expect(res).toHaveStatus(400)
      expect(res.body.data.number.code).toBe("validation_not_unique")
    }
  })

  test("an active customer's active meter can't be removed or moved to another customer", () => {
    const office = as(createStaff({ role: "office" }))
    const route = createRoute()
    const meter = createMeter(createCustomer(route))

    const removed = office.update("meters", meter.id, { status: "removed" })
    expect(removed).toHaveStatus(400)
    expect(removed.body.data.status.code).toBe("validation_customer_needs_active_meter")
    const moved = office.update("meters", meter.id, { customer: createCustomer(route, { status: "pending" }).id })
    expect(moved).toHaveStatus(400)
    expect(moved.body.data.customer.code).toBe("validation_customer_needs_active_meter")
  })

  test("not even a superuser can delete an active customer's active meter", () => {
    const meter = createMeter(createCustomer(createRoute()))

    const res = as(createSuperuser()).remove("meters", meter.id)

    expect(res).toHaveStatus(400)
    expect(res.body.data.status.code).toBe("validation_customer_needs_active_meter")
  })

  test("a customer has at most one active meter, until replacing a meter is supported", () => {
    const office = as(createStaff({ role: "office" }))
    const customer = createCustomer(createRoute())
    createMeter(customer)
    const spare = createMeter(createCustomer(createRoute(), { status: "cancelled" }), { status: "removed" })

    const added = office.create("meters", newMeter(customer, { number: "WM-SECOND" }))
    expect(added).toHaveStatus(400)
    expect(added.body.data.customer.code).toBe("validation_customer_has_active_meter")
    expect(office.update("meters", spare.id, { customer: customer.id, status: "active" })).toHaveStatus(400)
  })

  test("a meter of a customer who isn't active can be removed", () => {
    const office = as(createStaff({ role: "office" }))
    const customer = createCustomer(createRoute(), { status: "cancelled" })
    const meter = createMeter(customer)

    expect(office.update("meters", meter.id, { status: "removed" })).toHaveStatus(200)
  })

  test("meter readers see only the meters of customers on their routes, and can't create or edit any", () => {
    const mine = createRoute()
    const onMine = createMeter(createCustomer(mine))
    const elsewhere = createMeter(createCustomer(createRoute()))
    const reader = as(createStaff({ role: "meter_reader", routes: [mine.id] }))

    expect(ids(reader.list("meters"))).toEqual([onMine.id])
    expect(reader.view("meters", elsewhere.id)).toHaveStatus(404)
    expect(reader.create("meters", newMeter(createCustomer(mine), { number: "WM-READER" }))).toHaveStatus(400)
    expect(reader.update("meters", onMine.id, { start_reading: 99 })).toHaveStatus(404)
  })

  test("nobody deletes meters through the API", () => {
    const admin = createStaff({ role: "admin" })

    expect(as(admin).remove("meters", createMeter(createCustomer(createRoute())).id)).toHaveStatus(403)
  })

  test("a guest can't see or create meters", () => {
    const customer = createCustomer(createRoute())
    const meter = createMeter(customer)

    expect(ids(guest.list("meters"))).toEqual([])
    expect(guest.view("meters", meter.id)).toHaveStatus(404)
    expect(guest.create("meters", newMeter(customer, { number: "WM-GUEST" }))).toHaveStatus(400)
  })
}
