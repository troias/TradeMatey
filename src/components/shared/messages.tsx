"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui";

export function Messages({ userId, jobId }: { userId: string; jobId: string }) {
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");

  useEffect(() => {
    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from("messages")
        .select(
          "*, sender:users!sender_id(name), receiver:users!receiver_id(name)"
        )
        .eq("job_id", jobId);
      if (!error) setMessages(data || []);
    };
    fetchMessages();

    const channel = supabase
      .channel("messages")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `job_id=eq.${jobId}`,
        },
        (payload) => setMessages((prev) => [...prev, payload.new])
      )
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [jobId]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: job } = await supabase
      .from("jobs")
      .select("client_id, tradie_id")
      .eq("id", jobId)
      .single();
    const receiverId = userId === job.client_id ? job.tradie_id : job.client_id;
    const { error } = await supabase.from("messages").insert([
      {
        sender_id: userId,
        receiver_id: receiverId,
        content: newMessage,
        job_id: jobId,
      },
    ]);
    if (!error) setNewMessage("");
    else toast.error("Failed to send message");
  };

  return (
    <div className="p-4">
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {messages.map((msg) => (
          <div key={msg.id} className="p-2 border-b">
            <p className="font-semibold">{msg.sender.name}:</p>
            <p>{msg.content}</p>
            <p className="text-sm text-gray-500">
              {new Date(msg.created_at).toLocaleString()}
            </p>
          </div>
        ))}
      </div>
      <form onSubmit={sendMessage} className="mt-4 flex space-x-2">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          className="flex-grow p-2 border rounded"
          placeholder="Type a message..."
          required
        />
        <Button type="submit">Send</Button>
      </form>
    </div>
  );
}
