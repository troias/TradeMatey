"use client";

import React from "react";
import { CheckCircle, Clock, CreditCard, Circle } from "lucide-react";

type Props = {
  status?: string | null;
  isCurrent?: boolean;
  size?: "sm" | "md" | "lg";
};

export default function MilestoneBadge({
  status,
  isCurrent,
  size = "md",
}: Props) {
  const classes = {
    sm: "px-2 py-0.5 text-sm",
    md: "px-3 py-1 text-sm",
    lg: "px-4 py-1.5 text-base",
  }[size];

  let bg = "bg-gray-50 dark:bg-gray-800 text-gray-700";
  let Icon = Circle;
  if (status === "verified") {
    bg = "bg-green-50 dark:bg-green-900 text-green-800";
    Icon = CheckCircle;
  } else if (status === "pending") {
    bg = "bg-yellow-50 dark:bg-yellow-900 text-yellow-800";
    Icon = CreditCard;
  } else if (status === "completed") {
    bg = "bg-yellow-50 dark:bg-yellow-900 text-orange-800";
    Icon = Clock;
  } else if (isCurrent) {
    bg = "bg-green-50 dark:bg-green-900 text-green-800";
    Icon = CheckCircle;
  }

  return (
    <div
      role="status"
      className={`${classes} ${bg} inline-flex items-center rounded-full gap-2 font-semibold transition-all duration-200 ease-out transform hover:scale-105`}
    >
      <Icon size={16} />
      <span>
        {status === "verified"
          ? "Paid"
          : status === "pending"
          ? "Pending"
          : status === "completed"
          ? "Completed"
          : isCurrent
          ? "Current"
          : "Upcoming"}
      </span>
    </div>
  );
}
