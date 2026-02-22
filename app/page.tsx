"use client";

import { useEffect, useState, useRef } from "react";
import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { formatTimestamp } from "@/lib/formatTimestamp";

const SearchIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-gray-400">
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
  </svg>
);

const PaperclipIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-gray-400 cursor-pointer hover:text-gray-600 transition-colors">
    <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" />
  </svg>
);

const SendIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 ml-[2px]">
    <path d="M3.478 2.404a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.404Z" />
  </svg>
);

const DummySidebar = () => (
  <div className="hidden md:flex w-20 flex-col items-center py-8 border-r border-gray-100 bg-gradient-to-b from-[#fdfcfb] to-[#eef4f1] shrink-0">
    <div className="w-10 h-10 bg-[#111] rounded-full mb-8 flex items-center justify-center">
      <div className="w-4 h-4 bg-white rounded-full"></div>
      <div className="w-2 h-2 bg-white rounded-full absolute ml-5 mt-4"></div>
      <div className="w-2 h-2 bg-white rounded-full absolute ml-5 mb-4"></div>
      <div className="w-2 h-2 bg-white rounded-full absolute mr-5 mt-4"></div>
      <div className="w-2 h-2 bg-white rounded-full absolute mr-5 mb-4"></div>
    </div>
    
    <div className="flex flex-col gap-6 text-gray-400">
      <div className="p-3 bg-white shadow-sm rounded-xl text-black">
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      </div>
      <div className="p-3 hover:bg-gray-100 rounded-xl transition cursor-pointer">
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </div>
      <div className="p-3 hover:bg-gray-100 rounded-xl transition cursor-pointer">
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
      </div>
      <div className="p-3 hover:bg-gray-100 rounded-xl transition cursor-pointer text-black">
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
           <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z"></path>
        </svg>
      </div>
    </div>
  </div>
);

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
      setMessage(currentMessage);
    }
  };

  if (!users || !conversations) {
    return (
      <div className="h-screen w-full bg-[#b0cbca] md:p-6 lg:p-10 flex items-center justify-center font-sans">
        <main className="w-full h-full max-w-[1400px] bg-white md:rounded-[2rem] shadow-2xl overflow-hidden flex relative ring-1 ring-black/5">
          <DummySidebar />
          <div className="w-full md:w-[380px] bg-white border-r border-gray-100 p-6 flex-col">
            <h1 className="text-2xl font-semibold mb-6 tracking-tight">Messages</h1>
            <div className="flex flex-col gap-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-100 animate-pulse rounded-2xl" />
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  const filteredUsers = users.filter((u) =>
    u.name.toLowerCase().includes(search.toLowerCase())
  );

  const activeConv = conversations?.find(c => c._id === selectedConversation);
  const otherUserIdInConv = activeConv?.members.find(m => m !== currentUserId);
  const selectedUser = users?.find(u => u._id === otherUserIdInConv);

  return (
    <div className="h-screen w-full bg-[#b0cbca] md:p-6 lg:p-10 flex items-center justify-center font-sans">
      <main className="w-full h-full max-w-[1400px] bg-white md:rounded-[2rem] shadow-2xl overflow-hidden flex relative ring-1 ring-black/5">
        
        <DummySidebar />

        {/* Sidebar */}
        <div className={`
          ${selectedConversation ? "hidden md:flex" : "flex"}
          w-full md:w-[380px] bg-white border-r border-gray-100 flex-col z-10 shrink-0
        `}>
          <div className="p-6 pb-2">
            <div className="relative mb-6">
              <input
                placeholder="Search"
                className="w-full bg-transparent border border-gray-200 text-[15px] rounded-full pl-11 pr-4 py-2.5 outline-none focus:border-gray-300 focus:ring-4 focus:ring-gray-50 transition-all placeholder:text-gray-400"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <div className="absolute left-4 top-[11px]">
                <SearchIcon />
              </div>
            </div>
            <h1 className="text-2xl font-semibold mb-2 text-gray-800 tracking-tight">Messages</h1>
          </div>

          <div className="flex-1 overflow-y-auto outline-none px-3 pb-4 space-y-1">
            {filteredUsers.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">No users match your search</div>
            ) : (
              filteredUsers.map((u) => {
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
              })
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex-col bg-[#f8faf9] relative h-full flex">
          {!selectedConversation ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <div className="w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center mb-4 text-gray-300">
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z"></path>
                </svg>
              </div>
              <p className="font-medium text-gray-600">Your Messages</p>
              <p className="text-sm mt-1">Select a conversation to start chatting.</p>
            </div>
          ) : (
            <>
              {/* Chat Header */}
              {selectedUser && (
                <div className="h-[88px] border-b border-gray-100 bg-white/80 backdrop-blur-md px-6 md:px-8 flex items-center justify-between z-10 shrink-0 sticky top-0">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => setSelectedConversation(null)}
                      className="md:hidden p-2 -ml-2 text-gray-500 hover:bg-gray-100 rounded-full"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <div className="relative">
                      <img src={selectedUser.imageUrl} className="w-11 h-11 rounded-full object-cover shadow-sm" />
                      {isUserOnline(selectedUser._id) && (
                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full ring-2 ring-white" />
                      )}
                    </div>
                    <div>
                      <h2 className="font-semibold text-gray-900 text-lg">{selectedUser.name}</h2>
                      <div className="flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${isUserOnline(selectedUser._id) ? "bg-green-500" : "bg-gray-300"}`} />
                        <span className="text-xs font-medium text-gray-500">
                           {isUserOnline(selectedUser._id) ? "Online" : "Offline"}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 text-gray-400 hidden sm:flex">
                     <svg className="w-5 h-5 cursor-pointer hover:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                     </svg>
                     <svg className="w-5 h-5 cursor-pointer hover:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                     </svg>
                  </div>
                </div>
              )}

              {/* Messages Body */}
              <div className="flex-1 overflow-y-auto p-4 md:p-8 flex flex-col gap-6 relative">
                {!messages ? (
                  <div className="flex flex-col gap-4">
                    {[...Array(4)].map((_, i) => (
                      <div
                        key={i}
                        className={`h-20 bg-gray-200 animate-pulse rounded-3xl max-w-[60%] ${i % 2 === 0 ? "self-end" : "self-start"}`}
                      />
                    ))}
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-400">
                    <p className="text-sm font-medium">No messages yet</p>
                    <p className="text-xs opacity-70 mt-1">Start the conversation 👋</p>
                  </div>
                ) : (
                  messages.map((m) => {
                    const isSent = m.senderId === currentUserId;
                    return (
                      <div
                        key={m._id}
                        className={`flex flex-col ${isSent ? "items-end" : "items-start"} animate-in fade-in slide-in-from-bottom-2 duration-300`}
                      >
                        <div
                          className={`px-5 py-3.5 max-w-[85%] md:max-w-[70%] text-[15px] leading-relaxed shadow-sm ${
                            isSent
                              ? "bg-white text-gray-800 rounded-3xl rounded-br-sm border border-gray-100/50"
                              : "bg-[#161616] text-white rounded-3xl rounded-bl-sm"
                          }`}
                        >
                          <p>{m.body}</p>
                        </div>
                        <span
                          className={`text-[10px] text-gray-400 mt-1.5 mx-2 font-medium`}
                        >
                          {formatTimestamp(m.createdAt)}
                        </span>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} className="h-4 shrink-0" />
              </div>

              {/* Typing Indicator */}
              {typingUserDetail && (
                <div className="px-6 md:px-10 absolute bottom-[90px] left-0 bg-transparent flex items-center gap-2 text-sm text-gray-500 italic">
                  <span>{typingUserDetail.name} is typing</span>
                  <div className="flex gap-1 mt-1">
                    <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              )}

              {/* Chat Input */}
              <div className="p-4 md:p-6 bg-transparent shrink-0">
                <div className="bg-white rounded-full shadow-sm ring-1 ring-gray-100/80 p-2 pl-5 flex items-center gap-4">
                  <PaperclipIcon />
                  <input
                    className="flex-1 bg-transparent py-2.5 outline-none text-gray-800 placeholder:text-gray-400 text-[15px]"
                    placeholder="Write a Message"
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
                    className="w-11 h-11 bg-black text-white rounded-full flex items-center justify-center shrink-0 hover:scale-105 active:scale-95 transition-all shadow-md"
                  >
                    <SendIcon />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
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
      className={`flex items-start gap-3.5 p-3 rounded-2xl cursor-pointer transition-all duration-200 relative mb-1 
      ${isSelected ? "bg-[#f1f6f5]" : "hover:bg-gray-50/80"}`}
    >
      {isSelected && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-8 bg-black rounded-r-full" />
      )}
      
      <div className="relative shrink-0">
        <img
          src={user.imageUrl}
          className="w-12 h-12 rounded-full object-cover shadow-sm"
        />
        {isUserOnline(user._id) && (
          <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full ring-2 ring-white" />
        )}
      </div>
      
      <div className="flex-1 min-w-0 py-0.5">
        <div className="flex items-center justify-between mb-1">
          <p className="font-semibold text-gray-900 truncate text-[14px] pr-2">{user.name}</p>
          <span className="text-[11px] text-gray-400 shrink-0 font-medium tracking-wide">
            {/* mock time for visuals, or use real conversation timestamp */}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-500 truncate pr-2">
            Click to view messages
          </p>
          {!isSelected && unreadCount ? unreadCount > 0 && (
            <span className="bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[1.25rem] text-center shadow-sm shrink-0">
              {unreadCount}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
