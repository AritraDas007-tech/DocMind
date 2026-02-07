import { useChats } from "@/hooks/use-chats";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { GlassCard } from "@/components/ui/glass-card";
import { MessageSquare, Calendar, ArrowRight, Loader2, Bot } from "lucide-react";
import { format } from "date-fns";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";

export default function HistoryPage() {
    const { data: chats, isLoading } = useChats();
    const [, setLocation] = useLocation();

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-display font-bold text-white">Activity History</h1>
                    <p className="text-muted-foreground">View your past conversations and document interactions</p>
                </div>

                {isLoading ? (
                    <div className="text-center py-20">
                        <Loader2 className="w-10 h-10 animate-spin mx-auto text-primary" />
                    </div>
                ) : !chats || chats.length === 0 ? (
                    <GlassCard className="p-10 text-center flex flex-col items-center justify-center min-h-[400px]">
                        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                            <History className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">No History Yet</h3>
                        <p className="text-muted-foreground max-w-sm mb-6">
                            Start chatting with your documents to build up your history.
                        </p>
                        <Link href="/dashboard/documents">
                            <Button className="bg-primary hover:bg-primary/90 text-white">
                                Go to Documents
                            </Button>
                        </Link>
                    </GlassCard>
                ) : (
                    <div className="grid gap-4">
                        {chats.map((chat) => (
                            <GlassCard
                                key={chat.id}
                                className="p-5 flex items-center justify-between group hover:border-primary/50 transition-all cursor-pointer"
                                onClick={() => setLocation(`/dashboard/chat?id=${chat.id}`)}
                            >
                                <div className="flex items-center gap-5">
                                    <div className="w-12 h-12 rounded-xl bg-violet-500/10 text-violet-400 flex items-center justify-center group-hover:bg-violet-500/20 transition-colors">
                                        <Bot className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-white text-lg group-hover:text-primary transition-colors">
                                            {chat.title}
                                        </h3>
                                        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                                            <span className="flex items-center gap-1">
                                                <Calendar className="w-3 h-3" />
                                                {chat.lastActivity ? format(new Date(chat.lastActivity), 'PPP p') : 'Unknown date'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <Button variant="ghost" className="text-muted-foreground group-hover:text-white">
                                    Resume Chat <ArrowRight className="w-4 h-4 ml-2" />
                                </Button>
                            </GlassCard>
                        ))}
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}

function History(props: any) {
    return <Calendar {...props} />; // Just a placeholder to avoid import error if used above incorrectly
}
