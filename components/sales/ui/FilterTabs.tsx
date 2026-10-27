interface FilterTabsProps<T extends string> {
  label: string;
  items: readonly T[];
  value: T;
  onChange: (value: T) => void;
}

/** Pill filters. Scrolls inside its own row on narrow screens instead of widening the page. */
export default function FilterTabs<T extends string>({ label, items, value, onChange }: FilterTabsProps<T>) {
  return (
    <div role="group" aria-label={label} className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
      {items.map((item) => {
        const active = item === value;
        return (
          <button
            key={item}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(item)}
            className={`min-h-10 shrink-0 rounded-full border px-4 text-xs font-semibold transition-colors ${
              active ? 'border-primary bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:bg-muted'
            }`}
          >
            {item}
          </button>
        );
      })}
    </div>
  );
}
