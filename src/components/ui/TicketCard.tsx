import * as React from 'react';

export type TicketCardProps = React.HTMLAttributes<HTMLDivElement>;

export function TicketCard({ className = '', children, ...props }: TicketCardProps) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl bg-foreground text-background p-6 shadow-lg ${className}`}
      {...props}
    >
      {/* Decorative perforations */}
      <div className="absolute top-0 bottom-0 left-0 flex flex-col justify-between py-2 -translate-x-1/2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="w-3 h-3 rounded-full bg-background" />
        ))}
      </div>
      <div className="absolute top-0 bottom-0 right-0 flex flex-col justify-between py-2 translate-x-1/2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="w-3 h-3 rounded-full bg-background" />
        ))}
      </div>
      {/* Content */}
      <div className="relative z-10 px-2">
        {children}
      </div>
    </div>
  );
}

