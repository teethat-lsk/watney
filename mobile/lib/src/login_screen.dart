import 'package:flutter/material.dart';

import 'auth.dart';

const _failureMessages = {
  LoginFailure.invalid: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง',
  LoginFailure.inactive: 'บัญชีนี้ถูกปิดใช้งาน ติดต่อผู้ดูแลระบบ',
  LoginFailure.notReader: 'แอปนี้สำหรับเจ้าหน้าที่จดมาตรเท่านั้น',
  LoginFailure.unreachable:
      'ติดต่อเซิร์ฟเวอร์ไม่ได้ ตรวจสอบการเชื่อมต่อแล้วลองใหม่',
};

class LoginScreen extends StatefulWidget {
  const LoginScreen({
    super.key,
    required this.auth,
    required this.backendUrl,
    required this.onLogin,
  });

  final Auth auth;
  final String backendUrl;
  final ValueChanged<MeterReader> onLogin;

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _email = TextEditingController();
  final _password = TextEditingController();
  String? _error;
  var _pending = false;

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() {
      _pending = true;
      _error = null;
    });
    try {
      widget.onLogin(
        await widget.auth.login(_email.text.trim(), _password.text),
      );
    } on LoginError catch (error) {
      setState(() => _error = _failureMessages[error.reason]);
    } catch (_) {
      setState(() => _error = 'เข้าสู่ระบบไม่สำเร็จ ลองใหม่อีกครั้ง');
    } finally {
      if (mounted) setState(() => _pending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      appBar: AppBar(title: const Text('Watney')),
      body: ListView(
        padding: const EdgeInsets.all(24),
        children: [
          Text(
            'ระบบจัดเก็บค่าน้ำประปาหมู่บ้าน',
            style: theme.textTheme.titleMedium,
          ),
          const SizedBox(height: 24),
          TextField(
            controller: _email,
            decoration: const InputDecoration(labelText: 'อีเมล'),
            keyboardType: TextInputType.emailAddress,
            autofillHints: const [AutofillHints.username],
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _password,
            decoration: const InputDecoration(labelText: 'รหัสผ่าน'),
            obscureText: true,
            autofillHints: const [AutofillHints.password],
            onSubmitted: (_) => _submit(),
          ),
          if (_error case final error?) ...[
            const SizedBox(height: 12),
            Text(error, style: TextStyle(color: theme.colorScheme.error)),
          ],
          const SizedBox(height: 24),
          FilledButton(
            onPressed: _pending ? null : _submit,
            child: const Text('เข้าสู่ระบบ'),
          ),
          const SizedBox(height: 24),
          Text(
            'เซิร์ฟเวอร์: ${widget.backendUrl}',
            style: theme.textTheme.bodySmall,
          ),
        ],
      ),
    );
  }
}
