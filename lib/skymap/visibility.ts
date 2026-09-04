import type { Property, PropertyFieldVisibility, PropertySpecifications } from "@/lib/skymap/types"

export const SECTION_OPTIONS: { key: keyof PropertyFieldVisibility["sections"]; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "tour360", label: "360 Tour" },
  { key: "vastu", label: "Vastu Report" },
  { key: "dimensions", label: "Dimensions" },
]

export const SPEC_FIELD_OPTIONS: { key: keyof PropertySpecifications; label: string }[] = [
  { key: "propertyType", label: "Property type" },
  { key: "configuration", label: "Configuration" },
  { key: "ownership", label: "Ownership" },
  { key: "carpetAreaSqft", label: "Carpet area" },
  { key: "builtUpAreaSqft", label: "Built-up area" },
  { key: "totalAreaSqft", label: "Total area" },
  { key: "bathrooms", label: "Bathrooms" },
  { key: "balconies", label: "Balconies" },
  { key: "floor", label: "Floor" },
  { key: "totalFloors", label: "Total floors" },
  { key: "propertyAgeYears", label: "Property age" },
  { key: "price", label: "Price" },
  { key: "pricePerSqft", label: "Price / sq ft" },
  { key: "parking", label: "Parking" },
  { key: "furnishing", label: "Furnishing" },
  { key: "facingDirection", label: "Facing" },
  { key: "possessionStatus", label: "Possession" },
  { key: "propertyRefId", label: "Property ID" },
  { key: "maintenanceInfo", label: "Maintenance" },
  { key: "nearbyLandmarks", label: "Nearby landmarks" },
]

export function cloneVisibility(visibility: PropertyFieldVisibility): PropertyFieldVisibility {
  return {
    sections: { ...visibility.sections },
    specFields: [...visibility.specFields],
    highlightIds: [...visibility.highlightIds],
    roomIds: [...visibility.roomIds],
    amenities: [...visibility.amenities],
  }
}

export function createDefaultVisibility(property: Omit<Property, "defaultVisibility">): PropertyFieldVisibility {
  const specs = property.specifications

  return {
    sections: {
      overview: true,
      tour360: property.tourStatus === "ready",
      vastu: property.vastuStatus === "ready",
      dimensions: true,
    },
    specFields: specs
      ? SPEC_FIELD_OPTIONS.map((field) => field.key).filter((key) => {
          const value = specs[key]
          if (Array.isArray(value)) return value.length > 0
          return value !== undefined && value !== null && value !== ""
        })
      : [],
    highlightIds: property.highlights?.map((highlight) => highlight.title) || [],
    roomIds: property.rooms?.map((room) => room.id) || [],
    amenities: specs?.amenities ? [...specs.amenities] : [],
  }
}

export function normalizeVisibility(
  property: Property,
  visibility: PropertyFieldVisibility
): PropertyFieldVisibility {
  const defaults = createDefaultVisibility(property)
  const allowedSpecFields = new Set(defaults.specFields)
  const allowedHighlightIds = new Set(defaults.highlightIds)
  const allowedRoomIds = new Set(defaults.roomIds)
  const allowedAmenities = new Set(defaults.amenities)

  return {
    sections: {
      overview: !!visibility.sections?.overview,
      tour360: !!visibility.sections?.tour360,
      vastu: !!visibility.sections?.vastu,
      dimensions: !!visibility.sections?.dimensions,
    },
    specFields: (visibility.specFields || []).filter((key) => allowedSpecFields.has(key)),
    highlightIds: (visibility.highlightIds || []).filter((id) => allowedHighlightIds.has(id)),
    roomIds: (visibility.roomIds || []).filter((id) => allowedRoomIds.has(id)),
    amenities: (visibility.amenities || []).filter((amenity) => allowedAmenities.has(amenity)),
  }
}

export function countVisibleFields(visibility: PropertyFieldVisibility) {
  return Object.values(visibility.sections).filter(Boolean).length +
    visibility.specFields.length +
    visibility.highlightIds.length +
    visibility.roomIds.length +
    visibility.amenities.length
}

export function countTotalFields(property: Property) {
  return countVisibleFields(createDefaultVisibility(property))
}
