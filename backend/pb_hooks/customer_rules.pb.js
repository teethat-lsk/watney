/// <reference path="../pb_data/types.d.ts" />

// Keeps customers and their meters consistent (ADR 0001, #4); the rules are
// in customer_rules.js. They run on every save, from the API or the dashboard.

onRecordCreate((e) => {
  require(`${__hooks}/customer_rules.js`).checkCustomer(e.app, null, e.record)
  e.next()
}, "customers")

onRecordUpdate((e) => {
  require(`${__hooks}/customer_rules.js`).checkCustomer(e.app, e.record.original(), e.record)
  e.next()
}, "customers")

onRecordCreate((e) => {
  const rules = require(`${__hooks}/customer_rules.js`)
  rules.checkMeter(e.app, null, e.record)
  e.next()
  rules.activateWaitingCustomer(e.app, e.record)
}, "meters")

onRecordUpdate((e) => {
  const rules = require(`${__hooks}/customer_rules.js`)
  rules.checkMeter(e.app, e.record.original(), e.record)
  e.next()
  rules.activateWaitingCustomer(e.app, e.record)
}, "meters")

onRecordDelete((e) => {
  require(`${__hooks}/customer_rules.js`).checkMeter(e.app, e.record, null)
  e.next()
}, "meters")
