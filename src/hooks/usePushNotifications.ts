// src/hooks/usePushNotifications.ts
import { useConvexAuth } from "@convex-dev/auth/react";
import { useMutation } from "convex/react";
import Constants from "expo-constants";
import { useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import { api } from "../../convex/_generated/api";

// На web expo-notifications не работает — используем заглушки
let Notifications: any = null;

if (Platform.OS !== "web") {
  Notifications = require("expo-notifications");

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

export function usePushNotifications() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const savePushToken = useMutation(api.users.savePushToken);
  const router = useRouter();

  const notificationListener = useRef<any>(null);
  const responseListener = useRef<any>(null);

  const handleNotificationNavigation = (data: any) => {
    if (!data) return;

    console.log("🧭 Навігація за пуш-сповіщенням:", data);

    const targetRoomId = data.roomId || data.chatRoomId;

    if (targetRoomId) {
      router.push(`/(app)/chat/${targetRoomId}` as any);
    } else {
      router.push("/(app)" as any);
    }
  };

  useEffect(() => {
    // На web — ничего не делаем
    if (Platform.OS === "web" || !Notifications) {
      return;
    }

    if (isLoading || !isAuthenticated) return;

    registerForPushNotificationsAsync().then((token) => {
      if (token) {
        console.log("📲 Збереження Expo Push Token:", token);
        savePushToken({ pushToken: token }).catch((err) => {
          console.error("❌ Помилка збереження pushToken:", err);
        });
      }
    });

    notificationListener.current =
      Notifications.addNotificationReceivedListener((notification: any) => {
        console.log(
          "🔔 Отримано сповіщення у Foreground:",
          notification.request.content,
        );
      });

    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response: any) => {
        const data = response.notification.request.content.data;
        handleNotificationNavigation(data);
      });

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, [isAuthenticated, isLoading]);
}

async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (Platform.OS === "web" || !Notifications) {
    return null;
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Повідомлення чату",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#2563EB",
      sound: "default",
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    console.warn("⚠️ Користувач відхилив сповіщення");
    return null;
  }

  try {
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;

    if (!projectId) {
      console.warn("⚠️ Project ID не знайдено");
    }

    const tokenData = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );

    return tokenData.data;
  } catch (error) {
    console.error("❌ Помилка отримання Expo Push Token:", error);
    return null;
  }
}
