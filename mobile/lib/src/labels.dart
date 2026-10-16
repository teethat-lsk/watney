import 'customer.dart';

const customerStatusLabels = {
  CustomerStatus.pending: 'รอติดตั้งมาตร',
  CustomerStatus.active: 'ปกติ',
  CustomerStatus.waterCut: 'ตัดน้ำ',
  CustomerStatus.cancelled: 'ยกเลิก',
};

const meterStatusLabels = {
  MeterStatus.active: 'ใช้งาน',
  MeterStatus.removed: 'ถอดแล้ว',
};

/// Pipe sizes as the backend stores them, in inches.
const meterSizeLabels = {
  '1/2': '½ นิ้ว',
  '3/4': '¾ นิ้ว',
  '1': '1 นิ้ว',
  '1-1/2': '1½ นิ้ว',
  '2': '2 นิ้ว',
};

/// A YYYY-MM-DD date as Thai readers expect it: day/month/Buddhist-era year.
String thaiDate(String date) {
  final [year, month, day] = date.split('-').map(int.parse).toList();
  return '$day/$month/${year + 543}';
}
