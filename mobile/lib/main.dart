import 'package:flutter/material.dart';
import 'package:pocketbase/pocketbase.dart';

import 'src/auth.dart';
import 'src/customer_list_screen.dart';
import 'src/customers.dart';
import 'src/login_screen.dart';

/// The backend address, set per build: `--dart-define=PB_URL=http://…:8090`.
/// The default reaches a PocketBase on the development computer from the
/// Android emulator; a real phone needs the computer's LAN address (README).
const backendUrl = String.fromEnvironment(
  'PB_URL',
  defaultValue: 'http://10.0.2.2:8090',
);

void main() {
  final pb = PocketBase(backendUrl);
  runApp(
    WatneyApp(
      auth: PocketBaseAuth(pb, SecureSessionStore()),
      customers: PocketBaseCustomers(pb),
      backendUrl: backendUrl,
    ),
  );
}

class WatneyApp extends StatefulWidget {
  const WatneyApp({
    super.key,
    required this.auth,
    required this.customers,
    required this.backendUrl,
  });

  final Auth auth;
  final CustomerRepository customers;

  /// Shown on the login screen, to check the build points at the right backend.
  final String backendUrl;

  @override
  State<WatneyApp> createState() => _WatneyAppState();
}

class _WatneyAppState extends State<WatneyApp> {
  /// Null until the stored session has been checked.
  Future<MeterReader?>? _restoring;
  MeterReader? _reader;

  @override
  void initState() {
    super.initState();
    _restoring = widget.auth.restore().then((reader) {
      if (mounted) setState(() => _reader = reader);
      return reader;
    });
  }

  Future<void> _logout() async {
    await widget.auth.logout();
    setState(() => _reader = null);
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Watney',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.blue),
      ),
      home: FutureBuilder(
        future: _restoring,
        builder: (context, snapshot) {
          if (snapshot.connectionState != ConnectionState.done) {
            return const Scaffold(
              body: Center(child: CircularProgressIndicator()),
            );
          }
          final reader = _reader;
          if (reader == null) {
            return LoginScreen(
              auth: widget.auth,
              backendUrl: widget.backendUrl,
              onLogin: (reader) => setState(() => _reader = reader),
            );
          }
          return CustomerListScreen(
            reader: reader,
            repository: widget.customers,
            onLogout: _logout,
          );
        },
      ),
    );
  }
}
