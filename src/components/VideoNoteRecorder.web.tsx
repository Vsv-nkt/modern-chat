// src/components/VideoNoteRecorder.web.tsx
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Modal,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { COLORS } from "../constants/theme";

type VideoNoteRecorderProps = {
  visible: boolean;
  onClose: () => void;
  onSendVideo: (videoUri: string, duration: number) => Promise<void>;
};

const MAX_DURATION = 60;

export const VideoNoteRecorder = ({
  visible,
  onClose,
  onSendVideo,
}: VideoNoteRecorderProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pendingBlobUrl, setPendingBlobUrl] = useState<string | null>(null);
  const [pendingDuration, setPendingDuration] = useState(0);
  const [cameraReady, setCameraReady] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(0);
  const recordSecondsRef = useRef(0);

  // Запуск камеры при открытии модалки
  useEffect(() => {
    if (!visible) {
      stopStream();
      return;
    }

    let cancelled = false;

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: 480, height: 480 },
          audio: true,
        });

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
          setCameraReady(true);
        }
      } catch (error) {
        console.error("Помилка доступу до камери:", error);
        Alert.alert(
          "Помилка",
          "Не вдалося отримати доступ до камери або мікрофона.",
        );
      }
    };

    // Небольшая задержка, чтобы videoRef успел примонтироваться
    setTimeout(startCamera, 100);

    return () => {
      cancelled = true;
      stopStream();
    };
  }, [visible]);

  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraReady(false);
  };

  const handleStartRecording = () => {
    if (!streamRef.current || isRecording) return;

    try {
      chunksRef.current = [];
      const mediaRecorder = new MediaRecorder(streamRef.current, {
        mimeType: MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
          ? "video/webm;codecs=vp9"
          : "video/webm",
      });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "video/webm" });
        const blobUrl = URL.createObjectURL(blob);
        setPendingBlobUrl(blobUrl);
        setPendingDuration(recordSecondsRef.current || 1);
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;

      setIsRecording(true);
      setRecordSeconds(0);
      recordSecondsRef.current = 0;
      startTimeRef.current = Date.now();

      if (timerRef.current) {
        clearInterval(timerRef.current);
      }

      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setRecordSeconds(elapsed);
        recordSecondsRef.current = elapsed;

        if (elapsed >= MAX_DURATION) {
          handleStopRecording();
        }
      }, 250);
    } catch (error) {
      console.error("Помилка початку запису:", error);
      Alert.alert("Помилка", "Не вдалося розпочати запис.");
    }
  };

  const handleStopRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const handleConfirmSend = async () => {
    if (!pendingBlobUrl) return;
    try {
      setIsProcessing(true);

      // Получаем blob из blob URL
      const response = await fetch(pendingBlobUrl);
      const blob = await response.blob();

      // Создаём File из blob — to отправить дальше
      const file = new File([blob], "video-note.webm", {
        type: "video/webm",
      });

      // Заменяем blob URL на file URI (в web — это тоже blob)
      const fileUrl = URL.createObjectURL(file);

      await onSendVideo(fileUrl, pendingDuration);
      setIsProcessing(false);
      handleClose();
    } catch (error) {
      console.error("Помилка відправки:", error);
      Alert.alert("Помилка", "Не вдалося надіслати відео");
      setIsProcessing(false);
    }
  };

  const handleCancelPending = () => {
    if (pendingBlobUrl) {
      URL.revokeObjectURL(pendingBlobUrl);
    }
    setPendingBlobUrl(null);
    setPendingDuration(0);
    setRecordSeconds(0);
  };

  const handleClose = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (pendingBlobUrl) {
      URL.revokeObjectURL(pendingBlobUrl);
    }
    stopStream();
    setIsRecording(false);
    setRecordSeconds(0);
    setIsProcessing(false);
    setPendingBlobUrl(null);
    setPendingDuration(0);
    onClose();
  };

  const formatSeconds = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const remaining = sec % 60;
    return `${mins}:${remaining < 10 ? "0" : ""}${remaining}`;
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View className="flex-1 bg-black/90 justify-center items-center px-4">
        <TouchableOpacity
          onPress={handleClose}
          disabled={isRecording || isProcessing}
          className="absolute top-12 right-6 p-2 rounded-full bg-white/10"
        >
          <Ionicons name="close" size={26} color="#FFFFFF" />
        </TouchableOpacity>

        {/* Таймер */}
        <View className="mb-6 items-center">
          <View className="flex-row items-center bg-black/60 px-4 py-1.5 rounded-full border border-white/20">
            {isRecording && (
              <View className="w-2.5 h-2.5 rounded-full bg-red-500 mr-2" />
            )}
            <Text className="text-white font-mono text-base">
              {formatSeconds(recordSeconds)} / 1:00
            </Text>
          </View>
        </View>

        {/* Камера (HTML video) */}
        <View className="w-72 h-72 rounded-full overflow-hidden border-4 border-primary items-center justify-center bg-surface relative">
          {/* @ts-ignore — html-тег для web */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              transform: "scaleX(-1)",
            }}
          />

          {!cameraReady && (
            <View className="absolute inset-0 bg-black/70 items-center justify-center">
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text className="text-white text-xs font-semibold mt-2">
                Завантаження камери...
              </Text>
            </View>
          )}

          {isProcessing && (
            <View className="absolute inset-0 bg-black/70 items-center justify-center">
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text className="text-white text-xs font-semibold mt-2">
                Відправка...
              </Text>
            </View>
          )}
        </View>

        {/* Панель управления */}
        {pendingBlobUrl ? (
          /* ==== ЭКРАН ПОДТВЕРЖДЕНИЯ ==== */
          <View className="flex-row items-center justify-center gap-6 mt-10">
            <TouchableOpacity
              onPress={handleCancelPending}
              disabled={isProcessing}
              className="w-16 h-16 rounded-full bg-red-500/20 border-2 border-red-500 items-center justify-center active:opacity-80"
            >
              <Ionicons name="trash-outline" size={28} color="#EF4444" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleConfirmSend}
              disabled={isProcessing}
              className="w-20 h-20 rounded-full bg-primary items-center justify-center active:opacity-80"
            >
              {isProcessing ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="arrow-up" size={36} color="#FFFFFF" />
              )}
            </TouchableOpacity>
          </View>
        ) : (
          /* ==== ЭКРАН ЗАПИСИ ==== */
          <View className="flex-row items-center justify-center gap-8 mt-10">
            <View className="w-12 h-12" />

            <TouchableOpacity
              onPress={isRecording ? handleStopRecording : handleStartRecording}
              disabled={isProcessing || !cameraReady}
              activeOpacity={0.8}
              className={`w-20 h-20 rounded-full items-center justify-center border-4 ${
                isRecording
                  ? "border-red-500 bg-red-500/30"
                  : "border-white bg-primary"
              } ${!cameraReady ? "opacity-50" : ""}`}
            >
              <Ionicons
                name={isRecording ? "stop" : "radio-button-on"}
                size={36}
                color={isRecording ? "#EF4444" : "#FFFFFF"}
              />
            </TouchableOpacity>

            <View className="w-12 h-12" />
          </View>
        )}

        {/* Подсказка */}
        <Text className="text-white/60 text-xs mt-6 text-center px-8">
          {pendingBlobUrl
            ? "Натисніть ↑ щоб відправити або 🗑 щоб скасувати"
            : isRecording
              ? "Натисніть ⏹ щоб зупинити (макс. 1:00)"
              : "Натисніть ⏺ щоб почати запис (макс. 1:00)"}
        </Text>
      </View>
    </Modal>
  );
};
