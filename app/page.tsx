"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { formatTimestamp } from "@/lib/formatTimestamp";

export default function Home() {
  const { user } = useUser();

  const createUser = useMutation(api.users.createUser);
  const getOrCreateConversation = useMutation(api.conversations.getOrCreateConversation);
  const markAsRead = useMutation(api.lastSeen.markAsRead);
  const sendMessage = useMutation(api.messages.sendMessage);
  const updatePresence = useMutation(api.presence.updatePresence);
  const setTyping = useMutation(api.typing.setTyping);
  
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

  const presence = useQuery(api.presence.getPresence);
  
  const typingUsers = useQuery(
    api.typing.getTyping,
    selectedConversation ? { conversationId: selectedConversation } : "skip"
  );
  
  const conversations = useQuery(
    api.conversations.getUserConversations,
    currentUserId ? { userId: currentUserId } : "skip"
  );
  
  const [now, setNow] = useState(Date.now());
  
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);
  
  const otherTyping = typingUsers?.find(
    (t) => t.userId !== currentUserId && t.expiresAt > now
  );
  
  const typingUserDetail = otherTyping 
    ? users?.find((u) => u._id === otherTyping.userId)
    : null;

  const isUserOnline = (userId: Id<"users">) => {
    const record = presence?.find((p) => p.userId === userId);
    if (!record) return false;
    return Date.now() - record.lastSeen < 10000;
  };

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

  useEffect(() => {
    if (!currentUserId) return;

    updatePresence({ userId: currentUserId });

    const interval = setInterval(() => {
      updatePresence({ userId: currentUserId });
    }, 5000);

    return () => clearInterval(interval);
  }, [currentUserId]);

  useEffect(() => {
    if (!selectedConversation || !currentUserId) return;

    markAsRead({
      conversationId: selectedConversation,
      userId: currentUserId,
    });
  }, [selectedConversation, currentUserId, messages]);

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

  if (!users || !conversations) {
    return (
      <main className="h-screen flex">
        <div className="w-full md:w-80 border-r p-4 flex-col">
          <h1 className="text-2xl font-semibold mb-4">Users</h1>
          <div className="flex flex-col gap-2">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="h-12 bg-gray-200 animate-pulse rounded-lg"
              />
            ))}
          </div>
        </div>
      </main>
    );
  }

  const filteredUsers = users.filter((u) =>
    u.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <main className="h-screen flex">
      <div className={`
        ${selectedConversation ? "hidden md:flex" : "flex"}
        w-full md:w-80 border-r p-4 flex-col
      `}>

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
          {filteredUsers.map((u) => {
            const conv = conversations?.find(c => c.members.includes(u._id) && c.members.includes(currentUserId!));
            return (
              <UserRow
                key={u._id}
                user={u}
                conv={conv}
                currentUserId={currentUserId}
                handleConversation={handleConversation}
                isUserOnline={isUserOnline}
                selectedConversation={selectedConversation}
              />
            );
          })}
        </div>
      )}
      </div>

      <div className="hidden md:flex flex-1 p-6 flex-col">
        {!selectedConversation ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            Select a conversation to start chatting
          </div>
        ) : (
          <div className="flex flex-col h-full">
            <div className="flex-1 overflow-y-auto flex flex-col gap-2">
              {!messages ? (
                <div className="flex flex-col gap-2">
                  {[...Array(6)].map((_, i) => (
                    <div
                      key={i}
                      className="h-16 bg-gray-200 animate-pulse rounded-lg"
                    />
                  ))}
                </div>
              ) : messages.length === 0 ? (
                <p className="text-gray-500 text-sm">
                  No messages yet. Start the conversation 🚀
                </p>
              ) : (
                messages.map((m) => {
                  const isSent = m.senderId === currentUserId;
                  return (
                    <div
                      key={m._id}
                      className={`flex ${isSent ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`p-3 max-w-[70%] rounded-2xl ${
                          isSent
                            ? "bg-[#6c47ff] text-white rounded-br-none"
                            : "bg-gray-100 text-black rounded-bl-none border"
                        }`}
                      >
                        <p>{m.body}</p>
                        <span
                          className={`text-[10px] mt-1 block text-right ${
                            isSent ? "text-purple-200" : "text-gray-500"
                          }`}
                        >
                          {formatTimestamp(m.createdAt)}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            
            {typingUserDetail && (
              <p className="text-sm text-gray-500 italic mt-2">
                {typingUserDetail.name} is typing...
              </p>
            )}

            <div className="flex gap-2 mt-4 pt-4 border-t">
              <input
                className="flex-1 border rounded-lg p-2"
                value={message}
                onChange={(e) => {
                  setMessage(e.target.value);
                  if (!selectedConversation || !currentUserId) return;
                  setTyping({
                    conversationId: selectedConversation,
                    userId: currentUserId,
                  });
                }}
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
      </div>

      {selectedConversation && (
        <div className="md:hidden fixed inset-0 bg-white p-4 flex flex-col">
          <button
            onClick={() => setSelectedConversation(null)}
            className="mb-4 text-sm text-gray-500 text-left"
          >
            ← Back
          </button>
          
          <div className="flex-1 overflow-y-auto flex flex-col gap-2">
            {!messages ? (
              <div className="flex flex-col gap-2">
                {[...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    className="h-16 bg-gray-200 animate-pulse rounded-lg"
                  />
                ))}
              </div>
            ) : messages.length === 0 ? (
              <p className="text-gray-500 text-sm">
                No messages yet. Start the conversation 🚀
              </p>
            ) : (
              messages.map((m) => {
                const isSent = m.senderId === currentUserId;
                return (
                  <div
                    key={m._id}
                    className={`flex ${isSent ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`p-3 max-w-[85%] rounded-2xl ${
                        isSent
                          ? "bg-[#6c47ff] text-white rounded-br-none"
                          : "bg-gray-100 text-black rounded-bl-none border"
                      }`}
                    >
                      <p>{m.body}</p>
                      <span
                        className={`text-[10px] mt-1 block text-right ${
                          isSent ? "text-purple-200" : "text-gray-500"
                        }`}
                      >
                        {formatTimestamp(m.createdAt)}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          
          {typingUserDetail && (
            <p className="text-sm text-gray-500 italic mt-2">
              {typingUserDetail.name} is typing...
            </p>
          )}

          <div className="flex gap-2 mt-4 pt-4 border-t">
            <input
              className="flex-1 border rounded-lg p-2"
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                if (!selectedConversation || !currentUserId) return;
                setTyping({
                  conversationId: selectedConversation,
                  userId: currentUserId,
                });
              }}
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

function UserRow({ user, conv, currentUserId, handleConversation, isUserOnline, selectedConversation }: any) {
  const unreadCount = useQuery(
    api.lastSeen.getUnreadCount,
    conv && currentUserId ? { conversationId: conv._id, userId: currentUserId } : "skip"
  );
  
  const isSelected = selectedConversation === conv?._id;

  return (
    <div
      onClick={() => handleConversation(user._id)}
      className={`flex items-center justify-between p-2 border rounded-lg cursor-pointer ${isSelected ? "bg-gray-100" : "hover:bg-gray-100"}`}
    >
      <div className="flex items-center gap-3">
        <div className="relative">
          <img
            src={user.imageUrl}
            className="w-10 h-10 rounded-full"
          />
          {isUserOnline(user._id) && (
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
          )}
        </div>
        <p>{user.name}</p>
      </div>
      {!isSelected && unreadCount ? unreadCount > 0 && (
        <span className="bg-[#6c47ff] text-white text-xs px-2 py-1 rounded-full">
          {unreadCount}
        </span>
      ) : null}
    </div>
  );
}