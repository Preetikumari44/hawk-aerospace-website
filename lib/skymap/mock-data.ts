// DEMO DATA ONLY.
//
// This is an in-memory mock data store used by the route handlers under
// app/api/**. It exists purely so the dashboard has something real to render
// while a real backend is being built. Replace every route in app/api with
// calls to your actual backend/database, then delete this file.

import type {
  Property,
  PropertyDimensions,
  PropertyFieldVisibility,
  PropertyShare,
  PropertyTour,
  User,
  VastuReportData,
} from "./types"
import { cloneVisibility, createDefaultVisibility, normalizeVisibility } from "./visibility"

export let demoUser: User = {
  id: "user_demo_1",
  name: "Preeti Kumari",
  email: "buyer@example.com",
  role: "buyer",
  phone: "+91 90000 00000",
}

export const demoOwner: User = {
  id: "owner_demo_1",
  name: "Preeti Kumari",
  email: "owner@example.com",
  role: "owner",
  phone: "+91 90000 00000",
}

export function updateDemoUser(patch: Partial<Pick<User, "name" | "phone">>) {
  demoUser = { ...demoUser, ...patch }
  return demoUser
}

const demoPropertiesBase: Omit<Property, "defaultVisibility">[] = [
  {
    id: "glass-house",
    name: "Glass House",
    location: "Malibu, CA",
    coverImage: "/images/skymap-hero.png",
    sizeSqft: 4120,
    bedrooms: 3,
    builderName: "Horizon Builders",
    tourStatus: "ready",
    vastuStatus: "ready",
    saved: false,
    sharedOn: "2026-08-02",
    specifications: {
      propertyType: "Independent Villa",
      ownership: "Freehold",
      carpetAreaSqft: 3480,
      builtUpAreaSqft: 4120,
      totalAreaSqft: 5600,
      configuration: "3 BHK",
      bathrooms: 3,
      balconies: 2,
      floor: 1,
      totalFloors: 2,
      propertyAgeYears: 2,
      price: 4850000,
      pricePerSqft: 1177,
      parking: "2 covered",
      furnishing: "Semi-furnished",
      facingDirection: "North-East",
      possessionStatus: "Ready to move",
      propertyRefId: "SKY-GH-0142",
      nearbyLandmarks: ["Malibu Pier — 1.8 mi", "Zuma Beach — 3.2 mi", "Pacific Coast Highway — 0.4 mi"],
      maintenanceInfo: "$420 / month (HOA)",
      amenities: ["Private pool", "Home theatre", "Solar panels", "EV charging"],
    },
    highlights: [
      { title: "Ocean-facing", description: "Uninterrupted Pacific views from the living room and terrace." },
      { title: "Floor-to-ceiling glass", description: "Full-height glazing throughout the main living areas." },
      { title: "Private terrace", description: "820 sq ft outdoor terrace with built-in seating." },
      { title: "Smart home features", description: "App-controlled lighting, climate and security." },
    ],
    rooms: [
      { id: "living-room", name: "Living room", type: "Living area", image: "/images/skymap-interior.png", areaSqFt: 252, widthFt: 18, lengthFt: 14, heightFt: 10, doors: 2, windows: 4, connectedRooms: ["Kitchen", "Terrace"], description: "Open-plan living room with floor-to-ceiling glass facing the ocean.", interactiveElements: [
        { id: "lr-north-wall", type: "wall", label: "North wall", detail: "Stone feature wall with recessed lighting.", xPercent: 50, yPercent: 20 },
        { id: "lr-window", type: "window", label: "Ocean-facing window", detail: "Floor-to-ceiling glazing framing the ocean view.", xPercent: 78, yPercent: 42 },
        { id: "lr-door", type: "door", label: "Terrace door", detail: "Sliding door opening onto the terrace.", xPercent: 22, yPercent: 68 },
      ] },
      { id: "kitchen", name: "Kitchen", type: "Kitchen", image: "/images/skymap-staged.png", areaSqFt: 168, widthFt: 14, lengthFt: 12, heightFt: 10, doors: 1, windows: 2, connectedRooms: ["Living room", "Bedroom"], description: "Chef's kitchen with a waterfall-edge island and integrated appliances.", interactiveElements: [
        { id: "kt-counter", type: "counter", label: "Island counter", detail: "Waterfall-edge island counter, the kitchen's centerpiece.", xPercent: 50, yPercent: 62 },
        { id: "kt-cabinet", type: "cabinet", label: "Upper cabinets", detail: "Handleless upper cabinets with soft-close hinges.", xPercent: 25, yPercent: 30 },
        { id: "kt-window", type: "window", label: "Kitchen window", detail: "Window above the sink, facing the side garden.", xPercent: 75, yPercent: 28 },
      ] },
      { id: "bedroom", name: "Bedroom", type: "Bedroom", image: "/images/skymap-empty.png", areaSqFt: 195, widthFt: 15, lengthFt: 13, heightFt: 9, doors: 1, windows: 2, connectedRooms: ["Terrace", "Kitchen"], description: "Primary bedroom with a walk-in wardrobe and en-suite access.", interactiveElements: [
        { id: "bd-wardrobe", type: "cabinet", label: "Wardrobe", detail: "Walk-in wardrobe with built-in shelving.", xPercent: 20, yPercent: 45 },
        { id: "bd-window", type: "window", label: "Bedroom window", detail: "Bedroom window with automated blackout blinds.", xPercent: 72, yPercent: 35 },
      ] },
      { id: "terrace", name: "Terrace", type: "Outdoor", image: "/images/skymap-hero.png", areaSqFt: 220, widthFt: 22, lengthFt: 10, connectedRooms: ["Living room"], description: "Covered outdoor terrace with unobstructed ocean views.", interactiveElements: [
        { id: "tr-railing", type: "feature", label: "Glass railing", detail: "Frameless glass railing, unobstructed ocean view.", xPercent: 50, yPercent: 55 },
      ] },
    ],
  },
  {
    id: "canyon-residence",
    name: "Canyon Residence",
    location: "Los Angeles, CA",
    coverImage: "/images/skymap-interior.png",
    sizeSqft: 4820,
    bedrooms: 4,
    builderName: "Canyon Realty Group",
    tourStatus: "ready",
    vastuStatus: "ready",
    saved: true,
    sharedOn: "2026-07-18",
    specifications: {
      propertyType: "Independent House",
      ownership: "Freehold",
      carpetAreaSqft: 4120,
      builtUpAreaSqft: 4820,
      totalAreaSqft: 6200,
      configuration: "4 BHK",
      bathrooms: 4,
      balconies: 3,
      floor: 1,
      totalFloors: 2,
      propertyAgeYears: 1,
      price: 6250000,
      pricePerSqft: 1297,
      parking: "3 covered",
      furnishing: "Fully furnished",
      facingDirection: "North",
      possessionStatus: "Ready to move",
      propertyRefId: "SKY-CR-0087",
      nearbyLandmarks: ["Runyon Canyon Park — 0.6 mi", "Sunset Blvd — 1.1 mi"],
      maintenanceInfo: "$540 / month (HOA)",
      amenities: ["Chef's kitchen", "Home gym", "Wine cellar", "Guest suite"],
    },
    highlights: [
      { title: "Canyon views", description: "Panoramic canyon and city-light views from the great room." },
      { title: "Corner property", description: "Sits on a private corner lot with mature landscaping." },
      { title: "Recently renovated", description: "Full interior renovation completed in 2025." },
    ],
    rooms: [
      { id: "great-room", name: "Great room", type: "Living area", image: "/images/skymap-interior.png", areaSqFt: 432, widthFt: 24, lengthFt: 18, heightFt: 12, doors: 2, windows: 6, connectedRooms: ["Chef kitchen", "Primary suite"], description: "Double-height great room opening onto the canyon-facing terrace.", interactiveElements: [
        { id: "gr-wall", type: "wall", label: "Feature wall", detail: "Double-height feature wall with a linear fireplace.", xPercent: 50, yPercent: 22 },
        { id: "gr-window", type: "window", label: "Canyon-facing window", detail: "Floor-to-ceiling window wall facing the canyon.", xPercent: 76, yPercent: 40 },
      ] },
      { id: "chef-kitchen", name: "Chef kitchen", type: "Kitchen", image: "/images/skymap-staged.png", areaSqFt: 224, widthFt: 16, lengthFt: 14, heightFt: 10, doors: 1, windows: 3, connectedRooms: ["Great room", "Terrace"], description: "Professional-grade chef's kitchen with a large center island.", interactiveElements: [
        { id: "ck-counter", type: "counter", label: "Center island", detail: "Marble-topped center island with seating for four.", xPercent: 50, yPercent: 60 },
        { id: "ck-cabinet", type: "cabinet", label: "Pantry cabinets", detail: "Full-height pantry cabinets with integrated lighting.", xPercent: 18, yPercent: 32 },
      ] },
      { id: "primary-suite", name: "Primary suite", type: "Bedroom", image: "/images/skymap-empty.png", areaSqFt: 288, widthFt: 18, lengthFt: 16, heightFt: 10, doors: 1, windows: 3, connectedRooms: ["Great room"], description: "Primary suite with a spa-style en-suite bathroom and private balcony.", interactiveElements: [
        { id: "ps-wardrobe", type: "cabinet", label: "Walk-in wardrobe", detail: "Custom walk-in wardrobe with an island dresser.", xPercent: 22, yPercent: 48 },
      ] },
      { id: "terrace", name: "Terrace", type: "Outdoor", image: "/images/skymap-hero.png", areaSqFt: 312, widthFt: 26, lengthFt: 12, connectedRooms: ["Chef kitchen"], description: "Expansive terrace with an outdoor kitchen and fire pit." },
    ],
  },
  {
    id: "ocean-villa",
    name: "Ocean Villa",
    location: "Laguna Beach, CA",
    coverImage: "/images/skymap-staged.png",
    sizeSqft: 5390,
    bedrooms: 5,
    builderName: "Shoreline Developers",
    tourStatus: "processing",
    vastuStatus: "ready",
    saved: false,
    sharedOn: "2026-08-11",
    specifications: {
      propertyType: "Villa",
      ownership: "Freehold",
      carpetAreaSqft: 4610,
      builtUpAreaSqft: 5390,
      totalAreaSqft: 7100,
      configuration: "5 BHK",
      bathrooms: 5,
      balconies: 4,
      floor: 1,
      totalFloors: 3,
      propertyAgeYears: 0,
      price: 8900000,
      pricePerSqft: 1652,
      parking: "4 covered",
      furnishing: "Unfurnished",
      facingDirection: "West",
      possessionStatus: "Under construction",
      propertyRefId: "SKY-OV-0231",
      nearbyLandmarks: ["Laguna Main Beach — 0.3 mi", "Heisler Park — 0.9 mi"],
      maintenanceInfo: "$680 / month (HOA)",
      amenities: ["Infinity pool", "Private beach access", "Elevator", "Rooftop deck"],
    },
    highlights: [
      { title: "Beachfront", description: "Direct private access to the beach." },
      { title: "Open view", description: "Unobstructed ocean views from every level." },
      { title: "Premium interiors", description: "Designer finishes throughout, still under final construction." },
    ],
    rooms: [
      { id: "living-room", name: "Living room", type: "Living area", image: "/images/skymap-interior.png", areaSqFt: 320, widthFt: 20, lengthFt: 16, heightFt: 11, doors: 2, windows: 5, connectedRooms: ["Terrace"], description: "Great room with panoramic sliding glass doors onto the terrace.", interactiveElements: [
        { id: "ov-door", type: "door", label: "Sliding doors", detail: "Panoramic sliding doors opening onto the terrace.", xPercent: 50, yPercent: 55 },
      ] },
      { id: "terrace", name: "Terrace", type: "Outdoor", image: "/images/skymap-hero.png", areaSqFt: 420, widthFt: 30, lengthFt: 14, connectedRooms: ["Living room"], description: "Oceanfront terrace with an infinity-edge pool." },
    ],
  },
]

