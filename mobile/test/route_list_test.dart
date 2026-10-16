import 'package:flutter_test/flutter_test.dart';
import 'package:watney/src/customer.dart';
import 'package:watney/src/route_list.dart';

Customer customer(
  String name, {
  String route = 'สาย 1',
  int moo = 1,
  String houseNo = '1',
  CustomerStatus status = CustomerStatus.active,
  List<String> meters = const [],
}) {
  return Customer(
    id: name,
    houseNo: houseNo,
    moo: moo,
    name: name,
    phone: '',
    routeName: route,
    status: status,
    meters: [
      for (final number in meters)
        Meter(
          id: number,
          number: number,
          size: '1/2',
          installedOn: '2026-01-15',
          startReading: 0,
          status: MeterStatus.active,
        ),
    ],
  );
}

List<String> names(List<Customer> customers) => [
  for (final c in customers) c.name,
];

void main() {
  group('routeList', () {
    test('orders customers by route, then หมู่, then house number', () {
      final list = routeList([
        customer('d', route: 'สาย 2', moo: 1, houseNo: '1'),
        customer('c', route: 'สาย 1', moo: 2, houseNo: '10'),
        customer('a', route: 'สาย 1', moo: 1, houseNo: '5'),
        customer('b', route: 'สาย 1', moo: 2, houseNo: '9'),
      ]);

      expect(names(list), ['a', 'b', 'c', 'd']);
    });

    test(
      'compares the numbers inside house numbers and route names as numbers',
      () {
        final list = routeList([
          customer('12/10', houseNo: '12/10'),
          customer('12/3', houseNo: '12/3'),
          customer('2', houseNo: '2'),
          customer('route 10', route: 'สาย 10'),
          customer('route 9', route: 'สาย 9'),
        ]);

        expect(names(list), ['2', '12/3', '12/10', 'route 9', 'route 10']);
      },
    );

    test('leaves out customers whose meters are not read: pending and cancelled ones', () {
      final list = routeList([
        customer('active'),
        customer('water cut', status: CustomerStatus.waterCut),
        customer('pending', status: CustomerStatus.pending),
        customer('cancelled', status: CustomerStatus.cancelled),
      ]);

      expect(names(list), ['active', 'water cut']);
    });
  });

  group('search', () {
    final customers = [
      customer('นายมานะ ใจดี', houseNo: '12/3', meters: ['WM-001']),
      customer('นางสมศรี มีสุข', houseNo: '45', meters: ['WM-002', 'AB-777']),
    ];

    test('finds customers by part of their name', () {
      expect(names(search(customers, 'สมศรี')), ['นางสมศรี มีสุข']);
    });

    test('finds customers by house number', () {
      expect(names(search(customers, '12/3')), ['นายมานะ ใจดี']);
    });

    test(
      'finds customers by meter number, ignoring case and spaces around it',
      () {
        expect(names(search(customers, '  ab-777 ')), ['นางสมศรี มีสุข']);
      },
    );

    test(
      'returns everyone for an empty query, and no one when nothing matches',
      () {
        expect(names(search(customers, ' ')), [
          'นายมานะ ใจดี',
          'นางสมศรี มีสุข',
        ]);
        expect(search(customers, 'ไม่มีใคร'), isEmpty);
      },
    );
  });
}
