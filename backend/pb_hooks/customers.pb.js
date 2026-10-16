/// <reference path="../pb_data/types.d.ts" />

// Every active customer has an active meter (ADR 0001, #4). Checked when a
// customer becomes active, and when a meter stops counting for its customer:
// it's removed, moved to another customer, or deleted.

onRecordCreate((e) => {
  require(`${__hooks}/active_meter.js`).checkActivation(e.app, null, e.record)
  e.next()
}, "customers")

onRecordUpdate((e) => {
  require(`${__hooks}/active_meter.js`).checkActivation(e.app, e.record.original(), e.record)
  e.next()
}, "customers")

onRecordUpdate((e) => {
  require(`${__hooks}/active_meter.js`).checkMeterLeaving(e.app, e.record.original(), e.record)
  e.next()
}, "meters")

onRecordDelete((e) => {
  require(`${__hooks}/active_meter.js`).checkMeterLeaving(e.app, e.record, null)
  e.next()
}, "meters")
