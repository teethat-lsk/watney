# mobile — field app

The Flutter field app for meter readers, Android first (see [docs/tech-spec.md](../docs/tech-spec.md) §3). The pure-Dart billing-logic module will live here too.

## Commands

Run in this folder (or `make mobile`, `make mobile-setup`, `make mobile-check` from the repo root):

| Command | What it does |
|---|---|
| `make setup` | `flutter pub get` |
| `make dev` | `flutter run` on a connected phone or running emulator (needs the Android SDK) |
| `make check` | Format check, analyze, test |

`android/gradle.properties` caps the Gradle heap at 4 GB and stops an idle Gradle daemon after 15 minutes. The Flutter template's default is an 8 GB heap with a 3-hour idle time.

## Notes

- The Android application ID is the placeholder `com.example.watney`. Choose the real one before the first Play Store or Firebase App Distribution release; it can't change after that.
- The backend address for emulators and phones is in [backend/README.md](../backend/README.md#reaching-the-backend-from-a-phone). The local backend uses plain HTTP, so debug builds will need cleartext traffic allowed when the app first talks to it.
