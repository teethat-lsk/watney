/// <reference path="../pb_data/types.d.ts" />

// Routes (#4): office staff and admins keep the list of routes; admins assign
// routes to meter readers, who see only their own.
module.exports = ({ test, expect, ids, guest, as, createStaff, createRoute }) => {
  test("office staff and admins create and rename routes", () => {
    for (const role of ["office", "admin"]) {
      const staff = as(createStaff({ role }))

      const created = staff.create("routes", { name: `สายใหม่ ${role}` })
      expect(created).toHaveStatus(200)
      const renamed = staff.update("routes", created.body.id, { name: `สายเหนือ ${role}` })
      expect(renamed).toHaveStatus(200)
      expect(renamed.body.name).toBe(`สายเหนือ ${role}`)
    }
  })

  test("route names are unique", () => {
    const office = createStaff({ role: "office" })
    createRoute({ name: "สายวัด" })

    const res = as(office).create("routes", { name: "สายวัด" })

    expect(res).toHaveStatus(400)
    expect(res.body.data.name.code).toBe("validation_not_unique")
  })

  test("admins assign routes to meter readers", () => {
    const admin = createStaff({ role: "admin" })
    const reader = createStaff({ role: "meter_reader" })
    const north = createRoute()
    const south = createRoute()

    const res = as(admin).update("users", reader.id, { routes: [north.id, south.id] })

    expect(res).toHaveStatus(200)
    expect(res.body.routes.sort()).toEqual([north.id, south.id].sort())
  })

  test("office staff can't assign routes to meter readers", () => {
    const office = createStaff({ role: "office" })
    const reader = createStaff({ role: "meter_reader" })

    expect(as(office).update("users", reader.id, { routes: [createRoute().id] })).toHaveStatus(404)
  })

  test("meter readers see only their own routes, and can't create or rename any", () => {
    const mine = createRoute()
    const other = createRoute()
    const reader = createStaff({ role: "meter_reader", routes: [mine.id] })

    expect(ids(as(reader).list("routes"))).toEqual([mine.id])
    expect(as(reader).view("routes", other.id)).toHaveStatus(404)
    expect(as(reader).create("routes", { name: "สายของฉัน" })).toHaveStatus(400)
    expect(as(reader).update("routes", mine.id, { name: "เปลี่ยนชื่อ" })).toHaveStatus(404)
  })

  test("a guest can't see or create routes", () => {
    const route = createRoute()

    expect(ids(guest.list("routes"))).toEqual([])
    expect(guest.view("routes", route.id)).toHaveStatus(404)
    expect(guest.create("routes", { name: "สายแขก" })).toHaveStatus(400)
  })
}
