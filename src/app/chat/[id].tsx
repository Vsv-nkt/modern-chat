// src/app/chat/[id].tsx
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery } from "convex/react";
import * as ImagePicker from "expo-image-picker";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { fetch } from "expo/fetch";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import { ImageViewerModal } from "../../components/ImageViewerModal";
import { TypingDots } from "../../components/TypingDots";
import { COLORS } from "../../constants/theme";

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const flatListRef = useRef<FlatList>(null);

  const chatRoomId = id as Id<"chatRooms">;
  const room = useQuery(api.rooms.getRoom, { roomId: chatRoomId });
  const messages = useQuery(api.messages.listMessages, { chatRoomId });
  const currentUser = useQuery(api.users.currentUser);
  const typingUsers = useQuery(api.typing.getTypingUsers, { chatRoomId });

  const sendMessage = useMutation(api.messages.sendMessage);
  const editMessage = useMutation(api.messages.editMessage);
  const deleteMessage = useMutation(api.messages.deleteMessage);
  const generateUploadUrl = useMutation(api.messages.generateUploadUrl);
  const sendMediaMessage = useMutation(api.messages.sendMediaMessage);
  const setTyping = useMutation(api.typing.setTyping);

  const [inputText, setInputText] = useState("");
  const [editingMessageId, setEditingMessageId] =
    useState<Id<"messages"> | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const lastTypingSentRef = useRef(0);

  useEffect(() => {
    if (messages && messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages?.length]);

  // Обработка ввода с тротлингом (typing indicator)
  const handleTextChange = (text: string) => {
    setInputText(text);

    const now = Date.now();
    if (now - lastTypingSentRef.current > 1500) {
      lastTypingSentRef.current = now;
      setTyping({ chatRoomId }).catch(() => {});
    }
  };

  // Выбор фото
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]?.uri) {
      setSelectedImageUri(result.assets[0].uri);
    }
  };
  const handleSendOrSave = async () => {
    const text = inputText.trim();
    if ((!text && !selectedImageUri) || isSubmitting) return;

    try {
      setIsSubmitting(true);

      if (editingMessageId) {
        await editMessage({ messageId: editingMessageId, content: text });
        setEditingMessageId(null);
      } else if (selectedImageUri) {
        const uploadUrl = await generateUploadUrl();

        const response = await fetch(selectedImageUri);
        const blob = await response.blob();

        const uploadResult = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": blob.type || "image/jpeg" },
          body: blob,
        });

        if (!uploadResult.ok) throw new Error("Upload failed");

        const { storageId } = await uploadResult.json();

        await sendMediaMessage({
          chatRoomId,
          storageId,
          caption: text || undefined,
        });

        setSelectedImageUri(null);
      } else {
        await sendMessage({ chatRoomId, content: text });
      }

      setInputText("");
    } catch (error) {
      console.error(error);
      Alert.alert("Помилка", "Не вдалося виконати дію");
    } finally {
      setIsSubmitting(false);
    }
  };
  const handleMessageLongPress = (message: {
    _id: Id<"messages">;
    senderId: Id<"users">;
    content?: string;
  }) => {
    if (message.senderId !== currentUser?._id) return;

    const options: any[] = [];

    if (message.content) {
      options.push({
        text: "Редагувати",
        onPress: () => {
          setEditingMessageId(message._id);
          setInputText(message.content || "");
        },
      });
    }

    options.push({
      text: "Видалити",
      style: "destructive",
      onPress: () => confirmDelete(message._id),
    });

    options.push({ text: "Скасувати", style: "cancel" });

    Alert.alert("Дії з повідомленням", undefined, options);
  };

  const confirmDelete = (messageId: Id<"messages">) => {
    Alert.alert("Видалити повідомлення", "Ви впевнені?", [
      { text: "Ні", style: "cancel" },
      {
        text: "Так, видалити",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteMessage({ messageId });
          } catch (err) {
            console.error(err);
            Alert.alert("Помилка", "Не вдалося видалити");
          }
        },
      },
    ]);
  };

  const cancelEditing = () => {
    setEditingMessageId(null);
    setInputText("");
  };

  const formatTime = (timestamp?: number) => {
    if (!timestamp) return "";
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (!room || messages === undefined) {
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
              onPress={() => router.push(`/settings/${chatRoomId}` as any)}
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

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item._id}
        contentContainerStyle={{ padding: 16, gap: 12 }}
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
            <TouchableOpacity
              activeOpacity={0.8}
              onLongPress={() => handleMessageLongPress(item)}
              delayLongPress={300}
              className={`flex-row ${isMe ? "justify-end" : "justify-start"}`}
            >
              <View
                className={`max-w-[80%] rounded-2xl p-3 ${
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

                {item.imageUrl && (
                  <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={() => setFullscreenImage(item.imageUrl!)}
                  >
                    <Image
                      source={{ uri: item.imageUrl }}
                      className="w-56 h-56 rounded-xl mb-1 bg-surface"
                      resizeMode="cover"
                    />
                  </TouchableOpacity>
                )}

                {item.content ? (
                  <Text className="text-white text-base leading-5">
                    {item.content}
                  </Text>
                ) : null}

                <View className="flex-row items-center justify-end mt-1 gap-1">
                  {item.isEdited && (
                    <Text className="text-white/60 text-[10px] italic">
                      (ред.)
                    </Text>
                  )}
                  <Text className="text-white/60 text-[10px]">
                    {formatTime(item._creationTime)}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
      />

      {/* Typing indicator */}
      {typingUsers && typingUsers.length > 0 && (
        <TypingDots typingUsers={typingUsers} />
      )}

      {/* Editing bar */}
      {editingMessageId && (
        <View className="flex-row items-center justify-between px-4 py-2 bg-surfaceLight border-t border-surface">
          <View className="flex-row items-center flex-1 mr-2">
            <Ionicons
              name="pencil"
              size={16}
              color={COLORS.primary}
              style={{ marginRight: 6 }}
            />
            <Text className="text-white text-xs font-semibold">
              Редагування повідомлення
            </Text>
          </View>
          <TouchableOpacity onPress={cancelEditing}>
            <Ionicons name="close-circle" size={20} color={COLORS.textMuted} />
          </TouchableOpacity>
        </View>
      )}

      {/* Selected image preview */}
      {selectedImageUri && (
        <View className="flex-row items-center px-4 py-2 bg-surfaceLight border-t border-surface">
          <Image
            source={{ uri: selectedImageUri }}
            className="w-12 h-12 rounded-lg mr-3"
          />
          <Text className="text-white text-xs flex-1">Фото прикріплено</Text>
          <TouchableOpacity onPress={() => setSelectedImageUri(null)}>
            <Ionicons name="close-circle" size={22} color={COLORS.danger} />
          </TouchableOpacity>
        </View>
      )}

      {/* Input bar */}
      <View className="px-4 py-3 bg-surface border-t border-surfaceLight flex-row items-end gap-2">
        <TouchableOpacity
          onPress={pickImage}
          disabled={isSubmitting}
          className="w-11 h-11 rounded-2xl items-center justify-center bg-secondary"
        >
          <Ionicons name="image-outline" size={22} color={COLORS.primary} />
        </TouchableOpacity>

        <TextInput
          className="flex-1 bg-secondary border border-surfaceLight rounded-2xl px-4 py-2.5 text-white text-base max-h-28 min-h-[42px]"
          placeholder={
            editingMessageId
              ? "Змініть текст..."
              : selectedImageUri
                ? "Підпис до фото..."
                : "Напишіть повідомлення..."
          }
          placeholderTextColor={COLORS.textMuted}
          value={inputText}
          onChangeText={handleTextChange}
          multiline
        />

        <TouchableOpacity
          onPress={handleSendOrSave}
          disabled={(!inputText.trim() && !selectedImageUri) || isSubmitting}
          className={`w-11 h-11 rounded-2xl items-center justify-center ${
            (inputText.trim() || selectedImageUri) && !isSubmitting
              ? "bg-primary"
              : "bg-secondary"
          }`}
          activeOpacity={0.8}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Ionicons
              name={editingMessageId ? "checkmark" : "send"}
              size={18}
              color={
                inputText.trim() || selectedImageUri
                  ? "#FFFFFF"
                  : COLORS.textMuted
              }
            />
          )}
        </TouchableOpacity>
      </View>

      {/* Fullscreen image viewer */}
      <ImageViewerModal
        visible={!!fullscreenImage}
        imageUrl={fullscreenImage}
        onClose={() => setFullscreenImage(null)}
      />
    </KeyboardAvoidingView>
  );
}
