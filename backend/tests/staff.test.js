/// <reference path="../pb_data/types.d.ts" />

// Staff accounts and roles (#3): only admins manage staff, and deactivated staff can't get in.
module.exports = ({ test, expect, ids, guest, as, createStaff, PASSWORD }) => {
  const newStaff = (fields) => ({
    email: `new-${$security.randomString(8)}@test.local`,
    password: PASSWORD,
    passwordConfirm: PASSWORD,
    name: "พนักงานใหม่",
    role: "meter_reader",
    active: true,
    ...fields,
  })

  test("an admin creates a staff account with a role", () => {
    const admin = createStaff({ role: "admin" })

    const res = as(admin).create("users", newStaff({ role: "office" }))

    expect(res).toHaveStatus(200)
    expect(res.body.role).toBe("office")
  })

  test("an admin changes a staff member's name and role", () => {
    const admin = createStaff({ role: "admin" })
    const reader = createStaff({ role: "meter_reader" })

    const res = as(admin).update("users", reader.id, { name: "สมหญิง", role: "office" })

    expect(res).toHaveStatus(200)
    expect([res.body.name, res.body.role]).toEqual(["สมหญิง", "office"])
  })

  test("a deactivated staff member can't log in", () => {
    const admin = createStaff({ role: "admin" })
    const reader = createStaff({ role: "meter_reader" })
    expect(guest.login(reader.email(), PASSWORD)).toHaveStatus(200)

    expect(as(admin).update("users", reader.id, { active: false })).toHaveStatus(200)

    expect(guest.login(reader.email(), PASSWORD)).toHaveStatus(403)
  })

  test("deactivating a staff member ends the sessions they already have", () => {
    const admin = createStaff({ role: "admin" })
    const reader = createStaff({ role: "meter_reader" })
    const session = as(reader)
    expect(session.view("users", reader.id)).toHaveStatus(200)

    expect(as(admin).update("users", reader.id, { active: false })).toHaveStatus(200)

    expect(session.view("users", reader.id)).toHaveStatus(404)
    expect(session.send("POST", "/api/collections/users/auth-refresh")).toHaveStatus(401)
  })

  test("an admin sets a new password for a staff member", () => {
    const admin = createStaff({ role: "admin" })
    const reader = createStaff({ role: "meter_reader" })

    const res = as(admin).update("users", reader.id, { password: "a-new-password", passwordConfirm: "a-new-password" })

    expect(res).toHaveStatus(200)
    expect(guest.login(reader.email(), "a-new-password")).toHaveStatus(200)
  })

  test("office staff and meter readers can't create staff", () => {
    for (const role of ["office", "meter_reader"]) {
      const res = as(createStaff({ role })).create("users", newStaff({ role: "admin" }))
      expect(res).toHaveStatus(400)
    }
  })

  test("office staff and meter readers can't change anyone's role, their own included", () => {
    const reader = createStaff({ role: "meter_reader" })
    for (const role of ["office", "meter_reader"]) {
      const self = createStaff({ role })
      expect(as(self).update("users", self.id, { role: "admin" })).toHaveStatus(404)
      expect(as(self).update("users", reader.id, { role: "admin" })).toHaveStatus(404)
    }
  })

  test("nobody deletes staff through the API; they are deactivated instead", () => {
    const admin = createStaff({ role: "admin" })
    const reader = createStaff({ role: "meter_reader" })

    expect(as(admin).remove("users", reader.id)).toHaveStatus(403)
  })

  test("admins see every staff member; other staff see only themselves", () => {
    const admin = createStaff({ role: "admin" })
    const office = createStaff({ role: "office" })
    const reader = createStaff({ role: "meter_reader" })

    const everyone = ids(as(admin).list("users"))
    expect([office.id, reader.id].every((id) => everyone.includes(id))).toBe(true)
    expect(ids(as(office).list("users"))).toEqual([office.id])
    expect(ids(as(reader).list("users"))).toEqual([reader.id])
    expect(as(reader).view("users", office.id)).toHaveStatus(404)
  })

  test("a guest can't sign up or see staff", () => {
    const admin = createStaff({ role: "admin" })

    expect(guest.create("users", newStaff({ role: "admin" }))).toHaveStatus(400)
    expect(ids(guest.list("users"))).toEqual([])
    expect(guest.view("users", admin.id)).toHaveStatus(404)
  })

  test("a wrong password is rejected", () => {
    const reader = createStaff({ role: "meter_reader" })

    expect(guest.login(reader.email(), "wrong-password")).toHaveStatus(400)
  })
}
