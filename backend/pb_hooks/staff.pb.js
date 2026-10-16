/// <reference path="../pb_data/types.d.ts" />

// Deactivating a staff member also ends the sessions they already have. The
// auth rule (`active = true`) only stops new logins; rotating the token key
// invalidates every token issued before.
onRecordUpdate((e) => {
  if (e.record.original().getBool("active") && !e.record.getBool("active")) {
    e.record.refreshTokenKey()
  }
  e.next()
}, "users")
