import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const setTyping = mutation({
  args: {
    conversationId: v.id("conversations"),
    userId: v.id("users"),
  },

  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("typing")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .first();

    const expiresAt = Date.now() + 5000;

    if (existing) {
      await ctx.db.patch(existing._id, { expiresAt });
      return;
    }

    await ctx.db.insert("typing", {
      conversationId: args.conversationId,
      userId: args.userId,
      expiresAt,
    });
  },
});

export const getTyping = query({
  args: { conversationId: v.id("conversations") },

  handler: async (ctx, args) => {
    return await ctx.db
      .query("typing")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .filter((q) => q.gt(q.field("expiresAt"), Date.now()))
      .collect();
  },
});
