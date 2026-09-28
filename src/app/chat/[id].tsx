// src/app/chat/[id].tsx
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery } from "convex/react";
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from "expo-audio";
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
import { ReactionPickerModal } from "../../components/ReactionPickerModal";
import { ReplyPreviewBar, ReplyTarget } from "../../components/ReplyPreviewBar";
import {
  MessageItemData,
  SwipeableMessageItem,
} from "../../components/SwipeableMessageItem";
import { TypingDots } from "../../components/TypingDots";
import { VoiceMessagePlayer } from "../../components/VoiceMessagePlayer";
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
  const sendAudioMessage = useMutation(api.messages.sendAudioMessage);
  const setTyping = useMutation(api.typing.setTyping);
  const toggleReaction = useMutation(api.reactions.toggleReaction);

  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(audioRecorder);

  const [inputText, setInputText] = useState("");
  const [editingMessageId, setEditingMessageId] =
    useState<Id<"messages"> | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [replyTarget, setReplyTarget] = useState<ReplyTarget | null>(null);
  const [reactionPickerMessageId, setReactionPickerMessageId] =
    useState<Id<"messages"> | null>(null);
  const lastTypingSentRef = useRef(0);

  useEffect(() => {
    if (messages && messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages?.length]);

  const handleTextChange = (text: string) => {
    setInputText(text);

    const now = Date.now();
    if (now - lastTypingSentRef.current > 1500) {
      lastTypingSentRef.current = now;
      setTyping({ chatRoomId }).catch(() => {});
    }
  };

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

  const handleStartReply = (msg: MessageItemData) => {
    setReplyTarget({
      messageId: msg._id,
      senderName: msg.senderName,
      text: msg.content || (msg.imageUrl ? "📷 Фотографія" : "🎤 Голосове"),
    });
    setEditingMessageId(null);
  };

  const handleSend = async () => {
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
          replyToId: replyTarget
            ? (replyTarget.messageId as Id<"messages">)
            : undefined,
          replyToSender: replyTarget?.senderName,
          replyToText: replyTarget?.text,
        });

        setSelectedImageUri(null);
        setReplyTarget(null);
      } else {
        await sendMessage({
          chatRoomId,
          content: text,
          replyToId: replyTarget
            ? (replyTarget.messageId as Id<"messages">)
            : undefined,
          replyToSender: replyTarget?.senderName,
          replyToText: replyTarget?.text,
        });

        setReplyTarget(null);
      }

      setInputText("");
    } catch (error) {
      console.error(error);
      Alert.alert("Помилка", "Не вдалося виконати дію");
    } finally {
      setIsSubmitting(false);
    }
  };

  const startRecording = async () => {
    const permission = await requestRecordingPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Дозвіл не надано", "Потрібен доступ до мікрофона.");
      return;
    }

    try {
      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
    } catch (error) {
      console.error("Помилка запису:", error);
      Alert.alert("Помилка", "Не вдалося розпочати запис.");
    }
  };

  const cancelRecording = async () => {
    try {
      await audioRecorder.stop();
    } catch (error) {
      console.error(error);
    }
  };

  const stopAndSendRecording = async () => {
    try {
      const durationSeconds = Math.round(
        (recorderState.durationMillis || 0) / 1000,
      );

      await audioRecorder.stop();
      const uri = audioRecorder.uri;

      if (!uri || durationSeconds < 1) {
        Alert.alert(
          "Занадто коротке",
          "Голосове повідомлення занадто коротке.",
        );
        return;
      }

      setIsSubmitting(true);

      const uploadUrl = await generateUploadUrl();
      const response = await fetch(uri);
      const blob = await response.blob();

      const uploadResult = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": "audio/m4a" },
        body: blob,
      });

      const { storageId } = await uploadResult.json();

      await sendAudioMessage({
        chatRoomId,
        audioStorageId: storageId,
        audioDuration: durationSeconds,
        replyToId: replyTarget
          ? (replyTarget.messageId as Id<"messages">)
          : undefined,
        replyToSender: replyTarget?.senderName,
        replyToText: replyTarget?.text,
      });

      setReplyTarget(null);
    } catch (error) {
      console.error("Помилка відправки аудіо:", error);
      Alert.alert("Помилка", "Не вдалося надіслати голосове.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMessageLongPress = (item: MessageItemData) => {
    const isOwn = item.senderId === currentUser?._id;
    const options: any[] = [
      {
        text: "Відповісти",
        onPress: () => handleStartReply(item),
      },
      {
        text: "Реакція",
        onPress: () => setReactionPickerMessageId(item._id),
      },
    ];

    if (isOwn) {
      if (item.content) {
        options.push({
          text: "Редагувати",
          onPress: () => {
            setEditingMessageId(item._id);
            setInputText(item.content || "");
            setReplyTarget(null);
          },
        });
      }

      options.push({
        text: "Видалити",
        style: "destructive",
        onPress: () => {
          Alert.alert("Видалити повідомлення?", "Ви впевнені?", [
            { text: "Скасувати", style: "cancel" },
            {
              text: "Так, видалити",
              style: "destructive",
              onPress: () => deleteMessage({ messageId: item._id }),
            },
          ]);
        },
      });
    }

    options.push({ text: "Скасувати", style: "cancel" });

    Alert.alert("Дії з повідомленням", undefined, options);
  };

  const cancelEditing = () => {
    setEditingMessageId(null);
    setInputText("");
  };

  const recordingSeconds = Math.floor(
    (recorderState.durationMillis || 0) / 1000,
  );

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
        contentContainerStyle={{ paddingVertical: 16, gap: 4 }}
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
          const isMe = item.senderId === currentUser?._id;

          return (
            <View>
              <SwipeableMessageItem
                item={item as MessageItemData}
                isOwn={isMe}
                onLongPress={() =>
                  handleMessageLongPress(item as MessageItemData)
                }
                onReply={handleStartReply}
                onImagePress={(url) => setFullscreenImage(url)}
                onAuthorPress={(authorId) =>
                  router.push(`/user/${authorId}` as any)
                }
                onDoubleTap={() => setReactionPickerMessageId(item._id)}
              />

              {item.audioUrl && (
                <View
                  style={{
                    width: "100%",
                    paddingHorizontal: 16,
                    alignItems: isMe ? "flex-end" : "flex-start",
                    marginTop: 4,
                  }}
                >
                  <View
                    style={{ maxWidth: "80%" }}
                    className="bg-secondary border border-surfaceLight rounded-2xl p-2"
                  >
                    <VoiceMessagePlayer
                      audioUrl={item.audioUrl}
                      duration={item.audioDuration}
                      isMyMessage={false}
                    />
                  </View>
                </View>
              )}
            </View>
          );
        }}
      />

      {typingUsers && typingUsers.length > 0 && (
        <TypingDots typingUsers={typingUsers} />
      )}

      {replyTarget && (
        <ReplyPreviewBar
          replyTarget={replyTarget}
          onCancel={() => setReplyTarget(null)}
        />
      )}

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

      {recorderState.isRecording ? (
        <View className="flex-row items-center justify-between px-4 py-2.5 bg-surfaceLight border-t border-surface">
          <View className="flex-row items-center gap-3">
            <View className="w-3 h-3 rounded-full bg-red-500" />
            <Text className="text-white font-medium">
              Запис: {recordingSeconds} с
            </Text>
          </View>

          <View className="flex-row items-center gap-3">
            <TouchableOpacity
              onPress={cancelRecording}
              className="p-2 active:opacity-70"
            >
              <Ionicons name="trash-outline" size={22} color="#EF4444" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={stopAndSendRecording}
              className="w-10 h-10 rounded-full bg-primary items-center justify-center active:opacity-80"
            >
              <Ionicons name="arrow-up" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      ) : (
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
                : replyTarget
                  ? `Відповідь для ${replyTarget.senderName}...`
                  : selectedImageUri
                    ? "Підпис до фото..."
                    : "Напишіть повідомлення..."
            }
            placeholderTextColor={COLORS.textMuted}
            value={inputText}
            onChangeText={handleTextChange}
            multiline
          />

          {inputText.trim() || selectedImageUri ? (
            <TouchableOpacity
              onPress={handleSend}
              disabled={isSubmitting}
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
                  color="#FFFFFF"
                />
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={startRecording}
              disabled={isSubmitting}
              className="w-11 h-11 rounded-2xl items-center justify-center bg-secondary"
            >
              <Ionicons name="mic" size={22} color={COLORS.primary} />
            </TouchableOpacity>
          )}
        </View>
      )}

      <ImageViewerModal
        visible={!!fullscreenImage}
        imageUrl={fullscreenImage}
        onClose={() => setFullscreenImage(null)}
      />

      <ReactionPickerModal
        visible={!!reactionPickerMessageId}
        onClose={() => setReactionPickerMessageId(null)}
        onSelectEmoji={async (emoji) => {
          if (reactionPickerMessageId) {
            try {
              await toggleReaction({
                messageId: reactionPickerMessageId,
                emoji,
              });
            } catch (error) {
              console.error(error);
            }
          }
        }}
      />
    </KeyboardAvoidingView>
  );
}
