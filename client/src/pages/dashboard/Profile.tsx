import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { GlassCard } from "@/components/ui/glass-card";
import { useUser } from "@/hooks/use-auth";
import { User, Mail, ShieldCheck, Calendar } from "lucide-react";
import { format } from "date-fns";

export default function Profile() {
  const { user } = useUser();

  if (!user) return null;

  return (
    <DashboardLayout>
      <h1 className="text-3xl font-display font-bold text-white mb-6">Profile Settings</h1>

      <div className="grid md:grid-cols-3 gap-8">
        {/* User Card */}
        <GlassCard className="col-span-1 p-6 text-center space-y-4">
          <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-tr from-primary to-purple-400 p-[2px]">
            <div className="w-full h-full rounded-full bg-black flex items-center justify-center">
              <span className="text-4xl font-bold text-white">{user.name.charAt(0)}</span>
            </div>
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">{user.name}</h2>
            <p className="text-muted-foreground text-sm">Free Plan</p>
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/20 text-green-400 text-xs font-medium">
            <ShieldCheck size={14} />
            Verified Account
          </div>
        </GlassCard>

        {/* Details Form (Read Only for Demo) */}
        <GlassCard className="md:col-span-2 p-8">
          <h3 className="text-lg font-bold text-white mb-6 border-b border-white/10 pb-4">Account Information</h3>
          
          <div className="space-y-6">
            <div className="grid gap-2">
              <label className="text-sm font-medium text-muted-foreground">Full Name</label>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10 text-white">
                <User size={18} className="text-muted-foreground" />
                {user.name}
              </div>
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium text-muted-foreground">Email Address</label>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10 text-white">
                <Mail size={18} className="text-muted-foreground" />
                {user.email}
              </div>
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium text-muted-foreground">Member Since</label>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10 text-white">
                <Calendar size={18} className="text-muted-foreground" />
                {/* Fallback date if createdAt missing in user type for frontend */}
                {format(new Date(), 'MMMM d, yyyy')} 
              </div>
            </div>
          </div>
        </GlassCard>
      </div>
    </DashboardLayout>
  );
}
