import React from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface Props {
  label: string;
  name: string;
  value: string;
  onChange: (name: string, value: string) => void;
  error?: string;
  required?: boolean;
  type?: 'text' | 'email' | 'url' | 'number' | 'textarea';
  placeholder?: string;
  className?: string;
  rows?: number;
}

export function ValidatedInput({
  label, name, value, onChange, error, required, type = 'text', placeholder, className, rows = 3,
}: Props) {
  const id = `field-${name}`;
  const hasError = !!error;
  const common = {
    id,
    name,
    value: value || '',
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(name, e.target.value),
    placeholder,
    className: cn(hasError && 'border-destructive focus-visible:ring-destructive', className),
  };

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className={cn(hasError && 'text-destructive')}>
        {label}{required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {type === 'textarea' ? <Textarea {...common} rows={rows} /> : <Input {...common} type={type} />}
      {hasError && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

export default ValidatedInput;
