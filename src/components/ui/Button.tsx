"use client";
import { cva, type VariantProps } from "class-variance-authority";

const buttonVariants = cva("px-4 py-2 rounded-md", {
  variants: {
    variant: {
      default: "bg-blue-600 text-white",
      outline: "border border-gray-300",
    },
  },
  defaultVariants: { variant: "default" },
});

export function Button({
  className,
  variant,
  ...props
}: VariantProps<typeof buttonVariants> & { children: React.ReactNode }) {
  return (
    <button className={buttonVariants({ variant, className })} {...props} />
  );
}
