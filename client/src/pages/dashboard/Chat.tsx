import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useChats, useCreateChat, useChat, useSendMessage } from "@/hooks/use-chats";
import { useDocuments } from "@/hooks/use-documents";
import { Send, Plus, MessageSquare, Loader2, Bot, User as UserIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

export default function ChatPage() {
  const [activeChatId, setActiveChatId] = useState<number | null>(null);
  const { data: chats, isLoading: loadingChats } = useChats();
  const { data: documents } = useDocuments();
  const { mutate: createChat } = useCreateChat();
  const { data: activeChat, isLoading: loadingMessages } = useChat(activeChatId!);
  const { mutate: sendMessage, isPending: isSending } = useSendMessage();
  
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeChat?.messages]);

  const handleCreateChat = (docId: number) => {
    const doc = documents?.find(d => d.id === docId);
    if (!doc) return;
    createChat({ documentId: docId, title: `Chat about ${doc.name}` }, {
      onSuccess: (newChat) => setActiveChatId(newChat.id)
    });
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || !activeChatId) return;
    
    sendMessage({ chatId: activeChatId, content: inputValue });
    setInputValue("");
  };

  return (
    <DashboardLayout>
      <div className="h-[calc(100vh-8rem)] flex gap-6">
        
        {/* Chat Sidebar */}
        <GlassCard className="w-80 flex flex-col p-0 overflow-hidden hidden md:flex">
          <div className="p-4 border-b border-white/10">
            <h2 className="font-bold text-white mb-4">Conversations</h2>
            {/* New Chat Dropdown placeholder - simplified for demo */}
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground uppercase font-semibold">Start New Chat</p>
              <div className="grid grid-cols-1 gap-2 max-h-32 overflow-y-auto">
                {documents?.map(doc => (
                  <Button 
                    key={doc.id} 
                    variant="outline" 
                    size="sm" 
                    className="justify-start truncate border-white/10 hover:bg-white/5 text-white"
                    onClick={() => handleCreateChat(doc.id)}
                  >
                    <Plus className="w-3 h-3 mr-2" />
                    {doc.name}
                  </Button>
                ))}
              </div>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {loadingChats ? (
              <div className="p-4 text-center"><Loader2 className="animate-spin mx-auto text-primary" /></div>
            ) : (
              chats?.map(chat => (
                <button
                  key={chat.id}
                  onClick={() => setActiveChatId(chat.id)}
                  className={cn(
                    "w-full text-left p-3 rounded-lg text-sm transition-colors flex items-center gap-3",
                    activeChatId === chat.id ? "bg-primary/20 text-white border border-primary/20" : "text-muted-foreground hover:bg-white/5"
                  )}
                >
                  <MessageSquare className="w-4 h-4" />
                  <span className="truncate">{chat.title}</span>
                </button>
              ))
            )}
          </div>
        </GlassCard>

        {/* Main Chat Area */}
        <GlassCard className="flex-1 flex flex-col overflow-hidden p-0 relative">
          {!activeChatId ? (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8 text-center">
              <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6">
                <Bot className="w-10 h-10 text-primary" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Select a Conversation</h3>
              <p>Choose a document from the left to start chatting.</p>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="p-4 border-b border-white/10 bg-white/5 flex justify-between items-center backdrop-blur-md z-10">
                <div>
                  <h3 className="font-bold text-white">{activeChat?.title}</h3>
                  <p className="text-xs text-muted-foreground">AI Assistant</p>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {activeChat?.messages?.map((msg) => (
                  <div
                    key={msg.id}
                    className={cn(
                      "flex gap-4 max-w-3xl",
                      msg.role === "user" ? "ml-auto flex-row-reverse" : ""
                    )}
                  >
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                      msg.role === "user" ? "bg-primary text-white" : "bg-green-500/20 text-green-400"
                    )}>
                      {msg.role === "user" ? <UserIcon size={16} /> : <Bot size={16} />}
                    </div>
                    <div className={cn(
                      "p-4 rounded-2xl text-sm leading-relaxed",
                      msg.role === "user" 
                        ? "bg-primary text-white rounded-tr-none shadow-lg shadow-primary/20" 
                        : "bg-white/10 text-gray-100 rounded-tl-none border border-white/5"
                    )}>
                      {msg.content}
                      {msg.sourcePage && (
                        <div className="mt-2 pt-2 border-t border-white/10 text-xs text-white/50">
                          Source: Page {msg.sourcePage}
                        </div>
                      )}
                      <div className="mt-1 text-[10px] opacity-50 text-right">
                        {format(new Date(msg.createdAt!), 'h:mm a')}
                      </div>
                    </div>
                  </div>
                ))}
                {isSending && (
                  <div className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center">
                      <Bot size={16} />
                    </div>
                    <div className="bg-white/10 p-4 rounded-2xl rounded-tl-none">
                      <div className="flex gap-1">
                        <span className="w-2 h-2 bg-white/50 rounded-full animate-bounce" />
                        <span className="w-2 h-2 bg-white/50 rounded-full animate-bounce delay-75" />
                        <span className="w-2 h-2 bg-white/50 rounded-full animate-bounce delay-150" />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="p-4 border-t border-white/10 bg-white/5 backdrop-blur-md">
                <form onSubmit={handleSend} className="flex gap-3">
                  <Input
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="Ask something about your document..."
                    className="bg-black/20 border-white/10 focus:border-primary/50 text-white rounded-xl"
                  />
                  <Button 
                    type="submit" 
                    size="icon" 
                    disabled={isSending || !inputValue.trim()}
                    className="bg-primary hover:bg-primary/90 text-white rounded-xl h-10 w-10 shrink-0"
                  >
                    <Send size={18} />
                  </Button>
                </form>
              </div>
            </>
          )}
        </GlassCard>
      </div>
    </DashboardLayout>
  );
}
