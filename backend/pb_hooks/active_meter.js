/// <reference path="../pb_data/types.d.ts" />

// The "every active customer has an active meter" rule, used by customers.pb.js.

/** How many active meters the customer has, not counting `exceptMeterId`. */
function activeMeters(app, customerId, exceptMeterId) {
  return app.countRecords(
    "meters",
    $dbx.hashExp({ customer: customerId, status: "active" }),
    $dbx.not($dbx.hashExp({ id: exceptMeterId })),
  )
}

/** Rejects a customer becoming active (`before` is null for a new one) without an active meter. */
function checkActivation(app, before, customer) {
  const becomesActive = customer.getString("status") === "active" && (!before || before.getString("status") !== "active")
  if (!becomesActive || activeMeters(app, customer.id, "") > 0) return

  const message = "An active customer needs an active meter."
  throw new BadRequestError(message, { status: new ValidationError("validation_no_active_meter", message) })
}

/** Rejects a meter change (`after` is null for a delete) that leaves an active customer without an active meter. */
function checkMeterLeaving(app, before, after) {
  const customerId = before.getString("customer")
  const moved = after !== null && after.getString("customer") !== customerId
  const stillCounts = after !== null && after.getString("status") === "active" && !moved
  if (before.getString("status") !== "active" || stillCounts) return
  if (app.findRecordById("customers", customerId).getString("status") !== "active") return
  if (activeMeters(app, customerId, before.id) > 0) return

  const message = "This is the active customer's last active meter. Register their new meter first, or change the customer's status."
  throw new BadRequestError(message, {
    [moved ? "customer" : "status"]: new ValidationError("validation_customer_needs_active_meter", message),
  })
}

module.exports = { checkActivation, checkMeterLeaving }
