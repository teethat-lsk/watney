/// <reference path="../pb_data/types.d.ts" />

// The rules for customers and their meters, used by customer_rules.pb.js:
// - every active customer has an active meter (ADR 0001);
// - a customer has at most one active meter, until replacing a meter is
//   supported (a later issue); the schema itself allows more;
// - `pending` is only a new customer's status, while they wait for a meter;
//   their meter's arrival makes them active.

/** How many active meters the customer has, not counting `exceptMeterId`. */
function activeMeters(app, customerId, exceptMeterId) {
  return app.countRecords(
    "meters",
    $dbx.hashExp({ customer: customerId, status: "active" }),
    $dbx.not($dbx.hashExp({ id: exceptMeterId })),
  )
}

function reject(field, code, message) {
  throw new BadRequestError(message, { [field]: new ValidationError(code, message) })
}

/** Checks a customer's status; `before` is null for a new customer. */
function checkCustomer(app, before, customer) {
  const status = customer.getString("status")
  if (before && before.getString("status") === status) return

  if (status === "pending" && before) {
    reject("status", "validation_pending_only_new", "Only a new customer, still waiting for a meter, can be pending.")
  }
  if (status === "active" && activeMeters(app, customer.id, "") === 0) {
    reject("status", "validation_no_active_meter", "An active customer needs an active meter.")
  }
}

/** Checks a meter change; `before` is null for a new meter, `after` null for a deleted one. */
function checkMeter(app, before, after) {
  const counts = (meter) => meter !== null && meter.getString("status") === "active"
  const customerOf = (meter) => meter.getString("customer")
  const sameMeterOfSameCustomer = counts(before) && counts(after) && customerOf(before) === customerOf(after)
  if (sameMeterOfSameCustomer) return

  // The meter stops being its customer's active meter: removed, moved or deleted.
  if (counts(before)) {
    const customerId = customerOf(before)
    const customerActive = app.findRecordById("customers", customerId).getString("status") === "active"
    if (customerActive && activeMeters(app, customerId, before.id) === 0) {
      const moved = after !== null && customerOf(after) !== customerId
      reject(
        moved ? "customer" : "status",
        "validation_customer_needs_active_meter",
        "This is the active customer's only active meter. Change the customer's status first.",
      )
    }
  }
  // The meter becomes a customer's active meter: new, put back in use, or moved.
  if (counts(after) && activeMeters(app, customerOf(after), after.id) > 0) {
    reject("customer", "validation_customer_has_active_meter", "The customer already has an active meter.")
  }
}

/** Once a pending customer's meter is in use, they're active. Call after the meter is saved. */
function activateWaitingCustomer(app, meter) {
  if (meter.getString("status") !== "active") return
  const customer = app.findRecordById("customers", meter.getString("customer"))
  if (customer.getString("status") !== "pending") return
  customer.set("status", "active")
  app.save(customer)
}

module.exports = { checkCustomer, checkMeter, activateWaitingCustomer }
