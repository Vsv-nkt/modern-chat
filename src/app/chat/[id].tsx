// src/app/chat/[id].tsx
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery } from "convex/react";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Image,
    KeyboardAvoidingView,
    Platform,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { COLORS } from "../../constants/theme";

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const flatListRef = useRef<FlatList>(null);

  const roomId = id as Id<"chatRooms">;
  const room = useQuery(api.rooms.getRoom, { roomId });
  const messages = useQuery(api.messages.listMessages, { chatRoomId: roomId });
  const currentUser = useQuery(api.users.currentUser);
  const sendMessage = useMutation(api.messages.sendMessage);

  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (messages && messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages?.length]);

  const handleSend = async () => {
    if (!inputText.trim() || isSending) return;

    const text = inputText;
    setInputText("");
    setIsSending(true);

    try {
      await sendMessage({
        chatRoomId: roomId,
        content: text,
      });
    } catch (error) {
      console.error("Error sending message", error);
      setInputText(text);
    } finally {
      setIsSending(false);
    }
  };

  const formatTime = (timestamp?: number) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  if (!room) {
    return (
      <View className="flex-1 bg-surface justify-center items-center">
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      className="flex-1 bg-surface"
    >
      <Stack.Screen
        options={{
          title: room.title,
          headerRight: () => (
            <TouchableOpacity
              onPress={() => router.push(`/settings/${roomId}` as any)}
              className="p-1"
            >
              <Ionicons
                name="information-circle-outline"
                size={24}
                color={COLORS.white}
              />
            </TouchableOpacity>
          ),
        }}
      />

      {messages === undefined ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item._id}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingVertical: 16,
            gap: 12,
          }}
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center py-20">
              <Ionicons
                name="chatbubble-ellipses-outline"
                size={40}
                color={COLORS.textMuted}
              />
              <Text className="text-textMuted text-sm mt-2 text-center">
                Повідомлень ще немає. Напишіть першим!
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const isMe = currentUser && item.senderId === currentUser._id;

            return (
              <View
                className={`flex-row items-end gap-2 ${
                  isMe ? "justify-end" : "justify-start"
                }`}
              >
                {!isMe && (
                  <View className="w-7 h-7 rounded-full bg-secondary border border-surfaceLight items-center justify-center mb-1">
                    {item.senderPhoto ? (
                      <Image
                        source={{ uri: item.senderPhoto }}
                        className="w-full h-full rounded-full"
                      />
                    ) : (
                      <Text className="text-textMuted text-xs font-bold">
                        {item.senderName[0]?.toUpperCase() ?? "U"}
                      </Text>
                    )}
                  </View>
                )}

                <View
                  className={`max-w-[78%] px-4 py-2.5 rounded-2xl ${
                    isMe
                      ? "bg-primary rounded-br-none"
                      : "bg-secondary border border-surfaceLight rounded-bl-none"
                  }`}
                >
                  {!isMe && (
                    <Text className="text-primary text-xs font-bold mb-1">
                      {item.senderName}
                    </Text>
                  )}
                  <Text className="text-white text-base leading-5">
                    {item.content}
                  </Text>
                  <Text
                    className={`text-[10px] text-right mt-1 ${
                      isMe ? "text-white/70" : "text-textMuted"
                    }`}
                  >
                    {formatTime(item._creationTime)}
                  </Text>
                </View>
              </View>
            );
          }}
        />
      )}

      <View className="px-4 py-3 bg-surface border-t border-surfaceLight flex-row items-end gap-2">
        <TextInput
          className="flex-1 bg-secondary border border-surfaceLight rounded-2xl px-4 py-2.5 text-white text-base max-h-28 min-h-[42px]"
          placeholder="Повідомлення..."
          placeholderTextColor={COLORS.textMuted}
          value={inputText}
          onChangeText={setInputText}
          multiline
        />

        <TouchableOpacity
          onPress={handleSend}
          disabled={!inputText.trim() || isSending}
          className={`w-11 h-11 rounded-2xl items-center justify-center ${
            inputText.trim() && !isSending ? "bg-primary" : "bg-secondary"
          }`}
          activeOpacity={0.8}
        >
          {isSending ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Ionicons
              name="send"
              size={18}
              color={inputText.trim() ? "#FFFFFF" : COLORS.textMuted}
            />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