export const demoProperties: Property[] = demoPropertiesBase.map((property) => ({
  ...property,
  defaultVisibility: createDefaultVisibility(property),
}))

const ROOM_IMAGES = {
  livingRoom: "/images/skymap-interior.png",
  kitchen: "/images/skymap-staged.png",
  bedroom: "/images/skymap-empty.png",
  terrace: "/images/skymap-hero.png",
} as const

const demoTours: Record<string, PropertyTour> = {
  "glass-house": {
    propertyId: "glass-house",
    scenes: [
      { room: "Living room", image360Url: ROOM_IMAGES.livingRoom, hotspots: [
        { label: "To kitchen", targetRoom: "Kitchen", yaw: 90, pitch: 0 },
        { label: "To terrace", targetRoom: "Terrace", yaw: 260, pitch: -2 },
      ] },
      { room: "Kitchen", image360Url: ROOM_IMAGES.kitchen, hotspots: [
        { label: "To bedroom", targetRoom: "Bedroom", yaw: 140, pitch: 0 },
        { label: "To living room", targetRoom: "Living room", yaw: 300, pitch: 0 },
      ] },
      { room: "Bedroom", image360Url: ROOM_IMAGES.bedroom, hotspots: [
        { label: "To terrace", targetRoom: "Terrace", yaw: 40, pitch: -1 },
        { label: "To kitchen", targetRoom: "Kitchen", yaw: 210, pitch: 0 },
      ] },
      { room: "Terrace", image360Url: ROOM_IMAGES.terrace, hotspots: [
        { label: "To living room", targetRoom: "Living room", yaw: 100, pitch: 0 },
      ] },
    ],
  },
  "canyon-residence": {
    propertyId: "canyon-residence",
    scenes: [
      { room: "Great room", image360Url: ROOM_IMAGES.livingRoom, hotspots: [
        { label: "To chef kitchen", targetRoom: "Chef kitchen", yaw: 80, pitch: 0 },
        { label: "To primary suite", targetRoom: "Primary suite", yaw: 250, pitch: -1 },
      ] },
      { room: "Chef kitchen", image360Url: ROOM_IMAGES.kitchen, hotspots: [
        { label: "To great room", targetRoom: "Great room", yaw: 20, pitch: 0 },
        { label: "To terrace", targetRoom: "Terrace", yaw: 190, pitch: 0 },
      ] },
      { room: "Primary suite", image360Url: ROOM_IMAGES.bedroom, hotspots: [
        { label: "To great room", targetRoom: "Great room", yaw: 60, pitch: 0 },
      ] },
      { room: "Terrace", image360Url: ROOM_IMAGES.terrace, hotspots: [
        { label: "To chef kitchen", targetRoom: "Chef kitchen", yaw: 300, pitch: 0 },
      ] },
    ],
  },
  "ocean-villa": {
    propertyId: "ocean-villa",
    scenes: [
      { room: "Living room", image360Url: ROOM_IMAGES.livingRoom, hotspots: [
        { label: "To terrace", targetRoom: "Terrace", yaw: 150, pitch: 0 },
      ] },
      { room: "Terrace", image360Url: ROOM_IMAGES.terrace, hotspots: [
        { label: "To living room", targetRoom: "Living room", yaw: 330, pitch: 0 },
      ] },
    ],
  },
}

