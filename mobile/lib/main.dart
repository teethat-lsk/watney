import 'package:flutter/material.dart';

void main() {
  runApp(const WatneyApp());
}

class WatneyApp extends StatelessWidget {
  const WatneyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Watney',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.blue),
      ),
      home: const HomeScreen(),
    );
  }
}

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Watney')),
      body: const Center(child: Text('ระบบจัดเก็บค่าน้ำประปาหมู่บ้าน')),
    );
  }
}
