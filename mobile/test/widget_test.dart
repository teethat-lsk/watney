import 'package:flutter_test/flutter_test.dart';

import 'package:watney/main.dart';

void main() {
  testWidgets('shows the home screen', (tester) async {
    await tester.pumpWidget(const WatneyApp());

    expect(find.text('Watney'), findsOneWidget);
  });
}
