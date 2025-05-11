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
      className={cn("p-4 border rounded-md shadow-sm", className)}
      {...props}
    >
      {children}
    </div>
  );
}
