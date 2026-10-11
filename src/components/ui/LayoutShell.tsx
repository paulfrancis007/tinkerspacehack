"use client";

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Compass, User, Camera } from 'lucide-react';

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLanding = pathname === '/';

  if (isLanding) {
    return <>{children}</>;
  }

  const navItems = [
    { label: 'Lounge', href: '/journey', icon: Compass },
            { label: 'Travelogue', href: '/travelogue', icon: Camera },
    { label: 'Me', href: '/dashboard', icon: User },
  ];

  return (
    <div className="flex flex-col md:flex-row min-h-[100dvh] bg-background text-foreground">
      {/* Desktop Rail */}
      <nav className="hidden md:flex flex-col w-24 bg-panel border-r border-foreground/10 py-8 items-center gap-8">
        <Link href="/" className="font-bold text-primary mb-8" aria-label="SIDEQUEST Home">
          SQ
        </Link>
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-colors ${
              pathname.startsWith(item.href) ? 'text-primary' : 'text-foreground/70 hover:text-foreground'
            }`}
          >
            <item.icon size={24} aria-hidden="true" />
            <span className="text-xs">{item.label}</span>
          </Link>
        ))}
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 overflow-auto pb-[80px] md:pb-0">
        <div className="max-w-[1280px] mx-auto w-full h-full p-4 md:p-8">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-[80px] bg-panel border-t border-foreground/10 flex justify-around items-center px-4 safe-area-bottom z-50">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center p-2 min-w-[64px] min-h-[48px] justify-center transition-colors ${
              pathname.startsWith(item.href) ? 'text-primary' : 'text-foreground/70 hover:text-foreground'
            }`}
          >
            <item.icon size={24} aria-hidden="true" />
            <span className="text-[10px] mt-1">{item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}

