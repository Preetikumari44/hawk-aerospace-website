"use client"

import { Eye } from "lucide-react"

import { Switch } from "@/components/skymap/ui/switch"
import type { Property, PropertyFieldVisibility } from "@/lib/skymap/types"
import { cloneVisibility,SECTION_OPTIONS, SPEC_FIELD_OPTIONS } from "@/lib/skymap/visibility"

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <span className="flex min-w-0 items-center gap-2 text-sm">
        <Eye className="size-3.5 shrink-0 text-muted-foreground" />
        <span className="truncate">{label}</span>
      </span>
      <Switch size="sm" checked={checked} onCheckedChange={onChange} />
    </div>
  )
}

function toggleList(list: string[], value: string, checked: boolean) {
  if (checked) return list.includes(value) ? list : [...list, value]
  return list.filter((item) => item !== value)
}

export function FieldVisibilityPicker({
  property,
  value,
  onChange,
}: {
  property: Property
  value: PropertyFieldVisibility
  onChange: (visibility: PropertyFieldVisibility) => void
}) {
  function update(next: PropertyFieldVisibility) {
    onChange(cloneVisibility(next))
  }

  const specs = property.specifications
  const visibleSpecOptions = specs
    ? SPEC_FIELD_OPTIONS.filter((field) => {
        const current = specs[field.key]
        if (Array.isArray(current)) return current.length > 0
        return current !== undefined && current !== null && current !== ""
      })
    : []

  return (
    <div className="glass rounded-3xl p-5">
      <div className="flex flex-col gap-6">
        <section>
          <p className="eyebrow">Sections</p>
          <div className="mt-3 divide-y divide-border">
            {SECTION_OPTIONS.map((section) => (
              <ToggleRow
                key={section.key}
                label={section.label}
                checked={value.sections[section.key]}
                onChange={(checked) => update({ ...value, sections: { ...value.sections, [section.key]: checked } })}
              />
            ))}
          </div>
        </section>

        {visibleSpecOptions.length > 0 && (
          <section>
            <p className="eyebrow">Specification fields</p>
            <div className="mt-3 divide-y divide-border">
              {visibleSpecOptions.map((field) => (
                <ToggleRow
                  key={field.key}
                  label={field.label}
                  checked={value.specFields.includes(field.key)}
                  onChange={(checked) => update({ ...value, specFields: toggleList(value.specFields, field.key, checked) })}
                />
              ))}
            </div>
          </section>
        )}

        {property.highlights && property.highlights.length > 0 && (
          <section>
            <p className="eyebrow">Highlights</p>
            <div className="mt-3 divide-y divide-border">
              {property.highlights.map((highlight) => (
                <ToggleRow
                  key={highlight.title}
                  label={highlight.title}
                  checked={value.highlightIds.includes(highlight.title)}
                  onChange={(checked) => update({ ...value, highlightIds: toggleList(value.highlightIds, highlight.title, checked) })}
                />
              ))}
            </div>
          </section>
        )}

        {property.rooms && property.rooms.length > 0 && (
          <section>
            <p className="eyebrow">Rooms</p>
            <div className="mt-3 divide-y divide-border">
              {property.rooms.map((room) => (
                <ToggleRow
                  key={room.id}
                  label={room.name}
                  checked={value.roomIds.includes(room.id)}
                  onChange={(checked) => update({ ...value, roomIds: toggleList(value.roomIds, room.id, checked) })}
                />
              ))}
            </div>
          </section>
        )}

        {specs?.amenities && specs.amenities.length > 0 && (
          <section>
            <p className="eyebrow">Amenities</p>
            <div className="mt-3 divide-y divide-border">
              {specs.amenities.map((amenity) => (
                <ToggleRow
                  key={amenity}
                  label={amenity}
                  checked={value.amenities.includes(amenity)}
                  onChange={(checked) => update({ ...value, amenities: toggleList(value.amenities, amenity, checked) })}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
