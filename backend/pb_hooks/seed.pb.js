/// <reference path="../pb_data/types.d.ts" />

// `pocketbase seed`: create the first admin staff user for local development,
// or update its password, name and role if it already exists. Run it through
// scripts/seed.sh, which loads the credentials from .env and applies migrations first.
$app.rootCmd.addCommand(new Command({
  use: "seed",
  short: "Create or update the first admin staff user from WATNEY_SEED_ADMIN_* variables",
  run: (cmd, args) => {
    const email = $os.getenv("WATNEY_SEED_ADMIN_EMAIL")
    const password = $os.getenv("WATNEY_SEED_ADMIN_PASSWORD")
    const name = $os.getenv("WATNEY_SEED_ADMIN_NAME")
    if (!email || !password) {
      console.error("Set WATNEY_SEED_ADMIN_EMAIL and WATNEY_SEED_ADMIN_PASSWORD (see .env.example).")
      $os.exit(1)
    }

    let record
    try {
      record = $app.findAuthRecordByEmail("users", email)
    } catch (_) {
      record = new Record($app.findCollectionByNameOrId("users"))
      record.setEmail(email)
    }
    record.setPassword(password)
    if (name) {
      record.set("name", name)
    }
    record.set("role", "admin")
    record.setVerified(true)
    $app.save(record)

    console.log("Admin staff user ready: " + email)
  },
}))
