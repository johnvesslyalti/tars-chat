"use client";

import { useEffect, useState, useRef } from "react";
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
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);
  
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

    const currentMessage = message;
    setMessage("");

    try {
      await sendMessage({
        conversationId: selectedConversation,
        senderId: currentUserId,
        body: currentMessage,
      });
    } catch (err) {
      console.error(err);
      alert("Message failed to send");
      setMessage(currentMessage); // Restore message on failure
    }
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
    <main className="h-screen flex overflow-hidden bg-gray-50">
      <div className={`
        ${selectedConversation ? "hidden md:flex" : "flex"}
        w-full md:w-80 bg-white border-r shadow-sm p-4 flex-col z-10
      `}>

      <h1 className="text-2xl font-semibold mb-4">Users</h1>

      <input
        placeholder="Search users..."
        className="w-full border rounded-lg p-2 mb-4"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {filteredUsers.length === 0 ? (
        <p className="text-gray-500">No users match your search</p>
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
          <div className="flex flex-col h-full bg-gray-50 relative">
            <div className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col gap-3">
              {!messages ? (
                <div className="flex flex-col gap-3">
                  {[...Array(6)].map((_, i) => (
                    <div
                      key={i}
                      className="h-16 bg-gray-200 animate-pulse rounded-2xl max-w-[70%]"
                    />
                  ))}
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                  <p className="text-sm">No messages yet</p>
                  <p className="text-xs opacity-70 mt-1">Start the conversation 🚀</p>
                </div>
              ) : (
                messages.map((m) => {
                  const isSent = m.senderId === currentUserId;
                  return (
                    <div
                      key={m._id}
                      className={`flex ${isSent ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom-2 duration-200`}
                    >
                      <div
                        className={`px-4 py-2 rounded-2xl max-w-[75%] md:max-w-xs break-words shadow-sm ${
                          isSent
                            ? "bg-[#6c47ff] text-white rounded-br-sm"
                            : "bg-white border text-black rounded-bl-sm"
                        }`}
                      >
                        <p>{m.body}</p>
                        <span
                          className={`text-[11px] opacity-60 mt-1 block text-right`}
                        >
                          {formatTimestamp(m.createdAt)}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>
            
            {typingUserDetail && (
              <div className="flex items-center gap-2 text-sm text-gray-500 italic mt-2 px-4 md:px-6 absolute bottom-20 left-0 bg-transparent">
                <p>{typingUserDetail.name} is typing</p>
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            )}

            <div className="border-t bg-white/80 backdrop-blur-sm p-4 flex gap-2">
              <input
                className="flex-1 bg-gray-100 rounded-full px-4 py-2 outline-none focus:ring-2 focus:ring-[#6c47ff] transition-all"
                placeholder="Type a message..."
                value={message}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
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
                className="bg-[#6c47ff] text-white px-5 rounded-full hover:scale-105 active:scale-95 transition-all shadow-sm font-medium"
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
          
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 bg-gray-50">
            {!messages ? (
              <div className="flex flex-col gap-3">
                {[...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    className="h-16 bg-gray-200 animate-pulse rounded-2xl max-w-[70%]"
                  />
                ))}
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <p className="text-sm">No messages yet</p>
                <p className="text-xs opacity-70 mt-1">Start the conversation 🚀</p>
              </div>
            ) : (
              messages.map((m) => {
                const isSent = m.senderId === currentUserId;
                return (
                  <div
                    key={m._id}
                    className={`flex ${isSent ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom-2 duration-200`}
                  >
                    <div
                      className={`px-4 py-2 rounded-2xl max-w-[85%] break-words shadow-sm ${
                        isSent
                          ? "bg-[#6c47ff] text-white rounded-br-sm"
                          : "bg-white border text-black rounded-bl-sm"
                      }`}
                    >
                      <p>{m.body}</p>
                      <span
                        className={`text-[11px] opacity-60 mt-1 block text-right`}
                      >
                        {formatTimestamp(m.createdAt)}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>
          
          {typingUserDetail && (
            <div className="flex items-center gap-2 text-sm text-gray-500 italic mt-2 px-4 absolute bottom-20 left-0 bg-transparent">
              <p>{typingUserDetail.name} is typing</p>
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          )}

          <div className="border-t bg-white/80 backdrop-blur-sm p-3 flex gap-2">
            <input
              className="flex-1 bg-gray-100 rounded-full px-4 py-2 outline-none focus:ring-2 focus:ring-[#6c47ff] transition-all"
              placeholder="Type a message..."
              value={message}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
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
              className="bg-[#6c47ff] text-white px-5 rounded-full hover:scale-105 active:scale-95 transition-all shadow-sm font-medium"
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
      className={`flex items-center justify-between p-3 border rounded-xl cursor-pointer transition-all duration-200 ${isSelected ? "bg-gray-100 border-gray-300 shadow-sm" : "hover:bg-gray-50 border-transparent hover:border-gray-200 hover:shadow-sm"}`}
    >
      <div className="flex items-center gap-3 w-full min-w-0">
        <div className="relative shrink-0">
          <img
            src={user.imageUrl}
            className="w-11 h-11 rounded-full object-cover"
          />
          {isUserOnline(user._id) && (
            <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 rounded-full ring-2 ring-white" />
          )}
        </div>
        <p className="font-medium text-gray-900 truncate pr-2">{user.name}</p>
      </div>
      {!isSelected && unreadCount ? unreadCount > 0 && (
        <span className="bg-[#6c47ff] text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm shrink-0">
          {unreadCount}
        </span>
      ) : null}
    </div>
  );
}