import 'package:pocketbase/pocketbase.dart';

import 'customer.dart';

/// The customers on the logged-in reader's routes. The app depends on this, so
/// tests can swap in a fake.
abstract interface class CustomerRepository {
  Future<List<Customer>> routeCustomers();
}

/// Reads customers from PocketBase. Its access rules return only the customers
/// on the reader's routes, so no filter is needed here.
class PocketBaseCustomers implements CustomerRepository {
  PocketBaseCustomers(this._pb);

  final PocketBase _pb;

  @override
  Future<List<Customer>> routeCustomers() async {
    final records = await _pb
        .collection('customers')
        .getFullList(expand: 'route,meters_via_customer');
    return records.map(_toCustomer).toList();
  }
}

Customer _toCustomer(RecordModel record) => Customer(
  id: record.id,
  houseNo: record.getStringValue('house_no'),
  moo: record.getIntValue('moo'),
  name: record.getStringValue('name'),
  phone: record.getStringValue('phone'),
  routeName: record.getStringValue('expand.route.name'),
  status: _customerStatuses[record.getStringValue('status')]!,
  meters: record
      .get<List<dynamic>>('expand.meters_via_customer', [])
      .map((meter) => _toMeter(RecordModel(meter as Map<String, dynamic>)))
      .toList(),
);

const _customerStatuses = {
  'pending': CustomerStatus.pending,
  'active': CustomerStatus.active,
  'water_cut': CustomerStatus.waterCut,
  'cancelled': CustomerStatus.cancelled,
};

Meter _toMeter(RecordModel record) => Meter(
  id: record.id,
  number: record.getStringValue('number'),
  size: record.getStringValue('size'),
  // PocketBase dates look like "2026-01-15 00:00:00.000Z".
  installedOn: record.getStringValue('installed_on').substring(0, 10),
  startReading: record.getDoubleValue('start_reading'),
  status: record.getStringValue('status') == 'active'
      ? MeterStatus.active
      : MeterStatus.removed,
);
