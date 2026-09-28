// convex/messages.ts
import { getAuthUserId } from "@convex-dev/auth/server";
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";

export const listMessages = query({
  args: { chatRoomId: v.id("chatRooms") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("messages")
      .withIndex("by_chat_room", (q) => q.eq("chatRoomId", args.chatRoomId))
      .order("asc")
      .collect();
  },
});

export const getPaginatedMessages = query({
  args: {
    chatRoomId: v.id("chatRooms"),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return { page: [], isDone: true, continueCursor: "" };
    }

    return await ctx.db
      .query("messages")
      .withIndex("by_chat_room", (q) => q.eq("chatRoomId", args.chatRoomId))
      .order("desc")
      .paginate(args.paginationOpts);
  },
});

export const sendMessage = mutation({
  args: {
    chatRoomId: v.id("chatRooms"),
    content: v.string(),
    replyToId: v.optional(v.id("messages")),
    replyToSender: v.optional(v.string()),
    replyToText: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");

    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");

    const trimmedContent = args.content.trim();
    if (!trimmedContent) throw new Error("Message content cannot be empty");

    const messageId = await ctx.db.insert("messages", {
      chatRoomId: args.chatRoomId,
      senderId: userId,
      senderName: user.name ?? user.email ?? "Гравець",
      senderPhoto: user.image,
      content: trimmedContent,
      replyToId: args.replyToId,
      replyToSender: args.replyToSender,
      replyToText: args.replyToText,
    });

    await ctx.db.patch(args.chatRoomId, {
      lastMessage: `${user.name ?? "Гравець"}: ${trimmedContent}`,
      lastMessageAt: Date.now(),
    });

    // ============ PUSH-СПОВІЩЕННЯ ============
    const room = await ctx.db.get(args.chatRoomId);
    const senderName = user.name ?? user.email ?? "Співрозмовник";
    const roomTitle = room?.title ?? "Чат";

    let replyAuthorId: Id<"users"> | null = null;

    // Сценарій А: Reply
    if (args.replyToId) {
      const originalMessage = await ctx.db.get(args.replyToId);
      if (originalMessage && originalMessage.senderId !== userId) {
        replyAuthorId = originalMessage.senderId;
        const originalAuthor = await ctx.db.get(originalMessage.senderId);

        if (originalAuthor?.pushToken) {
          await ctx.scheduler.runAfter(
            0,
            internal.pushNotifications.sendPushNotification,
            {
              pushToken: originalAuthor.pushToken,
              title: `💬 Відповідь від ${senderName}`,
              body: `${senderName} відповів(-ла) у "${roomTitle}": ${trimmedContent}`,
              data: {
                type: "reply",
                roomId: args.chatRoomId,
                messageId,
              },
            },
          );
        }
      }
    }

    // Сценарій Б: Решті учасників
    const recentMessages = await ctx.db
      .query("messages")
      .withIndex("by_chat_room", (q) => q.eq("chatRoomId", args.chatRoomId))
      .collect();

    const recipientIds = new Set<Id<"users">>();

    if (
      room?.creatorId &&
      room.creatorId !== userId &&
      room.creatorId !== replyAuthorId
    ) {
      recipientIds.add(room.creatorId);
    }

    for (const msg of recentMessages) {
      if (msg.senderId !== userId && msg.senderId !== replyAuthorId) {
        recipientIds.add(msg.senderId);
      }
    }

    for (const recipientId of recipientIds) {
      const recipient = await ctx.db.get(recipientId);
      if (recipient?.pushToken) {
        await ctx.scheduler.runAfter(
          0,
          internal.pushNotifications.sendPushNotification,
          {
            pushToken: recipient.pushToken,
            title: `${senderName} (${roomTitle})`,
            body: trimmedContent,
            data: {
              type: "message",
              roomId: args.chatRoomId,
              messageId,
            },
          },
        );
      }
    }
    // ============ КІНЕЦЬ PUSH ============

    return messageId;
  },
});

