// Customers and meters as the field app shows them. Pure Dart: no Flutter or
// backend imports, so the logic built on them unit-tests in isolation.

/// `pending` customers wait for a meter; `cancelled` ones are no longer served.
enum CustomerStatus { pending, active, waterCut, cancelled }

enum MeterStatus { active, removed }

/// A customer (ผู้ใช้น้ำ) on one of the meter reader's routes.
class Customer {
  const Customer({
    required this.id,
    required this.houseNo,
    required this.moo,
    required this.name,
    required this.phone,
    required this.routeName,
    required this.status,
    required this.meters,
  });

  final String id;
  final String houseNo;
  final int moo;
  final String name;
  final String phone;
  final String routeName;
  final CustomerStatus status;

  /// Every meter linked to the customer, removed ones too.
  final List<Meter> meters;

  Iterable<Meter> get activeMeters =>
      meters.where((meter) => meter.status == MeterStatus.active);
}

class Meter {
  const Meter({
    required this.id,
    required this.number,
    required this.size,
    required this.installedOn,
    required this.startReading,
    required this.status,
  });

  final String id;
  final String number;

  /// Pipe size in inches, as the backend stores it: `1/2`, `3/4`, `1`, `1-1/2`, `2`.
  final String size;

  /// YYYY-MM-DD
  final String installedOn;

  /// The reading the meter's first billed reading is measured from.
  final num startReading;
  final MeterStatus status;
}
