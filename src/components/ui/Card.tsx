"use client";
import { cn } from "@/lib/utils";
export function Card({
  children,
  className,
  ...props
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "bg-white/80 dark:bg-gray-800/70 backdrop-blur-sm border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-6",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
