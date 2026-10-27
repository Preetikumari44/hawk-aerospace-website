"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Loader2Icon, MapPinIcon } from "lucide-react";

import { fadeUp } from "@/lib/motion";
import { cn } from "@/lib/utils";

export interface LocationSuggestion {
  label: string;
  latitude: number | null;
  longitude: number | null;
  placeId?: string;
}

interface LocationSuggestionsProps {
  suggestions: LocationSuggestion[];
  loading: boolean;
  open: boolean;
  activeIndex: number;
  onSelect: (suggestion: LocationSuggestion) => void;
  onActiveChange: (index: number) => void;
}

export function LocationSuggestions({
  suggestions,
  loading,
  open,
  activeIndex,
  onSelect,
  onActiveChange,
}: LocationSuggestionsProps) {
  if (!open) return null;
  return (
    <AnimatePresence initial={false}>
      <motion.div
        key="location-suggestions"
        variants={fadeUp}
        initial="hidden"
        animate="show"
        exit={{ opacity: 0, height: 0 }}
        className="border-border bg-card overflow-hidden rounded-3xl border shadow-2xl backdrop-blur-md"
      >
        {loading && (
          <div className="text-muted-foreground flex items-center gap-2 px-3 py-2.5 text-xs">
            <Loader2Icon className="size-3.5 animate-spin" />
            Finding nearby places…
          </div>
        )}
        {!loading && suggestions.length === 0 && (
          <div className="text-muted-foreground px-3 py-2.5 text-xs">
            No matches — press Enter to keep what you typed.
          </div>
        )}
        {!loading &&
          suggestions.slice(0, 4).map((s, i) => (
            <button
              key={`${s.placeId ?? s.label}-${i}`}
              type="button"
              onMouseDown={(e) => {
                // Select before the input blur closes the list.
                e.preventDefault();
                onSelect(s);
              }}
              onMouseEnter={() => onActiveChange(i)}
              className={cn(
                "flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs transition-colors",
                i === activeIndex
                  ? "bg-brand/10 text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <MapPinIcon className="text-brand size-3.5 shrink-0" />
              <span className="truncate">{s.label}</span>
            </button>
          ))}
      </motion.div>
    </AnimatePresence>
  );
}
