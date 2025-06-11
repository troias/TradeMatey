"use client";

import { ButtonHTMLAttributes, forwardRef } from "react";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "outline" | "destructive";
  isLoading?: boolean;
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", isLoading, children, ...props }, ref) => {
    const baseStyles =
      "px-4 py-2 rounded-md font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50";
    const variantStyles = {
      default:
        "bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500",
      outline:
        "border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-900 dark:text-gray-100",
      destructive: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500",
    };

    return (
      <button
        ref={ref}
        className={`${baseStyles} ${variantStyles[variant]} ${className} ${
          isLoading ? "opacity-75" : ""
        }`}
        disabled={isLoading}
        {...props}
      >
        {isLoading ? "Loading..." : children}
      </button>
    );
  }
);

Button.displayName = "Button";
export { Button };
