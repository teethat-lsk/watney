import 'package:flutter/material.dart';

import 'customer.dart';

const _statusLabels = {
  CustomerStatus.pending: 'รอติดตั้งมาตร',
  CustomerStatus.active: 'ปกติ',
  CustomerStatus.waterCut: 'ตัดน้ำ',
  CustomerStatus.cancelled: 'ยกเลิก',
};

const _sizeLabels = {
  '1/2': '½ นิ้ว',
  '3/4': '¾ นิ้ว',
  '1': '1 นิ้ว',
  '1-1/2': '1½ นิ้ว',
  '2': '2 นิ้ว',
};

/// One customer's details and meters.
class CustomerScreen extends StatelessWidget {
  const CustomerScreen({super.key, required this.customer});

  final Customer customer;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      appBar: AppBar(title: Text(customer.name)),
      // A short page: build it all at once rather than lazily.
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(vertical: 8),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            _Detail('ชื่อ', customer.name),
            _Detail('บ้านเลขที่', customer.houseNo),
            _Detail('หมู่ที่', '${customer.moo}'),
            _Detail('เส้นทาง', customer.routeName),
            _Detail('โทรศัพท์', customer.phone.isEmpty ? '-' : customer.phone),
            _Detail('สถานะ', _statusLabels[customer.status]!),
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
              child: Text('มาตรน้ำ', style: theme.textTheme.titleMedium),
            ),
            if (customer.meters.isEmpty)
              const Padding(
                padding: EdgeInsets.symmetric(horizontal: 16),
                child: Text('ยังไม่มีมาตร'),
              ),
            for (final meter in customer.meters)
              Card(
                margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                child: Column(
                  children: [
                    _Detail('หมายเลขมาตร', meter.number),
                    _Detail('ขนาด', _sizeLabels[meter.size] ?? meter.size),
                    _Detail('วันที่ติดตั้ง', thaiDate(meter.installedOn)),
                    _Detail('เลขมาตรเริ่มต้น', '${meter.startReading}'),
                    _Detail(
                      'สถานะ',
                      meter.status == MeterStatus.active ? 'ใช้งาน' : 'ถอดแล้ว',
                    ),
                  ],
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _Detail extends StatelessWidget {
  const _Detail(this.label, this.value);

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return ListTile(
      dense: true,
      title: Text(label),
      trailing: Text(value, style: Theme.of(context).textTheme.bodyLarge),
    );
  }
}

/// A YYYY-MM-DD date as Thai readers expect it: day/month/Buddhist-era year.
String thaiDate(String date) {
  final [year, month, day] = date.split('-').map(int.parse).toList();
  return '$day/$month/${year + 543}';
}
