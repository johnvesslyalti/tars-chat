import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const markAsRead = mutation({
  args: {
    conversationId: v.id("conversations"),
    userId: v.id("users"),
  },

  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("lastSeen")
      .withIndex("by_user_conversation", (q) =>
        q.eq("userId", args.userId).eq("conversationId", args.conversationId)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        lastSeenAt: Date.now(),
      });
      return;
    }

    await ctx.db.insert("lastSeen", {
      conversationId: args.conversationId,
      userId: args.userId,
      lastSeenAt: Date.now(),
    });
  },
});

export const getUnreadCount = query({
  args: {
    conversationId: v.id("conversations"),
    userId: v.id("users"),
  },

  handler: async (ctx, args) => {
    const seen = await ctx.db
      .query("lastSeen")
      .withIndex("by_user_conversation", (q) =>
        q.eq("userId", args.userId).eq("conversationId", args.conversationId)
      )
      .first();

    const lastSeenAt = seen?.lastSeenAt ?? 0;

    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .collect();

    return messages.filter((m) => m.createdAt > lastSeenAt).length;
  },
});
