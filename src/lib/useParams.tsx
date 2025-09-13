import React from "react";

/**
 * Safe helper to unwrap Next.js App Router `params` which may be a Promise
 * in newer React/Next versions. Uses `React.use()` when available.
 */
export function useParams<T extends Record<string, unknown> | undefined>(
  params: T | Promise<T> | undefined
): T | undefined {
  // Use React.use() if available (newer React/Next behaviour). We cast to
  // unknown to avoid loosening type-checking with `any` and to appease
  // strict linting rules in the repo.
  if (typeof (React as unknown as { use?: unknown }).use === "function") {
    try {
      return (React as unknown as { use: (p: unknown) => unknown }).use(
        params as unknown
      ) as T | undefined;
    } catch {
      // Fall back to the raw value if unwrapping fails
    }
  }
  return params as unknown as T | undefined;
}

export default useParams;
