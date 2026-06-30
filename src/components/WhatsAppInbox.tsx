import React, { useState, useEffect, useRef } from "react";
import { Client } from "../types";
import { request } from "../utils/api";
import {
  MessageSquare,
  Search,
  Send,
  Sparkles,
  Paperclip,
  CheckCheck,
  Plus,
  Smile,
  Image,
  User,
  Zap,
  MoreVertical,
  ChevronLeft,
  Bot
} from "lucide-react";

interface ChatMessage {
  id: string;
  sender: "client" | "agent" | "system";
  text: string;
  timestamp: string;
  attachment?: {
    name: string;
    type: "pdf" | "image";
    size: string;
  };
}

interface ChatConversation {
  id: string;
  name: string;
  phone: string;
  avatarInitials: string;
  unreadCount: number;
  lastMessageTime: string;
  lastMessageText: string;
  sentiment: "Positive" | "Neutral" | "Question" | "Urgent";
  messages: ChatMessage[];
}

export default function WhatsAppInbox() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "unread" | "groups">("all");

  // Conversation list state
  const [conversations, setConversations] = useState<ChatConversation[]>([
    {
      id: "chat-1",
      name: "Rajesh Kumar",
      phone: "+91 98765 43210",
      avatarInitials: "RK",
      unreadCount: 2,
      lastMessageTime: "9:12 AM",
      lastMessageText: "Please send the term policy PDF doc",
      sentiment: "Question",
      messages: [
        { id: "m1", sender: "client", text: "Namaste, wanted to confirm if my motor cover got approved?", timestamp: "Yesterday" },
        { id: "m2", sender: "agent", text: "Yes Rajesh, the surveyor approved it! Premium paid is logged.", timestamp: "Yesterday" },
        { id: "m3", sender: "client", text: "Great, thanks! Please send the term policy PDF doc as well when free.", timestamp: "9:12 AM" }
      ]
    },
    {
      id: "chat-2",
      name: "Priya Sharma",
      phone: "+91 91234 56789",
      avatarInitials: "PS",
      unreadCount: 0,
      lastMessageTime: "8:45 AM",
      lastMessageText: "Renewal payment done, thank you!",
      sentiment: "Positive",
      messages: [
        { id: "m4", sender: "agent", text: "Hi Priya, your floater insurance is due today. Renew here.", timestamp: "8:30 AM" },
        { id: "m5", sender: "client", text: "Renewal payment done, thank you!", timestamp: "8:45 AM" }
      ]
    },
    {
      id: "chat-3",
      name: "Agents Sync Team",
      phone: "Group Chat",
      avatarInitials: "AT",
      unreadCount: 5,
      lastMessageTime: "10:00 AM",
      lastMessageText: "Suman: We secured 14 term plans today!",
      sentiment: "Positive",
      messages: [
        { id: "m6", sender: "client", text: "Weekly agency metrics look spectacular.", timestamp: "Yesterday" },
        { id: "m7", sender: "client", text: "Suman: We secured 14 term plans today!", timestamp: "10:00 AM" }
      ]
    }
  ]);

  const [activeConversationId, setActiveConversationId] = useState("chat-1");
  const [outboundText, setOutboundText] = useState("");
  const [generatingQuickReply, setGeneratingQuickReply] = useState(false);
  const [aiSuggestedReply, setAiSuggestedReply] = useState("");

  const chatEndRef = useRef<HTMLDivElement>(null);

  const activeChat = conversations.find(c => c.id === activeConversationId) || conversations[0];

  useEffect(() => {
    // Scroll to bottom when conversation or message list changes
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeConversationId, conversations]);

  const loadClients = async () => {
    try {
      setLoading(true);
      const res = await request<Client[]>("/api/clients");
      setClients(res);
    } catch {
      // Keep offline preseed
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClients();
  }, []);

  // AI Suggest reply generation using backend custom generator
  const triggerAISuggestedReply = async () => {
    if (!activeChat) return;
    setGeneratingQuickReply(true);
    try {
      const res = await request<{ text: string }>("/api/messages/generate", {
        method: "POST",
        body: JSON.stringify({
          clientName: activeChat.name,
          policyType: "Term Life Coverage",
          policyNumber: "TL-89472-A",
          renewalDate: "2026-07-07",
          premiumAmount: 15400,
          type: activeChat.sentiment === "Question" ? "Reply to query" : "Renewal Reminder",
          tone: "Friendly"
        })
      });
      setAiSuggestedReply(res.text);
    } catch {
      setAiSuggestedReply(`Dear ${activeChat.name}, here is your requested policy document. Please let me know if you need anything else!`);
    } finally {
      setGeneratingQuickReply(false);
    }
  };

  useEffect(() => {
    triggerAISuggestedReply();
  }, [activeConversationId]);

  const handleSendMessage = (textToSend?: string) => {
    const finalMsgText = textToSend || outboundText;
    if (!finalMsgText.trim()) return;

    const newMessage: ChatMessage = {
      id: `m-${Date.now()}`,
      sender: "agent",
      text: finalMsgText,
      timestamp: "Now"
    };

    const updatedConversations = conversations.map(c => {
      if (c.id === activeChat.id) {
        return {
          ...c,
          lastMessageText: finalMsgText,
          lastMessageTime: "Now",
          unreadCount: 0,
          messages: [...c.messages, newMessage]
        };
      }
      return c;
    });

    setConversations(updatedConversations);
    if (!textToSend) {
      setOutboundText("");
    }

    // Auto simulated response from client after 1.5 seconds
    setTimeout(() => {
      const replyMessage: ChatMessage = {
        id: `m-reply-${Date.now()}`,
        sender: "client",
        text: "Thank you so much! Truly appreciate your fast support. 🙏",
        timestamp: "Now"
      };

      setConversations(prev => prev.map(c => {
        if (c.id === activeChat.id) {
          return {
            ...c,
            lastMessageText: replyMessage.text,
            lastMessageTime: "Now",
            sentiment: "Positive" as const,
            messages: [...c.messages, replyMessage]
          };
        }
        return c;
      }));
    }, 1500);
  };

  const selectQuickReply = (template: string) => {
    handleSendMessage(template);
  };

  const triggerDirectWhatsAppRedirect = () => {
    if (!activeChat) return;
    const cleanPhone = activeChat.phone.replace(/[\s+()-]/g, "");
    window.open(`https://api.whatsapp.com/send?phone=${cleanPhone}&text=Hello ${activeChat.name}, here is a quick message from PolicySync.in`, "_blank");
  };

  const filteredConversations = conversations.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          c.phone.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          c.lastMessageText.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (activeTab === "unread") return matchesSearch && c.unreadCount > 0;
    if (activeTab === "groups") return matchesSearch && c.phone === "Group Chat";
    return matchesSearch;
  });

  return (
    <div className="space-y-6 font-sans">
      {/* Inbox view Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#006D77] tracking-tight flex items-center gap-2">
            <Bot className="h-6 w-6 text-[#25D366]" />
            WhatsApp Unified Inbox
          </h1>
          <p className="text-sm text-slate-500">Coordinate client chats, send secure documents and use AI suggestions in one place.</p>
        </div>

        <button
          onClick={triggerDirectWhatsAppRedirect}
          className="inline-flex items-center space-x-1.5 px-4 py-2.5 bg-[#25D366] hover:bg-[#20ba59] text-white text-xs font-bold rounded-xl transition-all shadow-sm"
        >
          <Plus className="h-4 w-4" />
          <span>Outbound WhatsApp</span>
        </button>
      </div>

      {/* Main Inbox Workspace Frame */}
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm grid grid-cols-1 md:grid-cols-3 h-[600px]">
        
        {/* Left Side: Conversation List column */}
        <div className="border-r border-slate-200 flex flex-col justify-between h-full bg-slate-50/50">
          <div className="p-4 space-y-3.5">
            {/* Search inputs */}
            <div className="relative rounded-xl w-full">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-slate-400" />
              </div>
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#006D77]/10 focus:border-[#006D77] text-xs bg-white"
              />
            </div>

            {/* Sub-tabs toggler */}
            <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
              <button
                onClick={() => setActiveTab("all")}
                className={`flex-1 py-1 text-[10px] font-bold rounded-md transition-all ${
                  activeTab === "all" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                All
              </button>
              <button
                onClick={() => setActiveTab("unread")}
                className={`flex-1 py-1 text-[10px] font-bold rounded-md transition-all ${
                  activeTab === "unread" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Unread
              </button>
              <button
                onClick={() => setActiveTab("groups")}
                className={`flex-1 py-1 text-[10px] font-bold rounded-md transition-all ${
                  activeTab === "groups" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Groups
              </button>
            </div>
          </div>

          {/* Conversations scroll area */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 px-2 pb-4">
            {filteredConversations.map((chat) => {
              const isActive = chat.id === activeConversationId;
              return (
                <div
                  key={chat.id}
                  onClick={() => setActiveConversationId(chat.id)}
                  className={`p-3 rounded-2xl flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                    isActive ? "bg-[#006D77]/5" : "hover:bg-white"
                  }`}
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <div className="h-10 w-10 bg-gradient-to-br from-[#006D77] to-[#005B63] text-white flex items-center justify-center rounded-xl font-bold text-sm shrink-0">
                      {chat.avatarInitials}
                    </div>
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-900 truncate block">{chat.name}</span>
                        {chat.unreadCount > 0 && (
                          <span className="bg-[#25D366] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0">
                            {chat.unreadCount}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500 truncate font-semibold block">{chat.lastMessageText}</p>
                    </div>
                  </div>

                  <div className="text-right shrink-0 space-y-1">
                    <span className="text-[9px] text-slate-400 font-medium block">{chat.lastMessageTime}</span>
                    <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-md leading-tight inline-block ${
                      chat.sentiment === "Positive"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                        : chat.sentiment === "Urgent"
                        ? "bg-rose-50 text-rose-700 border border-rose-100 animate-pulse"
                        : "bg-slate-150 text-slate-600 border border-slate-200"
                    }`}>
                      {chat.sentiment}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Side: Message Window and Chat Pane */}
        <div className="md:col-span-2 flex flex-col justify-between h-full relative bg-[#F4F1EB]">
          {/* Top Chat Bar Header */}
          <div className="bg-white border-b border-slate-200 px-5 py-3 flex items-center justify-between sticky top-0 z-10">
            <div className="flex items-center space-x-3">
              <div className="h-9 w-9 bg-slate-100 rounded-xl flex items-center justify-center text-xs font-bold text-[#006D77]">
                {activeChat.avatarInitials}
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 leading-tight">{activeChat.name}</h4>
                <p className="text-[10px] text-slate-400 font-mono mt-0.5">{activeChat.phone}</p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded bg-emerald-50 border border-emerald-100 text-[10px] font-bold text-emerald-700">
                ● Live WhatsApp Sync
              </span>
              <button className="p-1 text-slate-400 hover:text-slate-600">
                <MoreVertical className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Active Chat Message scroll section */}
          <div className="flex-1 overflow-y-auto p-5 space-y-3.5 bg-repeat bg-opacity-5">
            {activeChat.messages.map((m) => {
              const isAgent = m.sender === "agent";
              return (
                <div
                  key={m.id}
                  className={`flex ${isAgent ? "justify-end" : "justify-start"} items-end gap-1`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl p-3 shadow-xs text-xs relative ${
                      isAgent
                        ? "bg-[#DCF8C6] text-slate-800 rounded-br-none"
                        : "bg-white text-slate-800 rounded-bl-none border border-slate-100"
                    }`}
                  >
                    <p className="leading-relaxed font-semibold">{m.text}</p>
                    <div className="flex items-center justify-end space-x-1 mt-1.5 text-[9px] text-slate-400">
                      <span>{m.timestamp}</span>
                      {isAgent && <CheckCheck className="h-3.5 w-3.5 text-[#34B7F1]" />}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={chatEndRef} />
          </div>

          {/* AI suggested copywriting helper panel */}
          {aiSuggestedReply && (
            <div className="mx-4 my-2 p-3 bg-gradient-to-br from-white to-teal-50 border border-teal-100 rounded-2xl shadow-md space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1">
                  <Sparkles className="h-4 w-4 text-[#FF6F3C] animate-pulse" />
                  <span className="text-[10px] font-extrabold text-[#006D77] uppercase tracking-wider">AI Suggested Quick Reply</span>
                </div>
                <span className="text-[9px] bg-[#006D77]/10 text-[#006D77] px-2 py-0.5 rounded-full font-bold">Positive Sentiment detected</span>
              </div>
              <p className="text-xs text-slate-700 italic leading-relaxed font-semibold bg-white p-2.5 rounded-xl border border-slate-100">
                {aiSuggestedReply}
              </p>
              <div className="flex justify-end gap-1.5">
                <button
                  onClick={() => setAiSuggestedReply("")}
                  className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-[10px] font-bold text-slate-600 transition-all border border-slate-200"
                >
                  Dismiss
                </button>
                <button
                  onClick={() => {
                    setOutboundText(aiSuggestedReply);
                    setAiSuggestedReply("");
                  }}
                  className="px-3 py-1 bg-[#FF6F3C] hover:bg-[#E55F2F] text-white text-[10px] font-bold rounded-lg transition-all shadow-sm"
                >
                  Apply to Input
                </button>
              </div>
            </div>
          )}

          {/* Quick replies prefilled pills */}
          <div className="px-5 py-2.5 bg-white border-t border-slate-100 flex flex-wrap gap-1.5">
            <button
              onClick={() => selectQuickReply("Renewed! Sent confirmation details. 👍")}
              className="px-3 py-1 bg-slate-50 hover:bg-slate-100 text-slate-700 text-[10px] font-bold rounded-full border border-slate-200"
            >
              👍 Renewed!
            </button>
            <button
              onClick={() => selectQuickReply("Namaste, checking other health insurance plans for your family. 🙏")}
              className="px-3 py-1 bg-slate-50 hover:bg-slate-100 text-slate-700 text-[10px] font-bold rounded-full border border-slate-200"
            >
              🙏 Greeting
            </button>
            <button
              onClick={() => selectQuickReply("Document has been analyzed with Gemini OCR. Verified!")}
              className="px-3 py-1 bg-slate-50 hover:bg-slate-100 text-slate-700 text-[10px] font-bold rounded-full border border-slate-200"
            >
              📎 OCR Verified
            </button>
          </div>

          {/* Bottom Chat Inputs form tray */}
          <div className="bg-white px-5 py-3.5 border-t border-slate-200 flex items-center space-x-3">
            <button className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100">
              <Paperclip className="h-4 w-4" />
            </button>
            <input
              type="text"
              placeholder="Type your WhatsApp notification message..."
              value={outboundText}
              onChange={(e) => setOutboundText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSendMessage();
                }
              }}
              className="flex-1 px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#006D77]/10 focus:border-[#006D77] text-xs font-semibold"
            />
            <button
              onClick={() => handleSendMessage()}
              className="p-2.5 bg-[#25D366] hover:bg-[#20ba59] text-white rounded-xl shadow-md transition-transform active:scale-95"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
