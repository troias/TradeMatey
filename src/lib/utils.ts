// ./src/lib/utils.ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

console.log("utils.ts loaded"); // Debug log
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
