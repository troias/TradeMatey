"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { toast } from "react-hot-toast";
import { Button } from "@/components/ui";

export function Notifications({ userId }: { userId: string }) {
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    const fetchNotifications = async () => {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .eq("is_read", false);
      setNotifications(data || []);
    };
    fetchNotifications();

    const channel = supabase
      .channel("notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          setNotifications((prev) => [...prev, payload.new]);
          toast.success(payload.new.message);
        }
      )
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [userId]);

  const markAsRead = async (notificationId: string) => {
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", notificationId);
    setNotifications(notifications.filter((n) => n.id !== notificationId));
  };

  return (
    <div className="p-4">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className="p-2 border-b flex justify-between"
        >
          <p>{notification.message}</p>
          <Button onClick={() => markAsRead(notification.id)} variant="outline">
            Mark as Read
          </Button>
        </div>
      ))}
    </div>
  );
}
