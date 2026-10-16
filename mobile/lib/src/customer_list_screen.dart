import 'package:flutter/material.dart';

import 'auth.dart';
import 'customer.dart';
import 'customer_screen.dart';
import 'customers.dart';
import 'route_list.dart';

/// The customers on the reader's routes, in walking order, with search.
class CustomerListScreen extends StatefulWidget {
  const CustomerListScreen({
    super.key,
    required this.reader,
    required this.repository,
    required this.onLogout,
  });

  final MeterReader reader;
  final CustomerRepository repository;
  final VoidCallback onLogout;

  @override
  State<CustomerListScreen> createState() => _CustomerListScreenState();
}

class _CustomerListScreenState extends State<CustomerListScreen> {
  late Future<List<Customer>> _customers = _load();
  var _query = '';

  Future<List<Customer>> _load() async =>
      routeList(await widget.repository.routeCustomers());

  Future<void> _reload() {
    final reloading = _load();
    setState(() {
      _customers = reloading;
    });
    return reloading;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(
          widget.reader.name.isEmpty ? widget.reader.email : widget.reader.name,
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            tooltip: 'ออกจากระบบ',
            onPressed: widget.onLogout,
          ),
        ],
      ),
      body: FutureBuilder(
        future: _customers,
        builder: (context, snapshot) {
          if (snapshot.hasError) {
            return _LoadFailed(onRetry: _reload);
          }
          final customers = snapshot.data;
          if (customers == null) {
            return const Center(child: CircularProgressIndicator());
          }
          final shown = search(customers, _query);
          return Column(
            children: [
              Padding(
                padding: const EdgeInsets.all(12),
                child: TextField(
                  decoration: const InputDecoration(
                    prefixIcon: Icon(Icons.search),
                    hintText: 'ค้นหาชื่อ บ้านเลขที่ หรือหมายเลขมาตร',
                  ),
                  onChanged: (query) => setState(() => _query = query),
                ),
              ),
              Expanded(
                child: RefreshIndicator(
                  onRefresh: _reload,
                  child: shown.isEmpty
                      ? ListView(
                          children: [
                            Padding(
                              padding: const EdgeInsets.all(24),
                              child: Text(
                                customers.isEmpty
                                    ? 'ไม่มีผู้ใช้น้ำในเส้นทางของคุณ'
                                    : 'ไม่พบผู้ใช้น้ำที่ค้นหา',
                                textAlign: TextAlign.center,
                              ),
                            ),
                          ],
                        )
                      : ListView.builder(
                          itemCount: shown.length,
                          itemBuilder: (context, index) =>
                              _CustomerTile(customer: shown[index]),
                        ),
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}

class _CustomerTile extends StatelessWidget {
  const _CustomerTile({required this.customer});

  final Customer customer;

  @override
  Widget build(BuildContext context) {
    final meters = customer.activeMeters
        .map((meter) => meter.number)
        .join(', ');
    return ListTile(
      key: ValueKey(customer.id),
      title: Text(customer.name),
      subtitle: Text(
        [
          'บ้านเลขที่ ${customer.houseNo} หมู่ ${customer.moo}',
          customer.routeName,
          if (meters.isNotEmpty) 'มาตร $meters',
        ].join(' · '),
      ),
      trailing: customer.status == CustomerStatus.waterCut
          ? const Chip(label: Text('ตัดน้ำ'))
          : null,
      onTap: () => Navigator.of(context).push(
        MaterialPageRoute<void>(
          builder: (context) => CustomerScreen(customer: customer),
        ),
      ),
    );
  }
}

class _LoadFailed extends StatelessWidget {
  const _LoadFailed({required this.onRetry});

  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Text('โหลดรายชื่อผู้ใช้น้ำไม่สำเร็จ'),
          const SizedBox(height: 12),
          FilledButton(onPressed: onRetry, child: const Text('ลองใหม่')),
        ],
      ),
    );
  }
}
