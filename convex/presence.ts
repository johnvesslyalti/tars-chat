import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const updatePresence = mutation({
  args: {
    userId: v.id("users"),
  },

  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("presence")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        isOnline: true,
        lastSeen: Date.now(),
      });
      return;
    }

    await ctx.db.insert("presence", {
      userId: args.userId,
      isOnline: true,
      lastSeen: Date.now(),
    });
  },
});

export const getPresence = query({
  handler: async (ctx) => {
    return await ctx.db.query("presence").collect();
  },
});
