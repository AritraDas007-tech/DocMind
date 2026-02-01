import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background text-center p-4">
      <div className="p-4 rounded-full bg-red-500/10 text-red-400 mb-6">
        <AlertTriangle className="w-12 h-12" />
      </div>
      <h1 className="text-4xl font-display font-bold text-white mb-4">Page Not Found</h1>
      <p className="text-muted-foreground max-w-md mb-8">
        The page you are looking for doesn't exist or has been moved.
      </p>
      <Link href="/">
        <Button size="lg" className="bg-primary text-white">Return Home</Button>
      </Link>
    </div>
  );
}
