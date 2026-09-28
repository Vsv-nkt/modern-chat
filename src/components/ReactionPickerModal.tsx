// src/components/ReactionPickerModal.tsx
import React from "react";
import { Modal, Pressable, Text, TouchableOpacity } from "react-native";

const POPULAR_EMOJIS = ["👍", "❤️", "🔥", "😂", "😮", "😢"];

interface ReactionPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectEmoji: (emoji: string) => void;
}

export const ReactionPickerModal: React.FC<ReactionPickerModalProps> = ({
  visible,
  onClose,
  onSelectEmoji,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        onPress={onClose}
        className="flex-1 bg-black/50 justify-center items-center px-4"
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          className="bg-secondary border border-surfaceLight rounded-3xl p-3 flex-row items-center gap-2"
        >
          {POPULAR_EMOJIS.map((emoji) => (
            <TouchableOpacity
              key={emoji}
              onPress={() => {
                onSelectEmoji(emoji);
                onClose();
              }}
              className="w-12 h-12 rounded-2xl bg-surfaceLight items-center justify-center active:scale-125"
              activeOpacity={0.7}
            >
              <Text className="text-2xl">{emoji}</Text>
            </TouchableOpacity>
          ))}
        </Pressable>
      </Pressable>
    </Modal>
  );
};
