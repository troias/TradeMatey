"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export function Messages({ userId }) {
  const [messages, setMessages] = useState([]);
  useEffect(() => {
    const channel = supabase
      .channel("messages")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          setMessages((prev) => [...prev, payload.new]);
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="p-4">
      {messages.map((msg) => (
        <div key={msg.id} className="p-2 border-b">
          {msg.content}
        </div>
      ))}
    </div>
  );
}
