"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/Providers";
import { useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "react-hot-toast";

export default function ClientMessages() {
  const { user } = useAuth();
  interface Message {
    id: string;
    content: string;
    created_at?: string;
  }
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [selectedJobId, setSelectedJobId] = useState("");

  const { data, error, isLoading } = useQuery({
    queryKey: ["clientMessages", user?.id],
    queryFn: async () => {
      const res = await fetch(`/api/messages?user_id=${user?.id}`);
      if (!res.ok) throw new Error("Failed to fetch messages");
      return res.json();
    },
  });

  const mutation = useMutation({
    mutationFn: async ({
      receiverId,
      jobId,
    }: {
      receiverId: string;
      jobId: string;
    }) => {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sender_id: user?.id,
          receiver_id: receiverId,
          content: newMessage,
          job_id: jobId,
        }),
      });
      if (!res.ok) throw new Error("Failed to send message");
      return res.json();
    },
    onSuccess: (newMsg) => {
      setMessages([...messages, newMsg]);
      setNewMessage("");
      toast.success("Message sent!");
    },
    onError: (err: unknown) =>
      toast.error(err instanceof Error ? err.message : "Failed"),
  });

  useEffect(() => {
    if (data) setMessages(data);
    if (error) toast.error(error.message);
  }, [data, error]);

  if (isLoading) return <div className="text-center py-10">Loading...</div>;

  const lastMsg = messages.length > 0 ? messages[messages.length - 1] : null;
  const receiverId =
    lastMsg?.sender_id !== user?.id ? lastMsg?.sender_id : lastMsg?.receiver_id;

  return (
    <div className="space-y-6 max-w-2xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
        Messages
      </h1>
      <div className="space-y-4 max-h-96 overflow-y-auto">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`p-4 rounded-lg max-w-lg ${
              msg.sender_id === user?.id
                ? "bg-indigo-100 dark:bg-indigo-900 ml-auto"
                : "bg-gray-100 dark:bg-gray-800 mr-auto"
            }`}
          >
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {msg.sender_id === user?.id ? "You" : msg.sender.name} to{" "}
              {msg.sender_id === user?.id ? msg.receiver.name : "You"}
            </p>
            <p className="text-gray-900 dark:text-gray-100">{msg.content}</p>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
              {new Date(msg.created_at).toLocaleString()}
            </p>
          </div>
        ))}
      </div>
      <div className="flex space-x-2">
        <select
          value={selectedJobId}
          onChange={(e) => setSelectedJobId(e.target.value)}
          className="w-1/3 rounded-md border-gray-300 dark:border-gray-600 focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white p-2"
        >
          <option value="">Select Job</option>
          {/* Assume jobs are fetched or stored in context */}
          <option value="job1">Job 1</option>
          <option value="job2">Job 2</option>
        </select>
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 rounded-md border-gray-300 dark:border-gray-600 focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white p-2"
        />
        <button
          onClick={() =>
            mutation.mutate({
              receiverId: receiverId || "",
              jobId: selectedJobId,
            })
          }
          disabled={
            !newMessage ||
            !receiverId ||
            !selectedJobId ||
            mutation.status === "pending"
          }
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-gray-400 dark:disabled:bg-gray-600 transition-colors"
        >
          {mutation.status === "pending" ? "Sending..." : "Send"}
        </button>
      </div>
    </div>
  );
}
