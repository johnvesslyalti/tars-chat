import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getOrCreateConversation = mutation({
  args: {
    userId: v.id("users"),
    otherUserId: v.id("users"),
  },

  handler: async (ctx, args) => {
    // Check if conversation already exists
    const existing = await ctx.db
      .query("conversations")
      .filter((q) =>
        q.and(
          q.eq(q.field("isGroup"), false),
          q.or(
            q.eq(q.field("members"), [args.userId, args.otherUserId]),
            q.eq(q.field("members"), [args.otherUserId, args.userId])
          )
        )
      )
      .first();

    if (existing) return existing._id;

    // Create new conversation
    return await ctx.db.insert("conversations", {
      members: [args.userId, args.otherUserId],
      isGroup: false,
      lastMessageAt: Date.now(),
    });
  },
});

export const getUserConversations = query({
  args: { userId: v.id("users") },

  handler: async (ctx, args) => {
    return await ctx.db
      .query("conversations")
      .filter((q) => q.eq(q.field("members"), [args.userId]))
      .collect();
  },
});
