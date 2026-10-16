.PHONY: setup dev check

setup:
	flutter pub get

dev:
	flutter run

check:
	dart format --set-exit-if-changed lib test
	flutter analyze
	flutter test
