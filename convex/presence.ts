import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const updatePresence = mutation({
  args: {
    userId: v.id("users"),
    isOnline: v.optional(v.boolean()),
  },

  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("presence")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    const isOnline = args.isOnline !== undefined ? args.isOnline : true;

    if (existing) {
      await ctx.db.patch(existing._id, {
        isOnline,
        lastSeen: Date.now(),
      });
      return;
    }

    await ctx.db.insert("presence", {
      userId: args.userId,
      isOnline,
      lastSeen: Date.now(),
    });
  },
});

export const getPresence = query({
  handler: async (ctx) => {
    return await ctx.db.query("presence").collect();
  },
});

export const clearOfflineUsers = internalMutation({
  handler: async (ctx) => {
    // 15 seconds threshold
    const threshold = Date.now() - 15000;
    
    // Get all presence records that are currently online
    const onlineUsers = await ctx.db
      .query("presence")
      .filter((q) => q.eq(q.field("isOnline"), true))
      .collect();

    for (const record of onlineUsers) {
      if (record.lastSeen < threshold) {
        await ctx.db.patch(record._id, { isOnline: false });
      }
    }
  },
});