export const editMessage = mutation({
  args: {
    messageId: v.id("messages"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");

    const message = await ctx.db.get(args.messageId);
    if (!message) throw new Error("Message not found");
    if (message.senderId !== userId) throw new Error("Forbidden");

    const trimmedContent = args.content.trim();
    if (!trimmedContent) throw new Error("Повідомлення не може бути порожнім");

    await ctx.db.patch(args.messageId, {
      content: trimmedContent,
      isEdited: true,
    });

    const room = await ctx.db.get(message.chatRoomId);
    if (room && room.lastMessageAt === message._creationTime) {
      await ctx.db.patch(message.chatRoomId, {
        lastMessage: `${message.senderName}: ${trimmedContent}`,
      });
    }
  },
});

export const deleteMessage = mutation({
  args: { messageId: v.id("messages") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");

    const message = await ctx.db.get(args.messageId);
    if (!message) throw new Error("Message not found");
    if (message.senderId !== userId) throw new Error("Forbidden");

    if (message.storageId) {
      await ctx.storage.delete(message.storageId);
    }

    await ctx.db.delete(args.messageId);

    const lastRemainingMessage = await ctx.db
      .query("messages")
      .withIndex("by_chat_room", (q) => q.eq("chatRoomId", message.chatRoomId))
      .order("desc")
      .first();

    await ctx.db.patch(message.chatRoomId, {
      lastMessage: lastRemainingMessage
        ? `${lastRemainingMessage.senderName}: ${lastRemainingMessage.content}`
        : "Повідомлень немає",
      lastMessageAt: lastRemainingMessage?._creationTime ?? Date.now(),
    });
  },
});

export const generateUploadUrl = mutation(async (ctx) => {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Unauthorized");
  return await ctx.storage.generateUploadUrl();
});

export const sendMediaMessage = mutation({
  args: {
    chatRoomId: v.id("chatRooms"),
    storageId: v.id("_storage"),
    caption: v.optional(v.string()),
    replyToId: v.optional(v.id("messages")),
    replyToSender: v.optional(v.string()),
    replyToText: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");

    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");

    const imageUrl = await ctx.storage.getUrl(args.storageId);
    if (!imageUrl) throw new Error("Не вдалося отримати URL зображення");

    const trimmedCaption = args.caption?.trim();

    const messageId = await ctx.db.insert("messages", {
      chatRoomId: args.chatRoomId,
      senderId: userId,
      senderName: user.name ?? user.email ?? "Гравець",
      senderPhoto: user.image,
      content: trimmedCaption,
      imageUrl,
      storageId: args.storageId,
      replyToId: args.replyToId,
      replyToSender: args.replyToSender,
      replyToText: args.replyToText,
    });

    await ctx.db.patch(args.chatRoomId, {
      lastMessage: `${user.name ?? "Гравець"}: 📷 Фото${
        trimmedCaption ? ` (${trimmedCaption})` : ""
      }`,
      lastMessageAt: Date.now(),
    });

    return messageId;
  },
});

export const sendAudioMessage = mutation({
  args: {
    chatRoomId: v.id("chatRooms"),
    audioStorageId: v.id("_storage"),
    audioDuration: v.number(),
    replyToId: v.optional(v.id("messages")),
    replyToSender: v.optional(v.string()),
    replyToText: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");

    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");

    const audioUrl = await ctx.storage.getUrl(args.audioStorageId);
    if (!audioUrl) throw new Error("Не вдалося отримати URL аудіо");

    const messageId = await ctx.db.insert("messages", {
      chatRoomId: args.chatRoomId,
      senderId: userId,
      senderName: user.name ?? user.email?.split("@")[0] ?? "Гравець",
      senderPhoto: user.image,
      audioUrl,
      audioStorageId: args.audioStorageId,
      audioDuration: args.audioDuration,
      replyToId: args.replyToId,
      replyToSender: args.replyToSender,
      replyToText: args.replyToText,
    });

    await ctx.db.patch(args.chatRoomId, {
      lastMessage: "🎤 Голосове повідомлення",
      lastMessageAt: Date.now(),
    });

    return messageId;
  },
});

export const sendVideoNoteMessage = mutation({
  args: {
    chatRoomId: v.id("chatRooms"),
    videoStorageId: v.id("_storage"),
    videoDuration: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");

    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");

    const videoUrl = await ctx.storage.getUrl(args.videoStorageId);
    if (!videoUrl) throw new Error("Не вдалося отримати URL відео");

    const messageId = await ctx.db.insert("messages", {
      chatRoomId: args.chatRoomId,
      senderId: userId,
      senderName: user.name ?? user.email?.split("@")[0] ?? "Гравець",
      senderPhoto: user.image,
      videoUrl,
      videoStorageId: args.videoStorageId,
      videoDuration: args.videoDuration,
      isVideoNote: true,
    });

    await ctx.db.patch(args.chatRoomId, {
      lastMessage: "📹 Відеокружечок",
      lastMessageAt: Date.now(),
    });

    return messageId;
  },
});