const demoVastuReports: Record<string, VastuReportData> = {
  "glass-house": {
    propertyId: "glass-house",
    overallScore: 88,
    entranceDirection: "NE",
    rooms: [
      { name: "Main entrance", currentDirection: "NE", idealDirections: ["N", "NE", "E"], status: "ideal", note: "North-east entrances are considered highly auspicious, inviting positive energy and morning light." },
      { name: "Kitchen", currentDirection: "SE", idealDirections: ["SE"], status: "ideal", note: "South-east placement aligns with Agni (fire element) — ideal for a kitchen." },
      { name: "Master bedroom", currentDirection: "SW", idealDirections: ["SW"], status: "ideal", note: "South-west is the most stable direction for the primary bedroom." },
      { name: "Pooja/prayer room", currentDirection: "NW", idealDirections: ["NE", "N", "E"], status: "not_recommended", note: "A north-west prayer room can feel unsettled — a north-east placement is traditionally preferred." },
      { name: "Toilet", currentDirection: "NE", idealDirections: ["NW", "SE"], status: "not_recommended", note: "Toilets in the north-east are generally avoided as this zone is reserved for positive energy." },
      { name: "Staircase", currentDirection: "S", idealDirections: ["S", "SW", "W"], status: "acceptable", note: "A south-facing staircase is workable, though south-west is slightly preferred for grounding energy." },
    ],
    remedies: [
      "Place a small mirror on the outer wall of the north-west prayer room to symbolically redirect energy toward the north-east.",
      "Keep the north-east toilet door closed at all times and add an exhaust fan to maintain airflow.",
      "Introduce a potted tulsi (holy basil) plant near the main entrance to reinforce the positive north-east energy.",
    ],
    elementBalance: { earth: 82, water: 74, fire: 91, air: 68, space: 79 },
  },
  "canyon-residence": {
    propertyId: "canyon-residence",
    overallScore: 94,
    entranceDirection: "N",
    rooms: [
      { name: "Main entrance", currentDirection: "N", idealDirections: ["N", "NE", "E"], status: "ideal", note: "North-facing entrances are associated with wealth and opportunity (ruled by Kubera)." },
      { name: "Chef kitchen", currentDirection: "SE", idealDirections: ["SE"], status: "ideal", note: "Perfectly aligned with the fire element for cooking spaces." },
      { name: "Primary suite", currentDirection: "SW", idealDirections: ["SW"], status: "ideal", note: "South-west bedroom supports restful sleep and stability." },
      { name: "Study room", currentDirection: "W", idealDirections: ["N", "E", "NE"], status: "acceptable", note: "A west-facing study is workable for afternoon focus, though a north or east desk orientation is traditionally favoured." },
      { name: "Toilet", currentDirection: "NW", idealDirections: ["NW", "SE"], status: "ideal", note: "North-west is a well-regarded location for toilets — good drainage of negative energy." },
      { name: "Staircase", currentDirection: "SW", idealDirections: ["S", "SW", "W"], status: "ideal", note: "South-west staircases add grounding weight to the structure." },
    ],
    remedies: [
      "For the study room, position the desk so you face north or east while working to improve focus.",
      "Use warm, earthy tones in the south-west primary suite to reinforce its grounding direction.",
    ],
    elementBalance: { earth: 90, water: 85, fire: 88, air: 80, space: 92 },
  },
  "ocean-villa": {
    propertyId: "ocean-villa",
    overallScore: 76,
    entranceDirection: "W",
    rooms: [
      { name: "Main entrance", currentDirection: "W", idealDirections: ["N", "NE", "E"], status: "acceptable", note: "West-facing entrances are workable with the right door placement, though north/east is generally preferred." },
      { name: "Kitchen", currentDirection: "NW", idealDirections: ["SE"], status: "not_recommended", note: "A north-west kitchen may cause the household to feel restless — traditionally the south-east is preferred." },
      { name: "Master bedroom", currentDirection: "S", idealDirections: ["SW"], status: "acceptable", note: "South is a workable alternative to the ideal south-west, offering reasonable stability." },
      { name: "Toilet", currentDirection: "SE", idealDirections: ["NW", "SE"], status: "ideal", note: "South-east toilet placement is acceptable per Vastu Shastra." },
      { name: "Staircase", currentDirection: "NE", idealDirections: ["S", "SW", "W"], status: "not_recommended", note: "A north-east staircase can block the flow of positive energy into the home." },
    ],
    remedies: [
      "If renovating, consider relocating the kitchen stove to the south-east corner of the current kitchen footprint.",
      "Add bright lighting and a yellow or earthy colour palette near the north-east staircase to soften its effect.",
      "Place a Vastu pyramid or brass item near the main entrance to balance the west-facing orientation.",
    ],
    elementBalance: { earth: 70, water: 65, fire: 60, air: 74, space: 71 },
  },
}

