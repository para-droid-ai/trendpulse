import { useState } from 'react';

export default function MaskedSection({ label = 'Thoughts', children }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="my-4">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-2 bg-muted rounded-md text-left text-sm font-medium text-muted-foreground hover:bg-muted/80 focus:outline-none"
      >
        <span>{label} <span className="ml-2 text-xs text-muted-foreground">(experimental)</span></span>
        <svg 
          className={`h-5 w-5 transform transition-transform ${open ? 'rotate-90' : ''}`} 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        >
          <path d="M9 18l6-6-6-6"/>
        </svg>
      </button>
      {open && (
        <div className="mt-2 p-4 bg-muted rounded-md border border-border text-foreground text-sm whitespace-pre-line font-mono">
          {children}
        </div>
      )}
    </div>
  );
} 