"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronDownIcon } from "lucide-react";
import * as React from "react";

import type { SubService } from "@/lib/booking/types";
import { fadeUp } from "@/lib/motion";
import { cn } from "@/lib/utils";

interface SubServiceSelectProps {
  heading: string;
  placeholder: string;
  options: SubService[];
  value: string | null;
  onChange: (key: string) => void;
  /** Disables the control (e.g. no main service chosen yet). */
  disabled?: boolean;
}

// Custom rounded listbox — deliberately not a native <select>, so it can
// match the dark Hawk theme (native selects render an ugly browser popover
// that breaks the glass/blue aesthetic). Fully keyboard accessible: Enter/
// Space toggles, Arrow keys move the highlighted option, Escape closes.
export function SubServiceSelect({
  heading,
  placeholder,
  options,
  value,
  onChange,
  disabled,
}: SubServiceSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [highlighted, setHighlighted] = React.useState(0);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const listId = React.useId();

  const selected = options.find((o) => o.key === value) ?? null;

  React.useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  function openList() {
    if (disabled || options.length === 0) return;
    const idx = Math.max(
      0,
      options.findIndex((o) => o.key === value),
    );
    setHighlighted(idx);
    setOpen(true);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (disabled) return;
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openList();
      }
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted((i) => Math.min(i + 1, options.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      const opt = options[highlighted];
      if (opt) {
        onChange(opt.key);
        setOpen(false);
      }
    }
  }

  return (
    <motion.div variants={fadeUp} ref={rootRef} className="relative flex flex-col gap-2">
      <span className="text-foreground text-sm font-medium">{heading}</span>
      <button
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        disabled={disabled || options.length === 0}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={handleKeyDown}
        className={cn(
          "border-border/70 bg-background/60 focus:border-brand/60 focus:ring-ring flex h-11 w-full items-center justify-between rounded-md border px-3 text-left text-sm outline-none transition-colors focus:ring-1",
          disabled && "cursor-not-allowed opacity-50",
        )}
      >
        <span className={cn(selected ? "text-foreground" : "text-muted-foreground")}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDownIcon
          className={cn(
            "text-muted-foreground size-4 shrink-0 transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.ul
            id={listId}
            role="listbox"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="border-border/60 glass-2 relative z-30 mt-1.5 w-full overflow-hidden rounded-xl border p-1 shadow-lg"
          >
            {options.map((option, i) => {
              const isSelected = option.key === value;
              return (
                <li key={option.key} role="option" aria-selected={isSelected}>
                  <button
                    type="button"
                    onMouseEnter={() => setHighlighted(i)}
                    onClick={() => {
                      onChange(option.key);
                      setOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center rounded-lg px-3 py-2.5 text-left text-sm transition-colors",
                      i === highlighted ? "bg-brand/15 text-foreground" : "text-foreground/85",
                      isSelected && "text-brand font-semibold",
                    )}
                  >
                    {option.label}
                  </button>
                </li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
