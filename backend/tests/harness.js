/// <reference path="../pb_data/types.d.ts" />

// A small test harness for the API tests. It runs inside PocketBase's JS engine
// (see api-tests.pb.js), so it has no Node APIs: fixtures are saved with $app,
// straight into the database and around the API rules, and requests go over
// HTTP with $http.send, through the rules under test.

const PASSWORD = "test-password"

let staffCount = 0

/** Saves a staff account (active, with the given fields) and returns its record. */
function createStaff(fields) {
  staffCount++
  const record = new Record($app.findCollectionByNameOrId("users"))
  record.setEmail(`staff${staffCount}@test.local`)
  record.setPassword(PASSWORD)
  record.setVerified(true)
  record.set("name", `Staff ${staffCount}`)
  record.set("active", true)
  for (const key in fields) {
    record.set(key, fields[key])
  }
  $app.save(record)
  return record
}

/** Saves a superuser: an operator of the PocketBase dashboard, not a staff member. */
function createSuperuser() {
  staffCount++
  const record = new Record($app.findCollectionByNameOrId("_superusers"))
  record.setEmail(`operator${staffCount}@test.local`)
  record.setPassword(PASSWORD)
  $app.save(record)
  return record
}

/** Saves a record in the collection with the given fields and returns it. Hooks don't run here. */
function createRecord(collection, fields) {
  const record = new Record($app.findCollectionByNameOrId(collection))
  for (const key in fields) {
    record.set(key, fields[key])
  }
  $app.save(record)
  return record
}

/** Saves a route with a unique name. */
function createRoute(fields) {
  return createRecord("routes", { name: `สาย ${newId()}`, ...fields })
}

/** Saves an active customer on the route. Fixtures skip hooks, so it needs no meter. */
function createCustomer(route, fields) {
  return createRecord("customers", { house_no: "1", moo: 1, name: "ผู้ใช้น้ำ", status: "active", route: route.id, ...fields })
}

/** Saves an active meter, with a unique number, for the customer. */
function createMeter(customer, fields) {
  return createRecord("meters", {
    number: `M-${newId()}`,
    size: "1/2",
    installed_on: "2026-01-15",
    start_reading: 0,
    customer: customer.id,
    status: "active",
    ...fields,
  })
}

/** A random record id, as a client chooses one to refer to a record before it's created. */
function newId() {
  return $security.randomStringWithAlphabet(15, "abcdefghijklmnopqrstuvwxyz0123456789")
}

/** An API client that sends requests as the given auth token, or as a guest without one. */
function client(baseUrl, token) {
  function send(method, path, body) {
    const headers = { "Content-Type": "application/json" }
    if (token) {
      headers["Authorization"] = token
    }
    const res = $http.send({
      url: baseUrl + path,
      method,
      headers,
      body: body === undefined ? "" : JSON.stringify(body),
    })
    return { status: res.statusCode, body: res.json }
  }

  const records = (collection) => `/api/collections/${collection}/records`

  return {
    send,
    list: (collection, query) => send("GET", `${records(collection)}?perPage=500${query ? "&" + query : ""}`),
    view: (collection, id) => send("GET", `${records(collection)}/${id}`),
    create: (collection, data) => send("POST", records(collection), data),
    update: (collection, id, data) => send("PATCH", `${records(collection)}/${id}`, data),
    remove: (collection, id) => send("DELETE", `${records(collection)}/${id}`),
    login: (email, password) => send("POST", "/api/collections/users/auth-with-password", { identity: email, password }),
    /** Runs the requests (`{ method, url, body }`) in one transaction: all succeed, or none. */
    batch: (requests) => send("POST", "/api/batch", { requests }),
  }
}

function expect(actual) {
  const show = (value) => JSON.stringify(value)
  const fail = (message) => {
    throw new Error(message)
  }
  return {
    toBe(expected) {
      if (actual !== expected) fail(`expected ${show(expected)}, got ${show(actual)}`)
    },
    toEqual(expected) {
      if (show(actual) !== show(expected)) fail(`expected ${show(expected)}, got ${show(actual)}`)
    },
    /** For a response: checks its HTTP status and shows the body when it differs. */
    toHaveStatus(expected) {
      if (actual.status !== expected) fail(`expected HTTP ${expected}, got ${actual.status}: ${show(actual.body)}`)
    },
  }
}

/** The ids of the records in a list response. */
function ids(res) {
  return (res.body.items || []).map((item) => item.id).sort()
}

/**
 * Runs every suite against the PocketBase at baseUrl and prints one line per test.
 * Each suite is a function that registers tests with `test(name, fn)`.
 * Returns the number of failed tests.
 */
function run(baseUrl, suites) {
  const tests = []
  let suite = ""
  const t = {
    PASSWORD,
    test: (name, fn) => tests.push({ suite, name, fn }),
    expect,
    ids,
    newId,
    createStaff,
    createSuperuser,
    createRoute,
    createCustomer,
    createMeter,
    guest: client(baseUrl, ""),
    as: (record) => client(baseUrl, record.newAuthToken()),
  }
  for (const [name, register] of suites) {
    suite = name
    register(t)
  }

  let failed = 0
  for (const { suite, name, fn } of tests) {
    try {
      fn()
      console.log(`ok   ${suite}: ${name}`)
    } catch (error) {
      failed++
      console.log(`FAIL ${suite}: ${name}\n     ${(error && error.message) || error}`)
    }
  }
  console.log(`${tests.length - failed} passed, ${failed} failed`)
  return failed
}

module.exports = { run }
