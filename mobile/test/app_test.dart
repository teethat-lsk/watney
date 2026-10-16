import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:watney/main.dart';
import 'package:watney/src/auth.dart';
import 'package:watney/src/customer.dart';
import 'package:watney/src/customers.dart';

import 'fixtures.dart';

const reader = MeterReader(
  id: 'u3',
  email: 'reader@example.com',
  name: 'สมปอง',
);

class FakeAuth implements Auth {
  FakeAuth({this.stored, this.failure});

  /// The session stored by an earlier login, if any.
  MeterReader? stored;

  /// Why every login fails; logins succeed when null.
  final LoginFailure? failure;
  final logins = <(String, String)>[];
  var loggedOut = false;

  @override
  Future<MeterReader?> restore() async => stored;

  @override
  Future<MeterReader> login(String email, String password) async {
    logins.add((email, password));
    if (failure != null) throw LoginError(failure!);
    return stored = reader;
  }

  @override
  Future<void> logout() async {
    loggedOut = true;
    stored = null;
  }
}

class FakeCustomers implements CustomerRepository {
  FakeCustomers(this.customers, {this.failing = false});

  final List<Customer> customers;
  bool failing;

  @override
  Future<List<Customer>> routeCustomers() async {
    if (failing) throw Exception('offline');
    return customers;
  }
}

final customers = [
  customer(
    'นางสมศรี มีสุข',
    id: 'c2',
    houseNo: '9',
    moo: 2,
    phone: '0899999999',
    status: CustomerStatus.waterCut,
    meters: [meter('WM-002')],
  ),
  customer(
    'นายมานะ ใจดี',
    id: 'c1',
    houseNo: '12/3',
    phone: '0812345678',
    meters: [
      meter('WM-001'),
      meter('OLD-001', status: MeterStatus.removed),
    ],
  ),
  customer('นายกล้า หาญ', id: 'c3', route: 'สาย 2', meters: [meter('WM-003')]),
  customer(
    'นางวีณา เลิกใช้',
    id: 'c4',
    status: CustomerStatus.cancelled,
    meters: [meter('WM-004', status: MeterStatus.removed)],
  ),
];

Future<void> startApp(
  WidgetTester tester, {
  required Auth auth,
  CustomerRepository? repository,
}) async {
  await tester.pumpWidget(
    WatneyApp(
      auth: auth,
      customers: repository ?? FakeCustomers(customers),
      backendUrl: 'http://10.0.2.2:8090',
    ),
  );
  await tester.pumpAndSettle();
}

Future<void> logIn(WidgetTester tester) async {
  await tester.enterText(
    find.widgetWithText(TextField, 'อีเมล'),
    'reader@example.com',
  );
  await tester.enterText(
    find.widgetWithText(TextField, 'รหัสผ่าน'),
    'secret-password',
  );
  await tester.tap(find.widgetWithText(FilledButton, 'เข้าสู่ระบบ'));
  await tester.pumpAndSettle();
}

/// The ids of the customers listed, top to bottom.
List<String> listedCustomers(WidgetTester tester) => [
  for (final tile in tester.widgetList<ListTile>(find.byType(ListTile)))
    (tile.key! as ValueKey<String>).value,
];

