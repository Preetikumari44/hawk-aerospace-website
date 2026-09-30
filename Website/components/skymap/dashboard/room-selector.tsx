"use client"

export function RoomSelector({
  rooms,
  activeIndex,
  onSelect,
}: {
  rooms: string[]
  activeIndex: number
  onSelect: (index: number) => void
}) {
  return (
    <div className="glass flex flex-wrap gap-2 rounded-2xl p-2">
      {rooms.map((name, i) => (
        <button
          key={name}
          onClick={() => onSelect(i)}
          className={`rounded-lg px-3 py-2 text-sm transition ${
            i === activeIndex
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-accent hover:text-foreground"
          }`}
        >
          {name}
        </button>
      ))}
    </div>
  )
}