const demoDimensions: Record<string, PropertyDimensions> = {
  "glass-house": {
    propertyId: "glass-house",
    rooms: [
      {
        name: "Living room",
        floorPlanImage: ROOM_IMAGES.livingRoom,
        widthFt: 18, lengthFt: 14, ceilingHeightFt: 10, areaSqFt: 252,
        dimensionLabels: [
          { edge: "top", text: "18'-0\" (5.5m)" , measurementType: "Wall-to-wall width" },
          { edge: "left", text: "14'-0\" (4.3m)" , measurementType: "Wall-to-wall length" },
        ],
      },
      {
        name: "Kitchen",
        floorPlanImage: ROOM_IMAGES.kitchen,
        widthFt: 14, lengthFt: 12, ceilingHeightFt: 10, areaSqFt: 168,
        dimensionLabels: [
          { edge: "top", text: "14'-0\" (4.3m)" , measurementType: "Wall-to-wall width" },
          { edge: "left", text: "12'-0\" (3.7m)" , measurementType: "Wall-to-wall length" },
        ],
      },
      {
        name: "Bedroom",
        floorPlanImage: ROOM_IMAGES.bedroom,
        widthFt: 15, lengthFt: 13, ceilingHeightFt: 9, areaSqFt: 195,
        dimensionLabels: [
          { edge: "top", text: "15'-0\" (4.6m)" , measurementType: "Wall-to-wall width" },
          { edge: "left", text: "13'-0\" (4.0m)" , measurementType: "Wall-to-wall length" },
        ],
      },
      {
        name: "Terrace",
        floorPlanImage: ROOM_IMAGES.terrace,
        widthFt: 22, lengthFt: 10, ceilingHeightFt: 0, areaSqFt: 220,
        dimensionLabels: [
          { edge: "top", text: "22'-0\" (6.7m)" , measurementType: "Wall-to-wall width" },
          { edge: "left", text: "10'-0\" (3.0m)" , measurementType: "Wall-to-wall length" },
        ],
      },
    ],
  },
  "canyon-residence": {
    propertyId: "canyon-residence",
    rooms: [
      {
        name: "Great room",
        floorPlanImage: ROOM_IMAGES.livingRoom,
        widthFt: 24, lengthFt: 18, ceilingHeightFt: 12, areaSqFt: 432,
        dimensionLabels: [
          { edge: "top", text: "24'-0\" (7.3m)" , measurementType: "Wall-to-wall width" },
          { edge: "left", text: "18'-0\" (5.5m)" , measurementType: "Wall-to-wall length" },
        ],
      },
      {
        name: "Chef kitchen",
        floorPlanImage: ROOM_IMAGES.kitchen,
        widthFt: 16, lengthFt: 14, ceilingHeightFt: 10, areaSqFt: 224,
        dimensionLabels: [
          { edge: "top", text: "16'-0\" (4.9m)" , measurementType: "Wall-to-wall width" },
          { edge: "left", text: "14'-0\" (4.3m)" , measurementType: "Wall-to-wall length" },
        ],
      },
      {
        name: "Primary suite",
        floorPlanImage: ROOM_IMAGES.bedroom,
        widthFt: 18, lengthFt: 16, ceilingHeightFt: 10, areaSqFt: 288,
        dimensionLabels: [
          { edge: "top", text: "18'-0\" (5.5m)" , measurementType: "Wall-to-wall width" },
          { edge: "left", text: "16'-0\" (4.9m)" , measurementType: "Wall-to-wall length" },
        ],
      },
      {
        name: "Terrace",
        floorPlanImage: ROOM_IMAGES.terrace,
        widthFt: 26, lengthFt: 12, ceilingHeightFt: 0, areaSqFt: 312,
        dimensionLabels: [
          { edge: "top", text: "26'-0\" (7.9m)" , measurementType: "Wall-to-wall width" },
          { edge: "left", text: "12'-0\" (3.7m)" , measurementType: "Wall-to-wall length" },
        ],
      },
    ],
  },
  "ocean-villa": {
    propertyId: "ocean-villa",
    rooms: [
      {
        name: "Living room",
        floorPlanImage: ROOM_IMAGES.livingRoom,
        widthFt: 20, lengthFt: 16, ceilingHeightFt: 11, areaSqFt: 320,
        dimensionLabels: [
          { edge: "top", text: "20'-0\" (6.1m)" , measurementType: "Wall-to-wall width" },
          { edge: "left", text: "16'-0\" (4.9m)" , measurementType: "Wall-to-wall length" },
        ],
      },
      {
        name: "Terrace",
        floorPlanImage: ROOM_IMAGES.terrace,
        widthFt: 30, lengthFt: 14, ceilingHeightFt: 0, areaSqFt: 420,
        dimensionLabels: [
          { edge: "top", text: "30'-0\" (9.1m)" , measurementType: "Wall-to-wall width" },
          { edge: "left", text: "14'-0\" (4.3m)" , measurementType: "Wall-to-wall length" },
        ],
      },
    ],
  },
}

