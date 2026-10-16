import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:pocketbase/pocketbase.dart';
import 'package:watney/src/auth.dart';

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

/// A PocketBase client whose requests get [answer]'s status and JSON body.
PocketBase backend((int, Object) Function(http.Request request) answer) {
  return PocketBase(
    'http://pb.test',
    httpClientFactory: () => MockClient((request) async {
      final (status, body) = answer(request);
      return http.Response(
        jsonEncode(body),
        status,
        headers: {'content-type': 'application/json; charset=utf-8'},
      );
    }),
  );
}

PocketBase unreachable() => PocketBase(
  'http://pb.test',
  httpClientFactory: () =>
      MockClient((_) async => throw http.ClientException('no route to host')),
);

final authenticated = (200, {'token': token, 'record': staffRecord()});

void main() {
  test(
    'logs a meter reader in and restores the session on the next start',
    () async {
      final store = MemorySessionStore();

      final reader = await PocketBaseAuth(
        backend((_) => authenticated),
        store,
      ).login('reader@example.com', 'secret-password');
      expect(reader.name, 'สมปอง');

      final restarted = PocketBaseAuth(
        backend((request) {
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
      backend((_) => fail('no request expected')),
      MemorySessionStore(),
    );

    expect(await auth.restore(), isNull);
  });

  test("rejects staff who aren't meter readers and keeps no session", () async {
    final store = MemorySessionStore();
    final auth = PocketBaseAuth(
      backend(
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
        backend((_) => (status, {'status': status, 'message': '', 'data': {}})),
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
        unreachable(),
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
        backend((_) => authenticated),
        store,
      ).login('reader@example.com', 'secret-password');

      expect(
        await PocketBaseAuth(backend((_) => answer), store).restore(),
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
        backend((_) => authenticated),
        store,
      ).login('reader@example.com', 'secret-password');

      expect(
        (await PocketBaseAuth(unreachable(), store).restore())?.name,
        'สมปอง',
      );
      expect(store.saved, isNotNull);
    },
  );

  test('logs out and forgets the session', () async {
    final store = MemorySessionStore();
    final auth = PocketBaseAuth(backend((_) => authenticated), store);
    await auth.login('reader@example.com', 'secret-password');

    await auth.logout();

    expect(store.saved, isNull);
    expect(
      await PocketBaseAuth(backend((_) => authenticated), store).restore(),
      isNull,
    );
  });
}
