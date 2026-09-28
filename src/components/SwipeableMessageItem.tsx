// src/components/SwipeableMessageItem.tsx
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { Image, Text, TouchableOpacity, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from "react-native-reanimated";
import { Id } from "../../convex/_generated/dataModel";
import { COLORS } from "../constants/theme";
import { ReactionBadges } from "./ReactionBadges";

export interface MessageItemData {
  _id: Id<"messages">;
  senderId: Id<"users">;
  senderName: string;
  senderPhoto?: string;
  content?: string;
  imageUrl?: string;
  isEdited?: boolean;
  replyToId?: Id<"messages">;
  replyToSender?: string;
  replyToText?: string;
  audioUrl?: string;
  audioDuration?: number;
  videoUrl?: string;
  videoDuration?: number;
  isVideoNote?: boolean;
  _creationTime: number;
}

interface SwipeableMessageItemProps {
  item: MessageItemData;
  isOwn: boolean;
  onLongPress: () => void;
  onReply: (message: MessageItemData) => void;
  onImagePress?: (url: string) => void;
  onAuthorPress?: (userId: Id<"users">) => void;
  onDoubleTap?: () => void;
}

const SWIPE_THRESHOLD = 50;

export const SwipeableMessageItem: React.FC<SwipeableMessageItemProps> = ({
  item,
  isOwn,
  onLongPress,
  onReply,
  onImagePress,
  onAuthorPress,
  onDoubleTap,
}) => {
  const translateX = useSharedValue(0);
  const [lastTap, setLastTap] = useState(0);

  const triggerReply = () => {
    onReply(item);
  };

  const panGesture = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .onUpdate((event) => {
      if (event.translationX > 0) {
        translateX.value = Math.min(event.translationX, 80);
      }
    })
    .onEnd((event) => {
      if (event.translationX > SWIPE_THRESHOLD) {
        runOnJS(triggerReply)();
      }
      translateX.value = withSpring(0, { damping: 16, stiffness: 200 });
    });

  const animatedBubbleStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const animatedIconStyle = useAnimatedStyle(() => {
    const progress = Math.min(translateX.value / SWIPE_THRESHOLD, 1);
    return {
      opacity: progress,
      transform: [{ scale: 0.5 + progress * 0.5 }],
    };
  });

  const handleTap = () => {
    const now = Date.now();
    if (now - lastTap < 300) {
      onDoubleTap?.();
    }
    setLastTap(now);
  };

  return (
    <View
      style={{
        width: "100%",
        paddingHorizontal: 16,
        marginVertical: 4,
        alignItems: isOwn ? "flex-end" : "flex-start",
      }}
    >
      {/* Иконка reply слева */}
      <Animated.View
        style={[
          animatedIconStyle,
          {
            position: "absolute",
            left: 4,
            top: "50%",
            marginTop: -16,
          },
        ]}
        className="items-center justify-center w-8 h-8 rounded-full bg-primary/30"
      >
        <Ionicons name="arrow-undo" size={18} color={COLORS.primary} />
      </Animated.View>

      <GestureDetector gesture={panGesture}>
        <Animated.View
          style={[
            animatedBubbleStyle,
            {
              maxWidth: "80%",
            },
          ]}
        >
          <TouchableOpacity
            activeOpacity={0.9}
            onLongPress={onLongPress}
            onPress={handleTap}
            {...({
              onContextMenu: (e: any) => {
                e.preventDefault();
                onLongPress();
              },
            } as any)}
            className={`rounded-2xl p-3 ${
              isOwn
                ? "bg-primary rounded-br-none"
                : "bg-secondary rounded-bl-none border border-surfaceLight"
            }`}
          >
            {!isOwn && (
              <TouchableOpacity
                onPress={() => onAuthorPress?.(item.senderId)}
                activeOpacity={0.7}
                className="mb-1"
              >
                <Text className="text-primary font-bold text-xs">
                  {item.senderName}
                </Text>
              </TouchableOpacity>
            )}

            {item.replyToSender && (
              <View className="mb-2 p-2 rounded-lg bg-surface/50 border-l-2 border-primary">
                <Text className="text-primary font-semibold text-[11px]">
                  {item.replyToSender}
                </Text>
                <Text
                  className="text-white/70 text-xs mt-0.5"
                  numberOfLines={2}
                >
                  {item.replyToText || "📷 Фотографія"}
                </Text>
              </View>
            )}

            {item.imageUrl && (
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => onImagePress?.(item.imageUrl!)}
              >
                <Image
                  source={{ uri: item.imageUrl }}
                  style={{ width: 200, height: 200, borderRadius: 12 }}
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
                <Text className="text-white/60 text-[10px] italic">(ред.)</Text>
              )}
              <Text className="text-white/60 text-[10px]">
                {new Date(item._creationTime).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Бейджи реакций под бульбашкой */}
          <ReactionBadges messageId={item._id} />
        </Animated.View>
      </GestureDetector>
    </View>
  );
};
