import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:pocketbase/pocketbase.dart';
import 'package:watney/src/customer.dart';

/// A customer with sensible defaults for what a test doesn't care about.
Customer customer(
  String name, {
  String? id,
  String route = 'สาย 1',
  int moo = 1,
  String houseNo = '1',
  String phone = '',
  CustomerStatus status = CustomerStatus.active,
  List<Meter> meters = const [],
}) {
  return Customer(
    id: id ?? name,
    houseNo: houseNo,
    moo: moo,
    name: name,
    phone: phone,
    routeName: route,
    status: status,
    meters: meters,
  );
}

Meter meter(String number, {MeterStatus status = MeterStatus.active}) => Meter(
  id: number,
  number: number,
  size: '3/4',
  installedOn: '2026-01-15',
  startReading: 12.5,
  status: status,
);

/// A PocketBase client whose requests get [answer]'s status and JSON body.
PocketBase fakeBackend((int, Object) Function(http.Request request) answer) {
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

/// A PocketBase client whose requests never reach the backend.
PocketBase unreachableBackend() => PocketBase(
  'http://pb.test',
  httpClientFactory: () =>
      MockClient((_) async => throw http.ClientException('no route to host')),
);
