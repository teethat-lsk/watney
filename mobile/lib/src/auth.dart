import 'dart:convert';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:pocketbase/pocketbase.dart';

/// The logged-in meter reader.
class MeterReader {
  const MeterReader({
    required this.id,
    required this.email,
    required this.name,
  });

  final String id;
  final String email;
  final String name;
}

/// Why a login failed.
enum LoginFailure {
  /// Wrong email or password.
  invalid,

  /// The account was deactivated.
  inactive,

  /// The account isn't a meter reader's: the app's screens are for meter readers only.
  notReader,

  /// The backend can't be reached.
  unreachable,
}

class LoginError implements Exception {
  const LoginError(this.reason);

  final LoginFailure reason;

  @override
  String toString() => 'LoginError(${reason.name})';
}

/// Meter reader login. The app depends on this, so tests can swap in a fake.
abstract interface class Auth {
  /// The reader whose session was stored by an earlier login, checked with the
  /// backend (on start, and again before a reload); null when there's none or
  /// the backend no longer accepts it. If the backend can't be reached, the
  /// stored session is kept.
  Future<MeterReader?> restore();

  /// Throws [LoginError].
  Future<MeterReader> login(String email, String password);

  Future<void> logout();
}

/// Where the session is kept between app starts.
abstract interface class SessionStore {
  Future<String?> read();
  Future<void> write(String session);
  Future<void> clear();
}

/// Keeps the session in Android's encrypted storage.
class SecureSessionStore implements SessionStore {
  static const _key = 'session';
  final _storage = const FlutterSecureStorage();

  @override
  Future<String?> read() => _storage.read(key: _key);

  @override
  Future<void> write(String session) =>
      _storage.write(key: _key, value: session);

  @override
  Future<void> clear() => _storage.delete(key: _key);
}

class PocketBaseAuth implements Auth {
  PocketBaseAuth(this._pb, this._store);

  final PocketBase _pb;
  final SessionStore _store;

  @override
  Future<MeterReader?> restore() async {
    if (!_loadStoredSession(await _store.read())) {
      await logout();
      return null;
    }
    try {
      await _pb.collection('users').authRefresh();
    } on ClientException catch (error) {
      if (_isUnreachable(error)) return _toReader(_pb.authStore.record!);
      // 401: the token is no longer valid; 403: the account was deactivated.
      await logout();
      return null;
    }
    return _keepIfReader();
  }

  @override
  Future<MeterReader> login(String email, String password) async {
    try {
      await _pb.collection('users').authWithPassword(email, password);
    } on ClientException catch (error) {
      throw LoginError(switch (error.statusCode) {
        400 => LoginFailure.invalid,
        // The auth rule (`active = true`) rejects deactivated accounts.
        403 => LoginFailure.inactive,
        _ when _isUnreachable(error) => LoginFailure.unreachable,
        _ => throw error,
      });
    }
    final reader = await _keepIfReader();
    if (reader == null) throw const LoginError(LoginFailure.notReader);
    return reader;
  }

  @override
  Future<void> logout() async {
    _pb.authStore.clear();
    await _store.clear();
  }

  /// Stores the session if it's a meter reader's, or logs out and returns null.
  Future<MeterReader?> _keepIfReader() async {
    final record = _pb.authStore.record!;
    if (record.getStringValue('role') != _readerRole) {
      await logout();
      return null;
    }
    await _store.write(
      jsonEncode({'token': _pb.authStore.token, 'record': record.toJson()}),
    );
    return _toReader(record);
  }

  /// Loads a session saved by [_accept]; false when there's none or its token expired.
  bool _loadStoredSession(String? saved) {
    if (saved == null) return false;
    try {
      final session = jsonDecode(saved) as Map<String, dynamic>;
      _pb.authStore.save(
        session['token'] as String,
        RecordModel.fromJson(session['record'] as Map<String, dynamic>),
      );
    } on FormatException {
      return false;
    } on TypeError {
      return false;
    }
    return _pb.authStore.isValid;
  }

  MeterReader _toReader(RecordModel record) => MeterReader(
    id: record.id,
    email: record.getStringValue('email'),
    name: record.getStringValue('name'),
  );
}

const _readerRole = 'meter_reader';

/// No response at all (0), or a proxy's 5xx while PocketBase is down.
bool _isUnreachable(ClientException error) =>
    error.statusCode == 0 || error.statusCode >= 500;
