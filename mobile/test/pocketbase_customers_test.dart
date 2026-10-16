import 'package:flutter_test/flutter_test.dart';
import 'package:watney/src/customer.dart';
import 'package:watney/src/customers.dart';

import 'fixtures.dart';

void main() {
  test('reads the customers the backend lets the reader see, with their route and meters', () async {
    final pb = fakeBackend((request) {
      expect(
        request.url.queryParameters['expand'],
        'route,meters_via_customer',
      );
      return (
        200,
        {
          'page': 1,
          'perPage': 1000,
          'totalItems': 1,
          'totalPages': 1,
          'items': [
            {
              'id': 'c1',
              'house_no': '12/3',
              'moo': 4,
              'name': 'นายมานะ ใจดี',
              'phone': '0812345678',
              'status': 'water_cut',
              'route': 'r1',
              'expand': {
                'route': {'id': 'r1', 'name': 'สาย 1'},
                'meters_via_customer': [
                  {
                    'id': 'm1',
                    'number': 'WM-001',
                    'size': '3/4',
                    'installed_on': '2026-01-15 00:00:00.000Z',
                    'start_reading': 12.5,
                    'customer': 'c1',
                    'status': 'removed',
                  },
                ],
              },
            },
          ],
        },
      );
    });

    final [customer] = await PocketBaseCustomers(pb).routeCustomers();

    expect(
      [
        customer.id,
        customer.houseNo,
        customer.moo,
        customer.name,
        customer.phone,
        customer.routeName,
        customer.status,
      ],
      [
        'c1',
        '12/3',
        4,
        'นายมานะ ใจดี',
        '0812345678',
        'สาย 1',
        CustomerStatus.waterCut,
      ],
    );
    final [meter] = customer.meters;
    expect(
      [
        meter.number,
        meter.size,
        meter.installedOn,
        meter.startReading,
        meter.status,
      ],
      ['WM-001', '3/4', '2026-01-15', 12.5, MeterStatus.removed],
    );
  });
}
