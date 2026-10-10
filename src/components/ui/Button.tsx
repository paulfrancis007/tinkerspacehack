import * as React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'primary', ...props }, ref) => {
    let variantStyles = '';
    
    switch (variant) {
      case 'primary':
        variantStyles = 'bg-primary text-background hover:opacity-90';
        break;
      case 'secondary':
        variantStyles = 'bg-panel text-foreground hover:bg-opacity-80 border border-foreground/10';
        break;
      case 'ghost':
        variantStyles = 'bg-transparent text-foreground hover:bg-panel';
        break;
      case 'destructive':
        variantStyles = 'bg-destructive text-foreground hover:opacity-90';
        break;
    }

    return (
      <button
        ref={ref}
        className={`inline-flex items-center justify-center rounded-2xl px-6 min-h-[48px] font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-50 disabled:pointer-events-none ${variantStyles} ${className}`}
        {...props}
      />
    );
  }
);

Button.displayName = 'Button';
