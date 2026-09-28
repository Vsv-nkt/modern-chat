// src/components/ConfirmModal.tsx
import { Modal, Pressable, Text, TouchableOpacity, View } from "react-native";

type Props = {
  visible: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  destructive?: boolean;
};

export const ConfirmModal = ({
  visible,
  title,
  message,
  confirmText = "OK",
  cancelText = "Скасувати",
  onConfirm,
  onCancel,
  destructive = false,
}: Props) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <Pressable
        onPress={onCancel}
        className="flex-1 bg-black/60 justify-center items-center px-6"
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          className="bg-secondary border border-surfaceLight rounded-3xl p-5 w-full max-w-sm"
        >
          <Text className="text-white text-lg font-bold mb-2">{title}</Text>
          <Text className="text-textMuted text-sm mb-5">{message}</Text>

          <View className="flex-row gap-2">
            <TouchableOpacity
              onPress={onCancel}
              className="flex-1 bg-surfaceLight rounded-xl py-3 items-center"
            >
              <Text className="text-white font-semibold">{cancelText}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onConfirm}
              className={`flex-1 rounded-xl py-3 items-center ${
                destructive ? "bg-red-500" : "bg-primary"
              }`}
            >
              <Text className="text-white font-semibold">{confirmText}</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};
