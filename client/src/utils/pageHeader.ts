import type { ReactNode } from 'react';

// PageHeader.eyebrow is typed as string in the package but accepts ReactNode at runtime.
// This helper centralizes the cast so views don't need inline double-casts.
export function asEyebrow(content: ReactNode): string {
  return content as unknown as string;
}
