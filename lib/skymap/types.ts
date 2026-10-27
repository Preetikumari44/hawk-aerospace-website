// Shared types for the SkyMap buyer dashboard.
// These describe the JSON shape the backend API is expected to return.
// No backend logic lives here - only the contract the frontend fetches against.

export type UserRole = "buyer" | "owner"

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  phone?: string
  avatarUrl?: string
}

export type ProcessingStatus = "ready" | "processing" | "not_started"

export interface PropertySpecifications {
  propertyType?: string
  ownership?: string
  carpetAreaSqft?: number
  builtUpAreaSqft?: number
  totalAreaSqft?: number
  configuration?: string
  bathrooms?: number
  balconies?: number
  floor?: number
  totalFloors?: number
  propertyAgeYears?: number
  price?: number
  pricePerSqft?: number
  parking?: string
  furnishing?: string
  facingDirection?: string
  possessionStatus?: string
  propertyRefId?: string
  nearbyLandmarks?: string[]
  maintenanceInfo?: string
  amenities?: string[]
}

export interface PropertyHighlight {
  title: string
  description?: string
  icon?: string
}

export interface RoomInteractiveElement {
  id: string
  type: "wall" | "door" | "window" | "counter" | "cabinet" | "floor" | "fixture" | "feature"
  label: string
  detail: string
  xPercent: number // position of the hotspot marker over the room image, 0-100
  yPercent: number
}

export interface PropertyRoom {
  id: string
  name: string
  type: string
  image: string
  areaSqFt?: number
  widthFt?: number
  lengthFt?: number
  heightFt?: number
  doors?: number
  windows?: number
  connectedRooms?: string[]
  description?: string
  interactiveElements?: RoomInteractiveElement[]
}

// ---- Field-level sharing visibility ---------------------------------------
// DEMO NOTE: these types describe the visibility MODEL only. In this
// frontend-only build, hiding a field changes what the UI renders. A real
// deployment MUST enforce the same checks server-side before returning data.

export interface PropertyFieldVisibility {
  sections: {
    overview: boolean
    tour360: boolean
    vastu: boolean
    dimensions: boolean
  }
  specFields: string[]
  highlightIds: string[]
  roomIds: string[]
  amenities: string[]
}

export interface Property {
  id: string
  name: string
  location: string
  coverImage: string
  sizeSqft: number
  bedrooms?: number
  builderName?: string
  tourStatus: ProcessingStatus
  vastuStatus: ProcessingStatus
  saved?: boolean
  sharedOn?: string // ISO date the property was shared with this buyer
  specifications?: PropertySpecifications
  highlights?: PropertyHighlight[]
  rooms?: PropertyRoom[]
  defaultVisibility: PropertyFieldVisibility
}

export interface TourHotspot {
  label: string
  targetRoom: string
  // Position on the equirectangular sphere, in degrees (yaw 0-360, pitch -90..90)
  yaw: number
  pitch: number
}

export interface TourScene {
  room: string
  image360Url: string
  hotspots: TourHotspot[]
}

export interface PropertyTour {
  propertyId: string
  scenes: TourScene[]
}

export type VastuStatus = "ideal" | "acceptable" | "not_recommended"

export interface VastuRoomEntry {
  name: string
  currentDirection: string
  idealDirections: string[]
  status: VastuStatus
  note: string
}

export interface VastuElementBalance {
  earth: number
  water: number
  fire: number
  air: number
  space: number
}

export interface DimensionLabel {
  edge: "top" | "bottom" | "left" | "right" | "center"
  text: string
  measurementType?: string // e.g. "Wall-to-wall", "Counter length", "Door width"
  valueFt?: number
}

export interface RoomDimensions {
  name: string
  floorPlanImage: string
  widthFt: number
  lengthFt: number
  ceilingHeightFt: number
  areaSqFt: number
  dimensionLabels: DimensionLabel[]
}

export interface PropertyDimensions {
  propertyId: string
  rooms: RoomDimensions[]
}

export interface ShareRecipient {
  id: string
  name: string
  email: string
  phone?: string
  visibility: PropertyFieldVisibility
}

export interface PropertyShare {
  id: string
  propertyId: string
  propertyName: string
  token: string
  recipientName: string
  recipientEmail: string
  recipientPhone?: string
  visibility: PropertyFieldVisibility
  message?: string
  sharingMethod: "email" | "whatsapp" | "link"
  senderName: string
  status: "active" | "revoked"
  sentAt: string
}

export interface VastuReportData {
  propertyId: string
  overallScore: number
  entranceDirection: string
  rooms: VastuRoomEntry[]
  remedies: string[]
  elementBalance: VastuElementBalance
}
