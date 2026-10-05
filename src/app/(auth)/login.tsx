// src/app/(auth)/login.tsx
import { useAuthActions } from "@convex-dev/auth/react";
import { Ionicons } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { COLORS } from "../../constants/theme";

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const { signIn } = useAuthActions();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const handleAuth = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Помилка", "Заповніть усі поля.");
      return;
    }

    if (isSignUp && !name.trim()) {
      Alert.alert("Помилка", "Вкажіть ім'я.");
      return;
    }

    setIsLoading(true);
    try {
      if (isSignUp) {
        await signIn("password", {
          email: email.trim(),
          password: password.trim(),
          name: name.trim(),
          flow: "signUp",
        });
        Alert.alert("Успіх", "Акаунт створено!");
      } else {
        await signIn("password", {
          email: email.trim(),
          password: password.trim(),
          flow: "signIn",
        });
      }
    } catch (err) {
      console.error("Auth Error", err);
      Alert.alert(
        "Помилка",
        isSignUp
          ? "Не вдалося зареєструватися."
          : "Неправильний email або пароль.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setIsGoogleLoading(true);

      const redirectTo = Linking.createURL("");
      console.log("Redirect To:", redirectTo);

      const { redirect } = await signIn("google", { redirectTo });
      if (!redirect) return;

      const result = await WebBrowser.openAuthSessionAsync(
        redirect.toString(),
        redirectTo,
      );

      if (result.type === "success" && result.url) {
        const url = new URL(result.url);
        const code = url.searchParams.get("code");
        if (code) {
          await signIn("google", { code });
        }
      }
    } catch (error) {
      console.error("Google Auth Error:", error);
      Alert.alert("Помилка входу", "Не вдалося авторизуватися через Google.");
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-surface"
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="items-center mt-20">
          <View className="w-20 h-20 rounded-3xl bg-primary/20 items-center justify-center border border-primary/30">
            <Ionicons name="chatbubbles" size={38} color={COLORS.primary} />
          </View>
          <Text className="text-3xl font-bold text-white mt-5">
            Modern Chat
          </Text>
          <Text className="text-sm text-textMuted mt-2 text-center px-6">
            {isSignUp ? "Створіть акаунт" : "Увійдіть, щоб продовжити"}
          </Text>
        </View>

        <View className="px-6 mt-12 w-full items-center gap-4">
          {isSignUp && (
            <View className="flex-row items-center bg-secondary border border-surfaceLight rounded-2xl px-4 w-full max-w-sm">
              <Ionicons
                name="person-outline"
                size={20}
                color={COLORS.textMuted}
                style={{ marginRight: 12 }}
              />
              <TextInput
                className="flex-1 py-3.5 text-base text-white"
                placeholder="Ваше ім'я"
                placeholderTextColor={COLORS.textMuted}
                value={name}
                onChangeText={setName}
              />
            </View>
          )}

          <View className="flex-row items-center bg-secondary border border-surfaceLight rounded-2xl px-4 w-full max-w-sm">
            <Ionicons
              name="mail-outline"
              size={20}
              color={COLORS.textMuted}
              style={{ marginRight: 12 }}
            />
            <TextInput
              className="flex-1 py-3.5 text-base text-white"
              placeholder="Email"
              placeholderTextColor={COLORS.textMuted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View className="flex-row items-center bg-secondary border border-surfaceLight rounded-2xl px-4 w-full max-w-sm">
            <Ionicons
              name="lock-closed-outline"
              size={20}
              color={COLORS.textMuted}
              style={{ marginRight: 12 }}
            />
            <TextInput
              className="flex-1 py-3.5 text-base text-white"
              placeholder="Пароль"
              placeholderTextColor={COLORS.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
            />
          </View>

          <TouchableOpacity
            className={`flex-row items-center justify-center bg-primary rounded-2xl py-4 w-full max-w-sm ${
              isLoading ? "opacity-60" : ""
            }`}
            onPress={handleAuth}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text className="text-white text-base font-bold">
                {isSignUp ? "Зареєструватися" : "Увійти"}
              </Text>
            )}
          </TouchableOpacity>

          {/* Разделитель */}
          <View className="flex-row items-center w-full max-w-sm my-2">
            <View className="flex-1 h-[1px] bg-surfaceLight" />
            <Text className="mx-3 text-textMuted text-xs uppercase">або</Text>
            <View className="flex-1 h-[1px] bg-surfaceLight" />
          </View>

          {/* Google кнопка */}
          <TouchableOpacity
            className="flex-row items-center justify-center bg-secondary border border-surfaceLight rounded-2xl py-4 w-full max-w-sm"
            onPress={handleGoogleSignIn}
            disabled={isGoogleLoading || isLoading}
          >
            {isGoogleLoading ? (
              <ActivityIndicator color={COLORS.primary} size="small" />
            ) : (
              <>
                <Ionicons
                  name="logo-google"
                  size={20}
                  color="#EA4335"
                  style={{ marginRight: 10 }}
                />
                <Text className="text-white text-base font-semibold">
                  Продовжити з Google
                </Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setIsSignUp(!isSignUp)}
            className="mt-3 py-2"
          >
            <Text className="text-primary text-sm font-medium">
              {isSignUp
                ? "Вже є акаунт? Увійти"
                : "Немає акаунту? Створити новий"}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
