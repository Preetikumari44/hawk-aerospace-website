import { AmenitySelector } from "@/components/skymap/dashboard/amenity-selector"
import type { PropertySpecifications as Specs } from "@/lib/skymap/types"

function formatCurrency(n: number) {
  return `$${n.toLocaleString()}`
}

function Field({ label, value }: { label: string; value: string | number | undefined }) {
  if (value === undefined || value === null || value === "") return null
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-medium">{value}</p>
    </div>
  )
}

export function PropertySpecifications({
  specs,
  visibleSpecFields,
  visibleAmenities,
}: {
  specs: Specs
  visibleSpecFields?: string[]
  visibleAmenities?: string[]
}) {
  const canShow = (key: keyof Specs) => !visibleSpecFields || visibleSpecFields.includes(key)
  const fields: [keyof Specs, string, string | number | undefined][] = [
    ["propertyType", "Property type", specs.propertyType],
    ["configuration", "Configuration", specs.configuration],
    ["ownership", "Ownership", specs.ownership],
    ["carpetAreaSqft", "Carpet area", specs.carpetAreaSqft ? `${specs.carpetAreaSqft.toLocaleString()} sq ft` : undefined],
    ["builtUpAreaSqft", "Built-up area", specs.builtUpAreaSqft ? `${specs.builtUpAreaSqft.toLocaleString()} sq ft` : undefined],
    ["totalAreaSqft", "Total area", specs.totalAreaSqft ? `${specs.totalAreaSqft.toLocaleString()} sq ft` : undefined],
    ["bathrooms", "Bathrooms", specs.bathrooms],
    ["balconies", "Balconies", specs.balconies],
    ["floor", "Floor", specs.floor !== undefined ? (canShow("totalFloors") && specs.totalFloors ? `${specs.floor} of ${specs.totalFloors}` : specs.floor) : undefined],
    ["propertyAgeYears", "Property age", specs.propertyAgeYears !== undefined ? (specs.propertyAgeYears === 0 ? "New construction" : `${specs.propertyAgeYears} yr${specs.propertyAgeYears > 1 ? "s" : ""}`) : undefined],
    ["price", "Price", specs.price ? formatCurrency(specs.price) : undefined],
    ["pricePerSqft", "Price / sq ft", specs.pricePerSqft ? formatCurrency(specs.pricePerSqft) : undefined],
    ["parking", "Parking", specs.parking],
    ["furnishing", "Furnishing", specs.furnishing],
    ["facingDirection", "Facing", specs.facingDirection],
    ["possessionStatus", "Possession", specs.possessionStatus],
    ["propertyRefId", "Property ID", specs.propertyRefId],
    ["maintenanceInfo", "Maintenance", specs.maintenanceInfo],
  ]
  const visibleFields = fields.filter(([key, , value]) => canShow(key) && value !== undefined && value !== null && value !== "")
  const landmarks = canShow("nearbyLandmarks") ? specs.nearbyLandmarks || [] : []
  const landmarksVisible = landmarks.length > 0
  const amenities = visibleAmenities ? specs.amenities?.filter((amenity) => visibleAmenities.includes(amenity)) : specs.amenities
  const amenitiesVisible = amenities && amenities.length > 0

  if (visibleFields.length === 0 && !landmarksVisible && !amenitiesVisible) return null

  return (
    <div className="glass rounded-3xl p-6">
      <p className="eyebrow">Property specifications</p>
      {visibleFields.length > 0 && (
        <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3 lg:grid-cols-4">
          {visibleFields.map(([, label, value]) => (
            <Field key={label} label={label} value={value} />
          ))}
        </div>
      )}

      {landmarksVisible && (
        <div className="mt-6 border-t border-border pt-5">
          <p className="text-xs text-muted-foreground">Nearby landmarks</p>
          <ul className="mt-2 flex flex-col gap-1.5 text-sm">
            {landmarks.map((l) => <li key={l}>{l}</li>)}
          </ul>
        </div>
      )}

      {amenitiesVisible && (
        <div className="mt-6 border-t border-border pt-5">
          <p className="mb-3 text-xs text-muted-foreground">Amenities</p>
          <AmenitySelector amenities={amenities} />
        </div>
      )}
    </div>
  )
}