export function getDemoProperty(id: string): Property | undefined {
  return demoProperties.find((p) => p.id === id)
}
export function getDemoTour(id: string): PropertyTour | undefined {
  return demoTours[id]
}
export function getDemoVastu(id: string): VastuReportData | undefined {
  return demoVastuReports[id]
}
export function getDemoDimensions(id: string): PropertyDimensions | undefined {
  return demoDimensions[id]
}

// ---- Field-level sharing (DEMO, in-memory) ----------------------------------
// See the note in lib/types.ts: hiding here is a UI-only mock. A real
// deployment must re-check every visibility rule server-side.

export function getPropertyDefaultVisibility(id: string): PropertyFieldVisibility | undefined {
  const property = getDemoProperty(id)
  return property ? cloneVisibility(property.defaultVisibility) : undefined
}

export function updatePropertyDefaultVisibility(
  id: string,
  visibility: PropertyFieldVisibility
): PropertyFieldVisibility | undefined {
  const property = getDemoProperty(id)
  if (!property) return undefined
  property.defaultVisibility = normalizeVisibility(property, visibility)
  return cloneVisibility(property.defaultVisibility)
}

function randomToken() {
  return Array.from({ length: 24 }, () => "abcdefghijklmnopqrstuvwxyz0123456789"[Math.floor(Math.random() * 36)]).join("")
}

