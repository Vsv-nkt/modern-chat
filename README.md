# Modern Chat

Мобільний месенджер на **React Native (Expo)** з **Real-Time** синхронізацією, **хмарним бекендом Convex**, **авторизацією через Google** та **багатим мультимедійним функціоналом** (фото, голосові, відеокружечки).

## 🚀 Функціонал

### 🔐 Авторизація

- Реєстрація та вхід через **Email + Password** (Convex Auth).
- **Вхід через Google OAuth 2.0** (один клік).
- Автоматична персоналізація з Google: **ім'я, email, аватарка**.
- Збереження сесії у **SecureStore**.
- Deep Linking після OAuth.

### 💬 Чат-кімнати

- Створення, перегляд, видалення кімнат.
- **Свайп вліво** на карточці кімнати — видалення.
- Реактивний список через `useQuery`.

### 📨 Повідомлення

- **Real-Time** синхронізація через Convex WebSocket.
- Текстові повідомлення.
- **Редагування** з меткою `(ред.)`.
- **Видалення** з підтвердженням.
- **Відповіді (Reply)** з цитатою — свайп вправо або довге натискання.
- **Реакції емодзі** 👍❤️🔥😂😮😢 з підсвічуванням «своєї».
- **Cursor-based пагінація** (порції по 25 повідомлень).
- **Inverted FlatList** — нові повідомлення внизу.

### 📷 Медіа

- **Фото** через Convex Storage + `expo-image-picker`.
- Повноекранний перегляд фото.
- **Голосові повідомлення** через `expo-audio` + плеєр.
- **Відеокружечки** (Telegram-style) через `expo-camera` + `expo-video`.
  - Круглий плеєр з SVG-прогресом.
  - Працює на мобільному (expo-camera) та web (MediaRecorder).

### 👤 Профілі

- Свій профіль: аватар, ім'я, `@username`, bio, статистика.
- Редагування профілю через `EditProfileModal`.
- Завантаження аватарки в Convex Storage.
- Публічний профіль співрозмовника `app/user/[id].tsx`.

### 🔔 Push-сповіщення

- Збереження `ExponentPushToken` у Convex.
- Push при нових повідомленнях, відповідях, реакціях.
- Deep Linking у чат при кліку на сповіщення.
- Обробка Foreground / Background / Cold Start.

### 🎨 Інтерфейс

- **Tailwind CSS (NativeWind v4)** — сучасний темний дизайн.
- **Індикатор набору тексту** («... друкує») з анімацією.
- Кастомні модалки для дій з повідомленнями.

---

## 🛠 Стек технологій

| Технологія                       | Призначення                        |
| -------------------------------- | ---------------------------------- |
| **React Native + Expo SDK 57**   | Фреймворк                          |
| **TypeScript**                   | Типізація                          |
| **Expo Router**                  | Файловий роутинг                   |
| **NativeWind v4**                | Tailwind CSS для RN                |
| **Convex**                       | Backend + Real-Time DB             |
| **Convex Auth**                  | Авторизація (Email + Google OAuth) |
| **Convex Storage**               | Файли (фото, аудіо, відео)         |
| **@auth/core**                   | OAuth провайдери                   |
| **expo-audio**                   | Голосові повідомлення              |
| **expo-camera**                  | Відеокружечки                      |
| **expo-video**                   | Відтворення відео                  |
| **expo-web-browser**             | OAuth-сесія                        |
| **expo-linking**                 | Deep Linking                       |
| **expo-notifications**           | Push-сповіщення                    |
| **expo-secure-store**            | Безпечне зберігання токенів        |
| **react-native-gesture-handler** | Жести (свайпи)                     |
| **react-native-reanimated**      | Анімації                           |
| **react-native-svg**             | Круговий прогрес                   |
| **@expo/vector-icons**           | Іконки (Ionicons)                  |

---

## 📁 Структура проєкту

```
modern-chat/
├── app/
│   ├── (auth)/
│   │   ├── _layout.tsx
│   │   └── login.tsx           # Екран входу (Email + Google)
│   ├── (tabs)/                 # 3 вкладки
│   │   ├── _layout.tsx
│   │   ├── index.tsx           # Список кімнат
│   │   ├── stats.tsx           # Статистика
│   │   └── settings.tsx        # Налаштування
│   ├── chat/
│   │   └── [id].tsx            # Екран чату
│   ├── settings/
│   │   └── [id].tsx            # Налаштування кімнати
│   ├── user/
│   │   └── [id].tsx            # Профіль учасника
│   ├── _layout.tsx             # ConvexAuthProvider + ThemeProvider
│   ├── index.tsx               # Редирект
│   ├── new-room.tsx            # Створення кімнати
│   └── profile.tsx             # Свій профіль
├── components/
│   ├── Header.tsx
│   ├── TodoForm.tsx
│   ├── TodoItem.tsx
│   ├── TodoList.tsx
│   ├── InitialLayout.tsx
│   ├── EditProfileModal.tsx
│   ├── ImageViewerModal.tsx
│   ├── MessageActionsModal.tsx
│   ├── ReactionPickerModal.tsx
│   ├── ReactionBadges.tsx
│   ├── ReplyPreviewBar.tsx
│   ├── SwipeableMessageItem.tsx
│   ├── SwipeableRoomItem.tsx
│   ├── TypingDots.tsx
│   ├── VideoNotePlayer.tsx
│   ├── VideoNoteRecorder.tsx
│   ├── VideoNoteRecorder.web.tsx
│   ├── VoiceMessagePlayer.tsx
│   └── ConfirmModal.tsx
├── context/
│   └── ThemeContext.tsx
├── convex/                     # 🚀 Backend
│   ├── _generated/
│   ├── auth.config.ts
│   ├── auth.ts
│   ├── http.ts
│   ├── messages.ts
│   ├── pushNotifications.ts
│   ├── reactions.ts
│   ├── rooms.ts
│   ├── schema.ts
│   ├── tsconfig.json
│   ├── typing.ts
│   └── users.ts
├── hooks/
│   └── usePushNotifications.ts
├── constants/
│   └── theme.ts
├── app.config.ts
├── eas.json
├── .env.local                  # Секрети (не комітиться)
└── package.json
```

---

## 🚀 Запуск

### 1. Клонувати репозиторій

```bash
git clone https://github.com/Vsv-nkt/modern-chat.git
cd modern-chat
```

### 2. Встановити залежності

```bash
npm install
```

### 3. Налаштувати Convex

```bash
npx convex dev
```

При першому запуску — **авторизуйся** та **створи проєкт** `modern-chat`.

### 4. Перевірити `.env.local`

Файл повинен містити:

```
EXPO_PUBLIC_CONVEX_URL=https://your-project.convex.cloud
EXPO_PUBLIC_CONVEX_SITE_URL=https://your-project.convex.site
CONVEX_DEPLOYMENT=dev:your-deployment
```

### 5. Запустити Expo

```bash
npx expo start
```

Натиснути:

- **`w`** — відкрити в браузері.
- **`a`** — відкрити на Android.
- **`i`** — відкрити на iOS.
- **Сканувати QR** — відкрити у **Expo Go** на телефоні.

---
