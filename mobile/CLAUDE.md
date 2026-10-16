# mobile — field app

Packages are in `../docs/tech-spec.md` §3. Read the matching source before working on:

- **billing** (meter reading → amount): `../docs/adr/0001-metered-billing.md` and §3. Billing logic is a pure Dart module that imports only Dart core libraries. It is the project's primary test seam, so write it test-first.
- **offline sync** (outbox, client-generated ids, conflicts): §6.
- **printing and PromptPay** (ESC/POS, Thai text as an image, QR): §7.

Other notes:

- **Android first.** The app ID `com.example.watney` is a placeholder until the first release.
- **Backend address** is built in per build (`PB_URL`): `README.md` "Backend address". Phone networking on WSL: `../backend/README.md`.
- **Done** means `make check` passes (format, analyze, test).
