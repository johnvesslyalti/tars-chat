import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const createUser = mutation({
  args: {
    clerkId: v.string(),
    name: v.string(),
    imageUrl: v.string(),
  },

  handler: async (ctx, args) => {
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (existingUser) return existingUser._id;

    return await ctx.db.insert("users", {
      clerkId: args.clerkId,
      name: args.name,
      imageUrl: args.imageUrl,
    });
  },
});

export const getUsers = query({
  handler: async (ctx) => {
    return await ctx.db.query("users").collect();
  },
});

export const getOtherUsers = query({
  args: { clerkId: v.string() },

  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .filter((q) => q.neq(q.field("clerkId"), args.clerkId))
      .collect();
  },
});