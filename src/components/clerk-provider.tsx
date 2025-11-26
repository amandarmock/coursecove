'use client';

import { ClerkProvider as BaseClerkProvider } from '@clerk/nextjs';
import { dark } from '@clerk/themes';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

export function ClerkProvider({ children }: { children: React.ReactNode }) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <BaseClerkProvider
      appearance={{
        baseTheme: mounted && resolvedTheme === 'dark' ? dark : undefined,
      }}
    >
      {children}
    </BaseClerkProvider>
  );
}
