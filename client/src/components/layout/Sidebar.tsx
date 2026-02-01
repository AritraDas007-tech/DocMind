import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  UploadCloud, 
  MessageSquare, 
  History, 
  User, 
  LogOut,
  BrainCircuit,
  Menu,
  X
} from "lucide-react";
import { useState } from "react";
import { useLogout } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
  { icon: UploadCloud, label: "Documents", href: "/dashboard/documents" },
  { icon: MessageSquare, label: "Chat", href: "/dashboard/chat" },
  { icon: History, label: "History", href: "/dashboard/history" },
  { icon: User, label: "Profile", href: "/dashboard/profile" },
];

export function Sidebar() {
  const [location] = useLocation();
  const { mutate: logout } = useLogout();
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => setIsOpen(!isOpen);

  return (
    <>
      {/* Mobile Menu Button */}
      <button 
        onClick={toggleMenu}
        className="lg:hidden fixed top-4 right-4 z-50 p-2 rounded-full bg-primary/20 text-primary border border-primary/30 backdrop-blur-md"
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Sidebar Container */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-40 w-64 transform transition-transform duration-300 ease-in-out lg:translate-x-0 bg-black/40 backdrop-blur-xl border-r border-white/10",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full p-6">
          {/* Logo */}
          <div className="flex items-center gap-3 px-2 mb-10">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-primary to-violet-400 shadow-lg shadow-primary/25">
              <BrainCircuit className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-display font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
              DocMind
            </span>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-2">
            {navItems.map((item) => {
              const isActive = location === item.href || (location.startsWith(item.href) && item.href !== "/dashboard");
              return (
                <Link key={item.href} href={item.href} className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group relative overflow-hidden",
                    isActive 
                      ? "bg-primary/20 text-white shadow-lg shadow-primary/10 border border-primary/20" 
                      : "text-muted-foreground hover:text-white hover:bg-white/5"
                  )}>
                    <item.icon className={cn("w-5 h-5 transition-colors", isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-primary")} />
                    <span className="font-medium relative z-10">{item.label}</span>
                    {isActive && (
                      <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent rounded-xl" />
                    )}
                </Link>
              );
            })}
          </nav>

          {/* Logout */}
          <div className="mt-auto pt-6 border-t border-white/10">
            <Button 
              variant="ghost" 
              onClick={() => logout()}
              className="w-full flex items-center justify-start gap-3 px-4 py-3 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl"
            >
              <LogOut className="w-5 h-5" />
              <span>Sign Out</span>
            </Button>
          </div>
        </div>
      </aside>

      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