void main() {
  testWidgets(
    'shows the login form, with the backend address, when no session is stored',
    (tester) async {
      await startApp(tester, auth: FakeAuth());

      expect(find.widgetWithText(FilledButton, 'เข้าสู่ระบบ'), findsOneWidget);
      expect(find.textContaining('http://10.0.2.2:8090'), findsOneWidget);
    },
  );

  testWidgets(
    'logs a meter reader in and lists the customers on their routes in route order',
    (tester) async {
      final auth = FakeAuth();
      await startApp(tester, auth: auth);

      await logIn(tester);

      expect(auth.logins, [('reader@example.com', 'secret-password')]);
      expect(listedCustomers(tester), ['c1', 'c2', 'c3']);
      expect(find.text('สมปอง'), findsOneWidget);
    },
  );

  testWidgets(
    'starts on the customer list when a session is stored from before',
    (tester) async {
      await startApp(tester, auth: FakeAuth(stored: reader));

      expect(listedCustomers(tester), ['c1', 'c2', 'c3']);
    },
  );

  testWidgets('tells the user why a login failed', (tester) async {
    const messages = {
      LoginFailure.invalid: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง',
      LoginFailure.inactive: 'บัญชีนี้ถูกปิดใช้งาน ติดต่อผู้ดูแลระบบ',
      LoginFailure.notReader: 'แอปนี้สำหรับเจ้าหน้าที่จดมาตรเท่านั้น',
      LoginFailure.unreachable:
          'ติดต่อเซิร์ฟเวอร์ไม่ได้ ตรวจสอบการเชื่อมต่อแล้วลองใหม่',
    };
    for (final MapEntry(key: failure, value: message) in messages.entries) {
      await startApp(tester, auth: FakeAuth(failure: failure));

      await logIn(tester);

      expect(find.text(message), findsOneWidget);
      expect(find.byType(ListTile), findsNothing);
    }
  });

  testWidgets('logs out back to the login form', (tester) async {
    final auth = FakeAuth(stored: reader);
    await startApp(tester, auth: auth);

    await tester.tap(find.byTooltip('ออกจากระบบ'));
    await tester.pumpAndSettle();

    expect(auth.loggedOut, isTrue);
    expect(find.widgetWithText(FilledButton, 'เข้าสู่ระบบ'), findsOneWidget);
  });

  testWidgets('searches by name, house number or meter number', (tester) async {
    await startApp(tester, auth: FakeAuth(stored: reader));

    for (final (query, expected) in [
      ('สมศรี', ['c2']),
      ('12/3', ['c1']),
      ('wm-003', ['c3']),
      ('วีณา', ['c4']),
      ('', ['c1', 'c2', 'c3']),
    ]) {
      await tester.enterText(find.byType(TextField), query);
      await tester.pumpAndSettle();
      expect(listedCustomers(tester), expected, reason: 'searching "$query"');
    }
  });

  testWidgets("shows a customer's details and meters when tapped", (
    tester,
  ) async {
    await startApp(tester, auth: FakeAuth(stored: reader));

    await tester.tap(find.text('นายมานะ ใจดี'));
    await tester.pumpAndSettle();

    for (final text in [
      'นายมานะ ใจดี',
      '12/3',
      '1',
      'สาย 1',
      '0812345678',
      'ปกติ',
      'WM-001',
      '¾ นิ้ว',
      '15/1/2569',
      '12.5',
      'OLD-001',
      'ถอดแล้ว',
    ]) {
      expect(find.text(text), findsWidgets, reason: text);
    }
  });

  testWidgets(
    'goes back to the login form when a reload finds the session has ended',
    (tester) async {
      final auth = FakeAuth(stored: reader);
      await startApp(tester, auth: auth);

      auth.stored = null; // say an admin deactivated the reader meanwhile
      await tester.fling(find.byType(ListView), const Offset(0, 400), 1000);
      await tester.pumpAndSettle();

      expect(find.widgetWithText(FilledButton, 'เข้าสู่ระบบ'), findsOneWidget);
    },
  );

  testWidgets("offers to try again when the customers can't be loaded", (
    tester,
  ) async {
    final repository = FakeCustomers(customers, failing: true);
    await startApp(
      tester,
      auth: FakeAuth(stored: reader),
      repository: repository,
    );
    expect(find.text('โหลดรายชื่อผู้ใช้น้ำไม่สำเร็จ'), findsOneWidget);

    repository.failing = false;
    await tester.tap(find.widgetWithText(FilledButton, 'ลองใหม่'));
    await tester.pumpAndSettle();

    expect(listedCustomers(tester), ['c1', 'c2', 'c3']);
  });
}
