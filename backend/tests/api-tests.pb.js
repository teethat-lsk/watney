/// <reference path="../pb_data/types.d.ts" />

// `pocketbase api-tests <base-url>`: run the *.test.js suites in this folder
// against a running PocketBase that uses the same data dir. scripts/check.sh
// starts one on a throwaway data dir and runs this with `--hooksDir tests`, so
// these files never load into a real server.
$app.rootCmd.addCommand(new Command({
  use: "api-tests <base-url>",
  short: "Run the access-rule and hook tests against a running PocketBase on this data dir",
  run: (cmd, args) => {
    const { run } = require(`${__hooks}/harness.js`)
    const suites = $os.readDir(__hooks)
      .map((entry) => entry.name())
      .filter((name) => name.endsWith(".test.js"))
      .sort()
      .map((name) => [name.replace(".test.js", ""), require(`${__hooks}/${name}`)])
    if (run(args[0], suites) > 0) {
      $os.exit(1)
    }
  },
}))
