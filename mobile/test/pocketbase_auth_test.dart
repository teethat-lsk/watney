import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:watney/src/auth.dart';

import 'fixtures.dart';

/// A token PocketBase's auth store accepts as unexpired (it only decodes the payload).
final token = [
  'e30',
  base64Url
      .encode(
        utf8.encode(
          jsonEncode({
            'exp': DateTime.now().millisecondsSinceEpoch ~/ 1000 + 3600,
          }),
        ),
      )
      .replaceAll('=', ''),
  'signature',
].join('.');

Map<String, dynamic> staffRecord({String role = 'meter_reader'}) => {
  'id': 'u3',
  'collectionId': '_pb_users_auth_',
  'collectionName': 'users',
  'email': 'reader@example.com',
  'name': 'สมปอง',
  'role': role,
  'active': true,
};

class MemorySessionStore implements SessionStore {
  String? saved;

  @override
  Future<String?> read() async => saved;

  @override
  Future<void> write(String session) async => saved = session;

  @override
  Future<void> clear() async => saved = null;
}

final authenticated = (200, {'token': token, 'record': staffRecord()});

void main() {
  test(
    'logs a meter reader in and restores the session on the next start',
    () async {
      final store = MemorySessionStore();

      final reader = await PocketBaseAuth(
        fakeBackend((_) => authenticated),
        store,
      ).login('reader@example.com', 'secret-password');
      expect(reader.name, 'สมปอง');

      final restarted = PocketBaseAuth(
        fakeBackend((request) {
          expect(request.url.path, '/api/collections/users/auth-refresh');
          expect(request.headers['Authorization'], token);
          return authenticated;
        }),
        store,
      );
      expect((await restarted.restore())?.email, 'reader@example.com');
    },
  );

  test('starts logged out when no session is stored', () async {
    final auth = PocketBaseAuth(
      fakeBackend((_) => fail('no request expected')),
      MemorySessionStore(),
    );

    expect(await auth.restore(), isNull);
  });

  test("rejects staff who aren't meter readers and keeps no session", () async {
    final store = MemorySessionStore();
    final auth = PocketBaseAuth(
      fakeBackend(
        (_) => (200, {'token': token, 'record': staffRecord(role: 'office')}),
      ),
      store,
    );

    await expectLater(
      auth.login('office@example.com', 'secret-password'),
      throwsA(
        isA<LoginError>().having(
          (e) => e.reason,
          'reason',
          LoginFailure.notReader,
        ),
      ),
    );
    expect(store.saved, isNull);
  });

  test('tells a wrong password from a deactivated account', () async {
    for (final (status, reason) in [
      (400, LoginFailure.invalid),
      (403, LoginFailure.inactive),
    ]) {
      final auth = PocketBaseAuth(
        fakeBackend(
          (_) => (status, {'status': status, 'message': '', 'data': {}}),
        ),
        MemorySessionStore(),
      );

      await expectLater(
        auth.login('reader@example.com', 'secret-password'),
        throwsA(isA<LoginError>().having((e) => e.reason, 'reason', reason)),
      );
    }
  });

  test('reports a backend that does not answer as unreachable', () async {
    await expectLater(
      PocketBaseAuth(
        unreachableBackend(),
        MemorySessionStore(),
      ).login('reader@example.com', 'secret-password'),
      throwsA(
        isA<LoginError>().having(
          (e) => e.reason,
          'reason',
          LoginFailure.unreachable,
        ),
      ),
    );
  });

  test('drops a stored session the backend no longer accepts, or that is no longer a meter reader\'s', () async {
    final rejections = <(int, Object)>[
      (401, {'status': 401, 'message': '', 'data': {}}),
      (403, {'status': 403, 'message': '', 'data': {}}),
      (200, {'token': token, 'record': staffRecord(role: 'office')}),
    ];
    for (final answer in rejections) {
      final store = MemorySessionStore();
      await PocketBaseAuth(
        fakeBackend((_) => authenticated),
        store,
      ).login('reader@example.com', 'secret-password');

      expect(
        await PocketBaseAuth(fakeBackend((_) => answer), store).restore(),
        isNull,
      );
      expect(store.saved, isNull);
    }
  });

  test(
    "keeps the stored session when the backend can't be reached on start",
    () async {
      final store = MemorySessionStore();
      await PocketBaseAuth(
        fakeBackend((_) => authenticated),
        store,
      ).login('reader@example.com', 'secret-password');

      expect(
        (await PocketBaseAuth(unreachableBackend(), store).restore())?.name,
        'สมปอง',
      );
      expect(store.saved, isNotNull);
    },
  );

  test('logs out and forgets the session', () async {
    final store = MemorySessionStore();
    final auth = PocketBaseAuth(fakeBackend((_) => authenticated), store);
    await auth.login('reader@example.com', 'secret-password');

    await auth.logout();

    expect(store.saved, isNull);
    expect(
      await PocketBaseAuth(fakeBackend((_) => authenticated), store).restore(),
      isNull,
    );
  });
}
