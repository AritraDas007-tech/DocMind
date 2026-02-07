import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { type Chat, type Message } from "@shared/schema";

export function useChats() {
  return useQuery({
    queryKey: [api.chats.list.path],
    queryFn: async () => {
      const res = await fetch(api.chats.list.path);
      if (!res.ok) throw new Error("Failed to fetch chats");
      return await res.json() as Chat[];
    },
  });
}

export function useChat(id: number) {
  return useQuery({
    queryKey: [api.chats.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.chats.get.path, { id });
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch chat");
      return await res.json() as (Chat & { messages: Message[] });
    },
    enabled: id !== null,
  });
}

export function useCreateChat() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { documentId: number; title: string }) => {
      const res = await fetch(api.chats.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) throw new Error("Failed to create chat");
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.chats.list.path] });
    },
  });
}

export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ chatId, content, documentIds }: { chatId: number; content: string; documentIds?: number[] }) => {
      const url = buildUrl(api.chats.sendMessage.path, { id: chatId });
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, documentIds }),
      });

      if (!res.ok) throw new Error("Failed to send message");

      // Handle streaming response if applicable, for now assuming JSON or text stream handled by backend
      // Ideally we would return a reader, but for simplicity in this generated code we'll assume JSON response for now
      // or handle the stream directly in the component if needed.
      // Since the prompt schema implies a simpler request/response for now (or basic stream):
      return await res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [api.chats.get.path, variables.chatId] });
    },
  });
}

export function useDeleteChat() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.chats.delete.path, { id });
      const res = await fetch(url, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete chat");
      return await res.json();
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: [api.chats.list.path] });
      queryClient.removeQueries({ queryKey: [api.chats.get.path, id] });
    },
  });
}
