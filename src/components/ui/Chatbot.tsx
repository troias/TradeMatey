"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

export function Chatbot() {
  const [messages, setMessages] = useState<{ role: string; content: string }[]>(
    []
  );
  const [input, setInput] = useState("");

  const sendMessage = async () => {
    setMessages([...messages, { role: "user", content: input }]);
    const res = await fetch("/api/support", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: input }),
    });
    const { reply } = await res.json();
    setMessages([
      ...messages,
      { role: "user", content: input },
      { role: "bot", content: reply },
    ]);
    setInput("");
  };

  return (
    <div className="fixed bottom-4 right-4 w-80 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg">
      <div className="max-h-64 overflow-y-auto space-y-2">
        {messages.map((msg, i) => (
          <div key={i} className={msg.role === "user" ? "text-right" : ""}>
            <p className="p-2 rounded bg-gray-100 dark:bg-gray-700">
              {msg.content}
            </p>
          </div>
        ))}
      </div>
      <div className="mt-2 flex">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-grow p-2 border rounded-l dark:bg-gray-700"
          placeholder="Ask a question..."
        />
        <Button onClick={sendMessage} className="rounded-l-none">
          Send
        </Button>
      </div>
    </div>
  );
}
