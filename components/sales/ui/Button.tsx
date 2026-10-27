import type { ComponentProps } from 'react';

type Variant = 'primary' | 'outline' | 'danger' | 'ghost';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-primary text-primary-foreground hover:bg-primary/90 border border-transparent',
  outline: 'border border-primary text-brand hover:bg-muted bg-transparent',
  danger: 'bg-destructive text-white hover:opacity-90 border border-transparent',
  ghost: 'text-brand hover:bg-muted border border-transparent bg-transparent',
};

interface ButtonProps extends ComponentProps<'button'> {
  variant?: Variant;
  /** Full-width, used for stacked mobile actions. */
  block?: boolean;
}

export default function Button({ variant = 'primary', block = false, className = '', type = 'button', ...rest }: ButtonProps) {
  return (
    <button
      type={type}
      className={`inline-flex min-h-11 items-center justify-center rounded-xl px-4 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 md:min-h-9 ${
        block ? 'w-full' : ''
      } ${VARIANTS[variant]} ${className}`}
      {...rest}
    />
  );
}
