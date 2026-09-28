// src/components/MessageActionsModal.tsx
import { Ionicons } from "@expo/vector-icons";
import { Modal, Pressable, Text, TouchableOpacity } from "react-native";
import { COLORS } from "../constants/theme";

type Action = {
  text: string;
  icon: string;
  onPress: () => void;
  destructive?: boolean;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  actions: Action[];
};

export const MessageActionsModal = ({ visible, onClose, actions }: Props) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        onPress={onClose}
        className="flex-1 bg-black/60 justify-center items-center px-6"
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          className="bg-secondary border border-surfaceLight rounded-3xl p-2 w-full max-w-sm"
        >
          {actions.map((action, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => {
                action.onPress();
                onClose();
              }}
              className={`flex-row items-center gap-3 px-4 py-3.5 rounded-2xl active:bg-surfaceLight ${
                index < actions.length - 1 ? "mb-1" : ""
              }`}
            >
              <Ionicons
                name={action.icon as any}
                size={22}
                color={action.destructive ? COLORS.danger : COLORS.primary}
              />
              <Text
                className={`text-base font-semibold ${
                  action.destructive ? "text-red-500" : "text-white"
                }`}
              >
                {action.text}
              </Text>
            </TouchableOpacity>
          ))}
        </Pressable>
      </Pressable>
    </Modal>
  );
};
