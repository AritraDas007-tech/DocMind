import { useState, useRef, useEffect, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { useChats, useCreateChat, useChat, useSendMessage, useDeleteChat } from "@/hooks/use-chats";
import { useDocuments } from "@/hooks/use-documents";
import {
  MessageSquare,
  Loader2,
  Bot,
  User as UserIcon,
  Trash2,
  ArrowLeft,
  Plus,
  ArrowUp,
  Circle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";

export default function ChatPage() {
  const [activeChatId, setActiveChatId] = useState<number | null>(null);
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();

  const { data: chats, isLoading: loadingChats, refetch: refetchChats } = useChats();
  const { data: documents } = useDocuments();
  const { mutate: createChat, isPending: creatingChat } = useCreateChat();
  const { data: activeChat, isLoading: loadingMessages, refetch: refetchActiveChat } = useChat(activeChatId as number);
  const { mutate: sendMessage, isPending: isSending } = useSendMessage();
  const { mutate: deleteChat } = useDeleteChat();

  const initialCheckDone = useRef(false);

  // Handle URL query parameters on initial load
  useEffect(() => {
    if (loadingChats || !chats || initialCheckDone.current) return;

    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    if (id) {
      setActiveChatId(Number(id));
    } else if (chats.length > 0) {
      setActiveChatId(chats[0].id);
    }
    initialCheckDone.current = true;
  }, [chats, loadingChats]);

  // Sync URL with activeChatId
  useEffect(() => {
    if (activeChatId !== null) {
      const url = new URL(window.location.href);
      if (url.searchParams.get("id") !== activeChatId.toString()) {
        url.searchParams.set("id", activeChatId.toString());
        window.history.replaceState(null, "", url.toString());
      }
    } else {
      const url = new URL(window.location.href);
      if (url.searchParams.has("id")) {
        url.searchParams.delete("id");
        window.history.replaceState(null, "", url.toString());
      }
    }
  }, [activeChatId]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeChat?.messages, isSending]);

  // Sync textarea height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [inputValue]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputValue.trim() || isSending || creatingChat) return;

    const content = inputValue;
    setInputValue("");

    if (activeChatId === null) {
      if (!documents || documents.length === 0) {
        toast({ title: "Please upload a document first", variant: "destructive" });
        return;
      }
      createChat({ documentId: documents[0].id, title: content.slice(0, 30) || "New Conversation" }, {
        onSuccess: (newChat) => {
          setActiveChatId(newChat.id);
          sendMessage({ chatId: newChat.id, content }, {
            onSuccess: () => {
              refetchActiveChat();
              refetchChats();
            }
          });
        }
      });
    } else {
      sendMessage({ chatId: activeChatId, content }, {
        onSuccess: () => {
          refetchActiveChat();
          refetchChats();
        },
        onError: () => {
          setInputValue(content);
          toast({ title: "Failed to send message", variant: "destructive" });
        }
      });
    }
  };

  const handleNewChat = () => {
    setActiveChatId(null);
    setInputValue("");
    // Optionally create it immediately, but let's just show the clean slate
    // If the user wants to truly create it:
    /*
    if (!documents || documents.length === 0) {
      toast({ title: "No documents available", variant: "destructive" });
      return;
    }
    createChat({ documentId: documents[0].id, title: "New Conversation" }, {
      onSuccess: (newChat) => {
        setActiveChatId(newChat.id);
        setInputValue("");
        refetchChats();
      }
    });
    */
  };

  const handleDelete = (id: number) => {
    if (!confirm("Remove this conversation?")) return;
    deleteChat(id, {
      onSuccess: () => {
        if (activeChatId === id) setActiveChatId(null);
        refetchChats();
        toast({ title: "Chat deleted" });
      }
    });
  };

  return (
    <DashboardLayout>
      <div className="fixed inset-0 top-16 md:left-64 flex bg-[#0d0d0d] text-white overflow-hidden">

        {/* --- SIDEBAR --- */}
        <div className={cn(
          "w-72 flex flex-col bg-[#050505] border-r border-white/10 shrink-0 transition-transform duration-300 shadow-2xl z-30",
          activeChatId !== null ? "hidden lg:flex" : "flex w-full lg:w-72"
        )}>
          <div className="p-6 py-8 border-b border-white/10 flex items-center justify-between bg-black/20">
            <h2 className="text-xs font-black uppercase tracking-[4px] text-white/40 px-2">Conversations</h2>
            <Button variant="ghost" size="icon" onClick={handleNewChat} className="h-10 w-10 bg-primary/10 hover:bg-primary/20 text-primary rounded-2xl transition-all active:scale-95 border border-primary/20">
              <Plus className="w-5 h-5" />
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
            {loadingChats ? (
              <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-primary opacity-50" /></div>
            ) : chats?.map(chat => (
              <div
                key={chat.id}
                onClick={() => setActiveChatId(chat.id)}
                className={cn(
                  "group p-4 rounded-2xl cursor-pointer flex items-center gap-4 transition-all border relative overflow-hidden",
                  activeChatId === chat.id
                    ? "bg-primary/10 border-primary/30 text-white shadow-[0_0_20px_rgba(139,92,246,0.1)]"
                    : "bg-transparent border-transparent text-white/50 hover:bg-white/5 hover:text-white hover:border-white/10"
                )}
              >
                {activeChatId === chat.id && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary shadow-[0_0_10px_rgba(139,92,246,0.5)]" />
                )}
                <MessageSquare className={cn("w-4 h-4 shrink-0 transition-colors", activeChatId === chat.id ? "text-primary" : "opacity-30")} />
                <span className="text-[13px] truncate flex-1 font-bold tracking-tight">{chat.title}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(chat.id); }}
                  className="opacity-0 group-hover:opacity-100 hover:text-red-400 p-2 rounded-xl hover:bg-red-400/10 transition-all active:scale-90"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* --- MAIN CHAT AREA --- */}
        <div className="flex-1 flex flex-col h-full bg-[#0d0d0d] relative">

          {/* Subtle Background Glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-primary/5 blur-[120px] pointer-events-none" />

          {/* Top Bar */}
          <div className="h-20 border-b border-white/10 flex items-center justify-between px-10 bg-[#0d0d0d]/80 backdrop-blur-2xl z-20">
            <div className="flex items-center gap-5">
              {activeChatId !== null && (
                <Button variant="ghost" size="icon" className="lg:hidden h-10 w-10 rounded-2xl bg-white/5 border border-white/10" onClick={() => setActiveChatId(null)}>
                  <ArrowLeft className="w-5 h-5 text-white/50" />
                </Button>
              )}
              <div className="flex flex-col">
                <h2 className="text-[15px] font-bold tracking-tight text-white/90">
                  {activeChatId !== null ? activeChat?.title : "New Conversation"}
                </h2>
                <div className="flex items-center gap-2 mt-1">
                  <div className="relative flex items-center justify-center">
                    <Circle className="w-2 h-2 fill-emerald-500 text-emerald-500" />
                    <div className="absolute inset-0 w-2 h-2 bg-emerald-500 rounded-full animate-ping opacity-75" />
                  </div>
                  <span className="text-[10px] uppercase font-black text-white/30 tracking-[2px]">AI Engine Active</span>
                </div>
              </div>
            </div>
            {activeChatId !== null && (
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 text-white/20 hover:text-red-400 hover:bg-red-400/10 rounded-2xl border border-transparent hover:border-red-400/20 transition-all"
                onClick={() => handleDelete(activeChatId)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>

          {/* Messages Wrapper */}
          <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col items-center relative">
            {activeChatId === null ? (
              <div className="flex-1 flex flex-col items-center justify-center p-10 text-center max-w-lg">
                <motion.div
                  initial={{ opacity: 0, scale: 0.8, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  className="w-24 h-24 bg-gradient-to-tr from-primary/20 to-violet-500/20 rounded-[3rem] flex items-center justify-center mb-10 border border-white/10 shadow-[0_0_50px_rgba(139,92,246,0.15)]"
                >
                  <Bot className="w-12 h-12 text-primary" />
                </motion.div>
                <motion.h3
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="text-4xl font-black mb-6 tracking-tighter"
                >
                  How can I help you <span className="text-primary">today?</span>
                </motion.h3>
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-white/40 text-base leading-relaxed mb-12 font-medium"
                >
                  I'm your DocMind AI assistant. Select a conversation from the history or start typing to begin a new one.
                </motion.p>
                <div className="grid grid-cols-2 gap-4 w-full opacity-50">
                  {["Summarize this PDF", "Explain the concepts", "Analyze the data", "Find specific info"].map((text, i) => (
                    <div key={i} className="p-4 rounded-2xl border border-white/5 bg-white/[0.02] text-[13px] font-bold text-white/40 text-left hover:bg-white/5 cursor-default transition-colors">
                      {text}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="w-full max-w-4xl px-8 py-16 space-y-16">
                <AnimatePresence mode="popLayout">
                  {activeChat?.messages?.map((msg: any) => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, scale: 0.98, y: 20 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      className={cn("flex gap-8", msg.role === "user" ? "flex-row-reverse" : "flex-row")}
                    >
                      <div className={cn(
                        "w-12 h-12 rounded-[1.25rem] flex items-center justify-center shrink-0 border mt-1 shadow-2xl transition-transform hover:scale-110 duration-300",
                        msg.role === "user" ? "bg-primary/20 border-primary/30" : "bg-orange-500/10 border-orange-500/20"
                      )}>
                        {msg.role === "user" ? <UserIcon className="w-5 h-5 text-primary" /> : <Bot className="w-5 h-5 text-orange-400" />}
                      </div>
                      <div className={cn("flex-1 min-w-0 max-w-[85%]", msg.role === "assistant" ? "text-left" : "text-right")}>
                        <div className={cn(
                          "text-[16px] leading-[1.8] text-white/95 font-medium",
                          msg.role === "user"
                            ? "bg-white/[0.04] px-7 py-5 rounded-[2rem] rounded-tr-none border border-white/10 inline-block text-left shadow-2xl"
                            : "bg-transparent py-2"
                        )}>
                          <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
                            code({ node, inline, className, children, ...props }: any) {
                              const match = /language-(\w+)/.exec(className || '');
                              return !inline && match ? (
                                <div className="my-8 rounded-[2rem] overflow-hidden border border-white/10 bg-black shadow-3xl">
                                  <div className="bg-[#111] px-6 py-3 border-b border-white/10 flex items-center justify-between">
                                    <span className="text-[10px] font-black uppercase text-white/40 tracking-widest">{match[1]}</span>
                                  </div>
                                  <SyntaxHighlighter style={oneDark} language={match[1]} PreTag="div" customStyle={{ margin: 0, padding: '2rem', background: 'transparent', fontSize: '15px', lineHeight: '1.6' }}>
                                    {String(children).replace(/\n$/, '')}
                                  </SyntaxHighlighter>
                                </div>
                              ) : <code className="bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-lg font-mono text-[14px]" {...props}>{children}</code>;
                            },
                            p: ({ children }) => <p className="mb-5 last:mb-0">{children}</p>,
                            ul: ({ children }) => <ul className="list-disc pl-8 mb-5 space-y-3 marker:text-primary/50">{children}</ul>,
                            ol: ({ children }) => <ol className="list-decimal pl-8 mb-5 space-y-3 marker:text-primary/50">{children}</ol>,
                            h1: ({ children }) => <h1 className="text-2xl font-black mb-6 mt-10 text-white tracking-tighter">{children}</h1>,
                            h2: ({ children }) => <h2 className="text-xl font-black mb-5 mt-8 text-white tracking-tighter">{children}</h2>,
                          }}>
                            {msg.content}
                          </ReactMarkdown>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                {isSending && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex gap-8">
                    <div className="w-12 h-12 rounded-[1.25rem] bg-orange-400/10 border border-orange-400/20 flex items-center justify-center shadow-xl">
                      <Bot className="w-5 h-5 text-orange-400 animate-pulse" />
                    </div>
                    <div className="flex gap-2.5 py-6 items-center">
                      <div className="w-3 h-3 rounded-full bg-primary animate-bounce shadow-[0_0_15px_rgba(139,92,246,0.5)]" />
                      <div className="w-3 h-3 rounded-full bg-primary animate-bounce delay-100 shadow-[0_0_15px_rgba(139,92,246,0.5)]" />
                      <div className="w-3 h-3 rounded-full bg-primary animate-bounce delay-200 shadow-[0_0_15px_rgba(139,92,246,0.5)]" />
                    </div>
                  </motion.div>
                )}
                <div ref={messagesEndRef} className="h-20" />
              </div>
            )}
          </div>

          {/* --- SLIM & LUXURY INPUT --- */}
          <div className="p-10 pb-14 bg-gradient-to-t from-[#0d0d0d] via-[#0d0d0d]/95 to-transparent relative z-10">
            <div className="max-w-3xl mx-auto group">
              <div className="bg-[#151515] rounded-[2.5rem] border border-white/10 flex items-end p-2.5 px-8 focus-within:border-primary/50 transition-all duration-500 shadow-3xl group-hover:border-white/20 relative overflow-hidden">
                {/* Input Glow */}
                <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />

                <textarea
                  ref={textareaRef}
                  rows={1}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  placeholder="Message DocMind..."
                  className="flex-1 bg-transparent border-none focus:outline-none py-4 text-white text-[17px] placeholder:text-white/20 resize-none min-h-[48px] max-h-[150px] custom-scrollbar leading-relaxed font-medium"
                />
                <div className="pb-3.5 ml-4">
                  <button
                    onClick={() => handleSend()}
                    disabled={isSending || creatingChat || !inputValue.trim()}
                    className={cn(
                      "p-3 rounded-[1.25rem] transition-all duration-300 active:scale-90 disabled:opacity-20",
                      inputValue.trim()
                        ? "bg-white text-black shadow-[0_0_30px_rgba(255,255,255,0.3)] hover:scale-110"
                        : "bg-white/5 text-white/10"
                    )}
                  >
                    <ArrowUp className="w-6 h-6" strokeWidth={3} />
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-center gap-6 mt-6">
                <p className="text-[10px] text-white/20 font-black tracking-[4px] uppercase">Neural Processor v2.1</p>
                <div className="w-1 h-1 rounded-full bg-white/10" />
                <p className="text-[10px] text-white/20 font-black tracking-[4px] uppercase">Document Privacy Enabled</p>
              </div>
            </div>
          </div>

        </div>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.06); border-radius: 20px; }
        .shadow-glow { filter: drop-shadow(0 0 10px rgba(139, 92, 246, 0.4)); }
      `}} />
    </DashboardLayout>
  );
}
