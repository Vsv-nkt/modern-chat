// src/app/profile.tsx
import { useAuthActions } from "@convex-dev/auth/react";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "convex/react";
import { useRouter } from "expo-router";
import {
    ActivityIndicator,
    Alert,
    Image,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { api } from "../../convex/_generated/api";
import { COLORS } from "../constants/theme";

export default function ProfileScreen() {
  const router = useRouter();
  const user = useQuery(api.users.currentUser);
  const { signOut } = useAuthActions();

  const handleSignOut = () => {
    Alert.alert("Вихід з акаунта", "Ви дійсно бажаєте вийти з додатку?", [
      { text: "Скасувати", style: "cancel" },
      {
        text: "Вийти",
        style: "destructive",
        onPress: async () => {
          await signOut();
          router.replace("/(auth)/login" as any);
        },
      },
    ]);
  };

  if (user === undefined) {
    return (
      <View className="flex-1 bg-surface justify-center items-center">
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-surface p-6 items-center">
      <View className="w-24 h-24 rounded-full bg-secondary border-2 border-primary/40 items-center justify-center mt-6 mb-4 overflow-hidden">
        {user?.image ? (
          <Image
            source={{ uri: user.image }}
            className="w-full h-full"
            resizeMode="cover"
          />
        ) : (
          <Ionicons name="person" size={44} color={COLORS.primary} />
        )}
      </View>

      <Text className="text-white text-2xl font-bold">
        {user?.name ?? "Користувач"}
      </Text>
      <Text className="text-textMuted text-sm mt-1">{user?.email}</Text>

      <TouchableOpacity
        onPress={handleSignOut}
        className="w-full bg-danger/20 border border-danger/30 rounded-2xl py-4 mt-12 flex-row items-center justify-center active:bg-danger/30"
        activeOpacity={0.8}
      >
        <Ionicons
          name="log-out-outline"
          size={20}
          color={COLORS.danger}
          style={{ marginRight: 8 }}
        />
        <Text className="text-danger text-base font-bold">Вийти з акаунту</Text>
      </TouchableOpacity>
    </View>
  );
}
