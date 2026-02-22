"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

export default function Home() {
  const { user } = useUser();

  const createUser = useMutation(api.users.createUser);
  const getOrCreateConversation = useMutation(api.conversations.getOrCreateConversation);
  const sendMessage = useMutation(api.messages.sendMessage);
  
  const users = useQuery(
    api.users.getOtherUsers,
    user ? { clerkId: user.id } : "skip"
  );

  const [search, setSearch] = useState("");
  const [currentUserId, setCurrentUserId] = useState<Id<"users"> | null>(null);
  const [selectedConversation, setSelectedConversation] = useState<Id<"conversations"> | null>(null);
  const [message, setMessage] = useState("");

  const messages = useQuery(
    api.messages.getMessages,
    selectedConversation ? { conversationId: selectedConversation } : "skip"
  );

  useEffect(() => {
    if (!user) return;

    const syncUser = async () => {
      const id = await createUser({
        clerkId: user.id,
        name: user.fullName ?? "Anonymous",
        imageUrl: user.imageUrl,
      });
      setCurrentUserId(id);
    };

    syncUser();
  }, [user]);

  const handleConversation = async (otherUserId: Id<"users">) => {
    if (!currentUserId) return;

    const conversationId = await getOrCreateConversation({
      userId: currentUserId,
      otherUserId,
    });

    setSelectedConversation(conversationId);
  };

  const handleSend = async () => {
    if (!message.trim() || !selectedConversation || !currentUserId) return;

    await sendMessage({
      conversationId: selectedConversation,
      senderId: currentUserId,
      body: message,
    });

    setMessage("");
  };

  if (!users) return <p className="p-4">Loading users...</p>;

  const filteredUsers = users.filter((u) =>
    u.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <main className="p-6 max-w-xl mx-auto">

      <h1 className="text-2xl font-semibold mb-4">Users</h1>

      <input
        placeholder="Search users..."
        className="w-full border rounded-lg p-2 mb-4"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {filteredUsers.length === 0 ? (
        <p className="text-gray-500">No users found</p>
      ) : (
        <div className="flex flex-col gap-2">
          {filteredUsers.map((u) => (
              <div
                key={u._id}
                onClick={() => handleConversation(u._id)}
                className="flex items-center gap-3 p-2 border rounded-lg cursor-pointer hover:bg-gray-100"
              >
              <img
                src={u.imageUrl}
                className="w-10 h-10 rounded-full"
              />
              <p>{u.name}</p>
            </div>
          ))}
        </div>
      )}

      {selectedConversation && (
        <div className="mt-8 border-t pt-4">
          <div className="flex flex-col gap-2">
            {messages?.map((m) => (
              <div key={m._id} className="p-2 border rounded-lg">
                {m.body}
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-4">
            <input
              className="flex-1 border rounded-lg p-2"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            <button
              onClick={handleSend}
              className="bg-[#6c47ff] text-white px-4 rounded-lg"
            >
              Send
            </button>
          </div>
        </div>
      )}

    </main>
  );
}