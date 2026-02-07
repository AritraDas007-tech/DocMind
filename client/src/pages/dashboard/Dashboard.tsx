import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { GlassCard } from "@/components/ui/glass-card";
import { useDocuments } from "@/hooks/use-documents";
import { useChats } from "@/hooks/use-chats";
import { FileText, MessageSquare, TrendingUp, Clock } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from "recharts";

const data = [
  { name: 'Mon', queries: 4 },
  { name: 'Tue', queries: 7 },
  { name: 'Wed', queries: 3 },
  { name: 'Thu', queries: 12 },
  { name: 'Fri', queries: 9 },
  { name: 'Sat', queries: 15 },
  { name: 'Sun', queries: 8 },
];

export default function Dashboard() {
  const { data: documents } = useDocuments();
  const { data: chats } = useChats();

  const stats = [
    { label: "Total Documents", value: documents?.length || 0, icon: FileText, color: "text-blue-400" },
    { label: "Active Chats", value: chats?.length || 0, icon: MessageSquare, color: "text-purple-400" },
    { label: "Queries Today", value: "24", icon: TrendingUp, color: "text-green-400" },
    { label: "Processing Time", value: "0.4s", icon: Clock, color: "text-orange-400" },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-2">
        <h1 className="text-3xl font-display font-bold text-white">Dashboard Overview</h1>
        <p className="text-muted-foreground">Welcome back, here's what's happening today.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <GlassCard key={i} className="p-6 flex items-center gap-4" hoverEffect>
            <div className={`p-3 rounded-xl bg-white/5 ${stat.color}`}>
              <stat.icon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <p className="text-2xl font-bold text-white">{stat.value}</p>
            </div>
          </GlassCard>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="grid lg:grid-cols-3 gap-6 h-96">
        {/* Chart */}
        <GlassCard className="lg:col-span-2 p-6 flex flex-col">
          <h3 className="text-lg font-bold text-white mb-6">Activity Usage</h3>
          <div className="flex-1 min-h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="colorQueries" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" stroke="#525252" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#525252" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#171717', borderColor: '#262626', borderRadius: '8px', color: '#fff' }}
                />
                <Area type="monotone" dataKey="queries" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorQueries)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        {/* Recent Activity */}
        <GlassCard className="p-6">
          <h3 className="text-lg font-bold text-white mb-4">Recent Uploads</h3>
          <div className="space-y-4">
            {documents?.slice(0, 5).map((doc) => (
              <div key={doc.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors cursor-pointer">
                <div className="p-2 rounded bg-blue-500/10 text-blue-400">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="flex-1 overflow-hidden">
                  <p className="text-sm font-medium text-white truncate">{doc.name}</p>
                  <p className="text-xs text-muted-foreground">{(doc.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              </div>
            ))}
            {(!documents || documents.length === 0) && (
              <p className="text-sm text-muted-foreground text-center py-8">No documents yet.</p>
            )}
          </div>
        </GlassCard>
      </div>
    </DashboardLayout>
  );
}
