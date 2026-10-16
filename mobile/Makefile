.PHONY: setup dev check apk

# The backend address built into the app (README: "Backend address").
PB_URL ?= http://10.0.2.2:8090

setup:
	flutter pub get

dev:
	flutter run --dart-define=PB_URL=$(PB_URL)

check:
	dart format --set-exit-if-changed lib test
	flutter analyze
	flutter test

apk:
	flutter build apk --debug --dart-define=PB_URL=$(PB_URL)
