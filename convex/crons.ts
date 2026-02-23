import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "clear offline users",
  { seconds: 15 }, // runs every 15 seconds to keep presence real-timeish
  internal.presence.clearOfflineUsers
);

export default crons;