export const demoShares: PropertyShare[] = [
  {
    id: "share_1",
    propertyId: "glass-house",
    propertyName: "Glass House",
    token: "demo-share-alex-glasshouse",
    recipientName: "Alex Rivera",
    recipientEmail: "alex.rivera@example.com",
    recipientPhone: "+1 310 555 0142",
    visibility: {
      sections: { overview: true, tour360: true, vastu: false, dimensions: true },
      specFields: ["propertyType", "configuration", "ownership", "carpetAreaSqft", "builtUpAreaSqft", "price", "parking", "furnishing", "facingDirection", "possessionStatus"],
      highlightIds: ["Ocean-facing", "Floor-to-ceiling glass", "Private terrace"],
      roomIds: ["living-room", "kitchen", "bedroom"],
      amenities: ["Private pool", "Home theatre", "EV charging"],
    },
    message: "Hi Alex, here's the full walkthrough of Glass House we discussed.",
    sharingMethod: "email",
    senderName: "Preeti Kumari",
    status: "active",
    sentAt: "2026-08-18T10:15:00.000Z",
  },
  {
    id: "share_2",
    propertyId: "canyon-residence",
    propertyName: "Canyon Residence",
    token: "demo-share-jordan-canyon",
    recipientName: "Jordan Lee",
    recipientEmail: "jordan.lee@example.com",
    recipientPhone: "+1 213 555 0187",
    visibility: {
      sections: { overview: true, tour360: true, vastu: true, dimensions: false },
      specFields: ["propertyType", "configuration", "carpetAreaSqft", "builtUpAreaSqft", "totalAreaSqft", "bathrooms", "balconies", "price", "pricePerSqft", "parking"],
      highlightIds: ["Canyon views", "Recently renovated"],
      roomIds: ["great-room", "chef-kitchen", "primary-suite"],
      amenities: ["Chef's kitchen", "Home gym", "Guest suite"],
    },
    message: "Sharing the Canyon Residence presentation as promised.",
    sharingMethod: "whatsapp",
    senderName: "Preeti Kumari",
    status: "active",
    sentAt: "2026-08-15T16:40:00.000Z",
  },
  {
    id: "share_3",
    propertyId: "glass-house",
    propertyName: "Glass House",
    token: "demo-share-old-revoked",
    recipientName: "Sam Patel",
    recipientEmail: "sam.patel@example.com",
    recipientPhone: "+1 424 555 0111",
    visibility: {
      sections: { overview: true, tour360: true, vastu: false, dimensions: false },
      specFields: ["propertyType", "configuration", "price"],
      highlightIds: ["Ocean-facing"],
      roomIds: ["living-room"],
      amenities: ["Private pool"],
    },
    sharingMethod: "link",
    senderName: "Preeti Kumari",
    status: "revoked",
    sentAt: "2026-07-30T09:00:00.000Z",
  },
]

