
"use client";

import * as React from 'react';

import {cn} from '@/core/utils';

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<'textarea'>>(
  ({className, ...props}, ref) => {
    const internalRef = React.useRef<HTMLTextAreaElement>(null);
    // Combine the forwarded ref and the internal ref
    React.useImperativeHandle(ref, () => internalRef.current!, []);

    const handleInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
      if (internalRef.current) {
        internalRef.current.style.height = 'auto';
        internalRef.current.style.height = `${internalRef.current.scrollHeight}px`;
      }
      if (props.onInput) {
        props.onInput(e as any);
      }
    };

    // Adjust height on initial render and when value changes programmatically
    React.useEffect(() => {
      if (internalRef.current) {
        const textarea = internalRef.current;
        // We need to reset the height to 'auto' before reading the scrollHeight to ensure it shrinks when text is removed.
        textarea.style.height = 'auto';
        textarea.style.height = `${textarea.scrollHeight}px`;
      }
    }, [props.value, props.defaultValue]);

    return (
      <textarea
        className={cn(
          'flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm resize-none overflow-y-hidden',
          className
        )}
        ref={internalRef}
        onInput={handleInput}
        {...props}
      />
    );
  }
);
Textarea.displayName = 'Textarea';

export {Textarea};
