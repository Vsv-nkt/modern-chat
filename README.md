## 🆕 ДЗ 14: Push-сповіщення

### Реалізовано

- `convex/pushNotifications.ts` — internalAction для Expo Push Service.
- `pushToken` у таблиці `users`.
- `savePushToken` мутація.
- Push при нових повідомленнях, відповідях (Reply) та реакціях.
- `hooks/usePushNotifications.ts` — реєстрація токена + Deep Linking.
- Обробка Foreground / Background / Cold Start.
- Перехід у `/(app)/chat/[id]` при кліку на сповіщення.
- Відключення push на web (працює тільки на нативних платформах).
- `ConfirmModal` — кастомна модалка підтвердження (працює на web).

### Тестування

- Код повністю реалізовано та інтегровано.
- На web push не запускається (обмеження платформи).
- Для повної доставки на Android потрібен Firebase FCM v1 key + Standalone APK.
