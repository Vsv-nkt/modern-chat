import { Stack } from "expo-router";
import { COLORS } from "../../constants/theme";

export default function AppLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: COLORS.surface },
        headerTintColor: COLORS.white,
        headerTitleStyle: { fontWeight: "bold" },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: COLORS.surface },
      }}
    >
      <Stack.Screen
        name="index"
        options={{ title: "Чат-кімнати", headerLargeTitle: true }}
      />
    </Stack>
  );
}
