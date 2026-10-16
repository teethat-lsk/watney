# mobile — field app

The Flutter field app for meter readers, Android first (see [docs/tech-spec.md](../docs/tech-spec.md) §3). The pure-Dart billing-logic module will live here too.

## Commands

Run in this folder (or `make mobile`, `make mobile-setup`, `make mobile-check` from the repo root):

| Command | What it does |
|---|---|
| `make setup` | `flutter pub get` |
| `make dev` | `flutter run` on a connected phone or running emulator (needs the Android SDK) |
| `make check` | Format check, analyze, test |
| `make apk` | Build a debug APK into `build/app/outputs/flutter-apk/app-debug.apk` |

## Backend address

The app is built with the PocketBase address in it (`--dart-define=PB_URL=…`). `make dev` and `make apk` take it from `PB_URL`:

| Where the app runs | Command |
|---|---|
| Android emulator (the default) | `make dev` (uses `http://10.0.2.2:8090`) |
| Real phone on the same Wi-Fi | `make dev PB_URL=http://<computer's LAN IP>:8090`, for example `make dev PB_URL=http://192.168.1.50:8090` |

The same works for `make apk`, and from the repo root (`make mobile PB_URL=…`). The login screen shows the address the app was built with. On WSL, a phone needs the port proxy from [backend/README.md](../backend/README.md#reaching-the-backend-from-a-phone) first. Debug builds allow plain HTTP to the local backend (`android/app/src/debug/AndroidManifest.xml`).

CI builds a debug APK on every push (the `watney-debug-apk` artifact) with the emulator address. For a real phone, build one locally with `PB_URL` set.

## What it does

A meter reader logs in with their staff account. The session is kept in Android's encrypted storage, so the app opens straight to their customers after a restart. On start it checks the stored session with the backend, so a deactivated account goes back to the login screen. Other roles can't use the app: the login is refused with a message.

The customer list shows the customers on the reader's routes, in walking order: by route, then หมู่, then house number. Customers who are pending or cancelled have no meter to read, so they're left out. Search matches a name, a house number or a meter number. Tapping a customer opens their details and meters. The app is online only for now; pull down to reload the list.

| File | What |
|---|---|
| `lib/main.dart` | Startup: the backend address, and the app, which shows the login screen or the customer list |
| `lib/src/auth.dart` | The `Auth` interface and its PocketBase implementation, with the session kept in a `SessionStore` |
| `lib/src/customers.dart` | The `CustomerRepository` interface and its PocketBase implementation |
| `lib/src/customer.dart`, `lib/src/route_list.dart` | Pure Dart: the customer model, walking order and search |
| `lib/src/*_screen.dart` | The screens |

Tests use fakes of `Auth` and `CustomerRepository` for the screens (`test/app_test.dart`). The PocketBase implementations are tested with a fake HTTP client.

`android/gradle.properties` caps the Gradle heap at 4 GB and stops an idle Gradle daemon after 15 minutes. The Flutter template's default is an 8 GB heap with a 3-hour idle time.

## Notes

- The Android application ID is the placeholder `com.example.watney`. Choose the real one before the first Play Store or Firebase App Distribution release; it can't change after that.
- Networking from a phone to the backend on WSL is in [backend/README.md](../backend/README.md#reaching-the-backend-from-a-phone).
