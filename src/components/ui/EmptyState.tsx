import * as React from 'react';
import { Button } from './Button';
import { AlertCircle, FileQuestion } from 'lucide-react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  isError?: boolean;
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  isError = false
}: EmptyStateProps) {
  const Icon = isError ? AlertCircle : FileQuestion;

  return (
    <div className="flex flex-col items-center justify-center p-8 text-center bg-panel rounded-2xl min-h-[300px]">
      <div className={`mb-4 p-4 rounded-full ${isError ? 'bg-destructive/10 text-destructive' : 'bg-foreground/5 text-foreground/50'}`}>
        {icon || <Icon size={32} />}
      </div>
      <h3 className="text-xl font-bold text-foreground mb-2">{title}</h3>
      <p className="text-foreground/70 max-w-sm mb-6">{description}</p>
      {actionLabel && onAction && (
        <Button variant={isError ? 'secondary' : 'primary'} onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