export function getShareHistory(): PropertyShare[] {
  return demoShares
}

export function getShareByToken(token: string): PropertyShare | undefined {
  return demoShares.find((s) => s.token === token)
}

export function revokeShare(id: string): PropertyShare | undefined {
  const share = demoShares.find((s) => s.id === id)
  if (share) share.status = share.status === "active" ? "revoked" : "active"
  return share
}

export function createShare(input: {
  propertyId: string
  recipientName: string
  recipientEmail: string
  recipientPhone?: string
  visibility: PropertyFieldVisibility
  message?: string
  sharingMethod: PropertyShare["sharingMethod"]
}): PropertyShare {
  const property = getDemoProperty(input.propertyId)
  const visibility = property ? normalizeVisibility(property, input.visibility) : input.visibility
  const share: PropertyShare = {
    id: `share_${Date.now()}`,
    propertyId: input.propertyId,
    propertyName: property?.name || "Property",
    token: randomToken(),
    recipientName: input.recipientName,
    recipientEmail: input.recipientEmail,
    recipientPhone: input.recipientPhone,
    visibility,
    message: input.message,
    sharingMethod: input.sharingMethod,
    senderName: demoUser.name,
    status: "active",
    sentAt: new Date().toISOString(),
  }
  demoShares.unshift(share)
  return share
}
