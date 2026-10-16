// The meter reader's list of customers: which ones, in what order, and search.
// Pure Dart, unit-tested in test/route_list_test.dart.

import 'customer.dart';

/// The customers whose meters the reader reads (active, or with their water
/// cut), in walking order: by route, then หมู่, then house number.
List<Customer> routeList(Iterable<Customer> customers) {
  final read = customers
      .where(
        (customer) =>
            customer.status == CustomerStatus.active ||
            customer.status == CustomerStatus.waterCut,
      )
      .toList();
  read.sort(
    (a, b) => _firstNonZero([
      naturalCompare(a.routeName, b.routeName),
      a.moo.compareTo(b.moo),
      naturalCompare(a.houseNo, b.houseNo),
    ]),
  );
  return read;
}

/// The customers whose name, house number or any meter number contains
/// [query], ignoring case and surrounding spaces. An empty query matches all.
List<Customer> search(List<Customer> customers, String query) {
  final text = query.trim().toLowerCase();
  if (text.isEmpty) return customers;
  return customers
      .where(
        (customer) =>
            customer.name.toLowerCase().contains(text) ||
            customer.houseNo.toLowerCase().contains(text) ||
            customer.meters.any(
              (meter) => meter.number.toLowerCase().contains(text),
            ),
      )
      .toList();
}

final _chunks = RegExp(r'\d+|\D+');

/// Compares strings with the runs of digits in them compared as numbers, so
/// "9" comes before "10", and "12/3" before "12/10".
int naturalCompare(String a, String b) {
  final left = _chunks.allMatches(a).map((match) => match[0]!).toList();
  final right = _chunks.allMatches(b).map((match) => match[0]!).toList();
  for (var i = 0; i < left.length && i < right.length; i++) {
    final x = int.tryParse(left[i]);
    final y = int.tryParse(right[i]);
    final order = x != null && y != null
        ? x.compareTo(y)
        : left[i].compareTo(right[i]);
    if (order != 0) return order;
  }
  return left.length.compareTo(right.length);
}

int _firstNonZero(List<int> orders) =>
    orders.firstWhere((order) => order != 0, orElse: () => 0);
