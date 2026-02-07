import { useState, useRef } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { useDocuments, useUploadDocument, useDeleteDocument } from "@/hooks/use-documents";
import { FileText, Trash2, UploadCloud, Loader2, Plus, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

export default function Documents() {
  const { data: documents, isLoading } = useDocuments();
  const { mutate: upload, isPending: isUploading } = useUploadDocument();
  const { mutate: deleteDoc } = useDeleteDocument();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const formData = new FormData();
      Array.from(e.target.files).forEach((file) => {
        formData.append("files", file);
      });

      upload(formData, {
        onSuccess: () => {
          toast({ title: "Success", description: "Documents uploaded and processed successfully" });
        },
        onError: (err) => {
          toast({ title: "Error", description: err.message, variant: "destructive" });
        },
      });
    }
  };

  return (
    <DashboardLayout>
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-display font-bold text-white">Documents</h1>
          <p className="text-muted-foreground">Manage and analyze your knowledge base</p>
        </div>
        <Button
          onClick={() => fileInputRef.current?.click()}
          className="bg-primary hover:bg-primary/90 gap-2"
          disabled={isUploading}
        >
          {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Upload Files
        </Button>
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          multiple
          accept=".pdf,.txt"
          onChange={handleFileChange}
        />
      </div>

      {/* Upload Drop Area */}
      <GlassCard
        className="border-dashed border-2 border-white/10 hover:border-primary/50 transition-colors cursor-pointer p-10 flex flex-col items-center justify-center text-center group"
        onClick={() => fileInputRef.current?.click()}
      >
        <div className="p-4 rounded-full bg-white/5 group-hover:bg-primary/10 transition-colors mb-4">
          <UploadCloud className="w-8 h-8 text-muted-foreground group-hover:text-primary transition-colors" />
        </div>
        <h3 className="text-lg font-medium text-white">Click to upload files</h3>
        <p className="text-sm text-muted-foreground mt-1">Supported formats: PDF, TXT (Max 200MB)</p>
      </GlassCard>

      {/* Document List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">Your Files</h2>
          <Button variant="ghost" size="sm" onClick={() => window.location.reload()} className="text-xs">
            Refresh List
          </Button>
        </div>

        {isUploading && (
          <GlassCard className="p-4 flex items-center gap-4 animate-pulse">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
            <span className="text-white">Processing your documents... This may take a moment.</span>
          </GlassCard>
        )}

        {isLoading ? (
          <div className="text-center py-10"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" /></div>
        ) : !documents || documents.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            No documents uploaded yet. Try uploading a PDF or TXT file.
          </div>
        ) : (
          <div className="grid gap-4">
            {documents.map((doc) => (
              <GlassCard key={doc.id} className="p-4 flex items-center justify-between group hoverEffect">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-blue-500/10 text-blue-400">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-medium text-white text-lg">{doc.name}</h4>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                      <span>{(doc.size / 1024 / 1024).toFixed(2)} MB</span>
                      <span>•</span>
                      <span>{doc.createdAt ? format(new Date(doc.createdAt), 'MMM d, yyyy') : 'Just now'}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-primary hover:text-primary/80 hover:bg-primary/10"
                    onClick={async (e) => {
                      e.stopPropagation();
                      try {
                        // We need to create a chat or navigate to it.
                        // Ideally, we should check if a chat exists or just create a new one.
                        // For simplicity in this UI, let's just create a new chat context.
                        // But since the API requires creating a chat entity first:
                        const res = await fetch("/api/chats", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ title: `Chat about ${doc.name}`, documentId: doc.id })
                        });
                        if (res.ok) {
                          const chat = await res.json();
                          window.location.href = `/dashboard/chat?id=${chat.id}`;
                        } else {
                          toast({ title: "Error", description: "Failed to start chat", variant: "destructive" });
                        }
                      } catch (err) {
                        console.error(err);
                      }
                    }}
                  >
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Chat
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-red-400 hover:bg-red-500/10"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm("Delete this document?")) deleteDoc(doc.id);
                    }}
                  >
                    <Trash2 className="w-5 h-5" />
                  </Button>
                </div>
              </GlassCard>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
