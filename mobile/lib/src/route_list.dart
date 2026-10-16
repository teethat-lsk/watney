// The meter reader's list of customers: which ones, and in what order.
// Pure Dart, unit-tested in test/route_list_test.dart.

import 'customer.dart';

/// The customers to show the reader, in walking order: by route, then หมู่,
/// then house number.
///
/// Without a [query], these are the customers whose meters they read: active
/// ones and those with their water cut. With one, every customer whose name,
/// house number or any meter number contains it (ignoring case and the spaces
/// around it), whatever their status: a cancelled customer may still owe money.
List<Customer> routeList(Iterable<Customer> customers, {String query = ''}) {
  final text = query.trim().toLowerCase();
  final shown = customers
      .where(
        (customer) => text.isEmpty
            ? customer.status == CustomerStatus.active ||
                  customer.status == CustomerStatus.waterCut
            : _matches(customer, text),
      )
      .toList();
  shown.sort(
    (a, b) => _firstNonZero([
      naturalCompare(a.routeName, b.routeName),
      a.moo.compareTo(b.moo),
      naturalCompare(a.houseNo, b.houseNo),
    ]),
  );
  return shown;
}

bool _matches(Customer customer, String text) =>
    customer.name.toLowerCase().contains(text) ||
    customer.houseNo.toLowerCase().contains(text) ||
    customer.meters.any((meter) => meter.number.toLowerCase().contains(text));

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
