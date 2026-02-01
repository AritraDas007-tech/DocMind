import { useState } from "react";
import { useLocation } from "wouter";
import { useVerifyOtp } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GlassCard } from "@/components/ui/glass-card";
import { Loader2, ShieldCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function VerifyOtp() {
  const [location] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const email = searchParams.get("email");

  const [otp, setOtp] = useState("");
  const { mutate: verify, isPending } = useVerifyOtp();
  const { toast } = useToast();

  if (!email) {
    return <div className="text-white text-center pt-20">Invalid request. Email missing.</div>;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    verify(
      { email, otp },
      {
        onSuccess: () => {
          toast({ title: "Success", description: "Email verified! Please login." });
        },
        onError: (error) => {
          toast({
            title: "Verification Failed",
            description: error.message,
            variant: "destructive",
          });
        },
      }
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <GlassCard className="w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="inline-flex p-3 rounded-xl bg-primary/20 mb-4">
            <ShieldCheck className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-display font-bold text-white mb-2">Verify Email</h1>
          <p className="text-muted-foreground">
            We sent a code to <span className="text-white font-medium">{email}</span>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="otp">Enter 6-digit Code</Label>
            <Input
              id="otp"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              className="bg-white/5 border-white/10 focus:border-primary/50 text-white text-center text-2xl tracking-widest h-14"
              placeholder="000000"
              maxLength={6}
              required
            />
          </div>

          <Button 
            type="submit" 
            disabled={isPending || otp.length !== 6}
            className="w-full h-11 bg-primary hover:bg-primary/90 text-white font-medium"
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Verify Account
          </Button>
        </form>
      </GlassCard>
    </div>
  );
}
