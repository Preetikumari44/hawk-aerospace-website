// ---------------------------------------------------------------------------
// Hawk Aerospace — homepage content
// All copy below is sourced from the Hawk Aerospace company profile, the
// SkyMap catalogue and the SkyMap/AgriSure deck. Nothing here is invented:
// no fabricated clients, statistics, certifications or specifications.
// ---------------------------------------------------------------------------

// Canonical SkyMap product route. Both the Real Estate → Property Tour
// use case and the SkyMap platform card link here — one destination,
// no duplicate SkyMap implementation.
export const SKYMAP_ROUTE = "/platforms/skymap";

export const navLinks = [
  { title: "Solutions", href: "#solutions" },
  { title: "Technology", href: "#pipeline" },
  { title: "Platforms", href: "#platforms" },
  { title: "About", href: "#why-hawk" },
];

// Compact capability strip, directly below the hero.
export const capabilityStrip = [
  "Aerial Capture",
  "3D Mapping",
  "AI Analytics",
  "Digital Twins",
  "Cloud SaaS",
];

// "From Capture to Intelligence" — five-stage technology pipeline.
export interface PipelineStage {
  n: string;
  title: string;
  desc: string;
}

export const pipelineFlow: PipelineStage[] = [
  { n: "01", title: "Capture", desc: "Drones + RGB + Thermal + LiDAR" },
  { n: "02", title: "Process", desc: "Photogrammetry + AI + Computer Vision" },
  { n: "03", title: "Map & Model", desc: "GIS + 3D + Digital Twins" },
  { n: "04", title: "Analyze", desc: "Measurements + Monitoring + Intelligence" },
  { n: "05", title: "Deliver", desc: "Dashboards + Reports + Digital Experiences" },
];

// Solutions — Real Estate and Agriculture, each with two concrete use cases.
export interface UseCase {
  n: string;
  title: string;
  description: string;
  capabilities: string[];
  href?: string;
  poweredBy?: string;
}

export interface SolutionGroup {
  key: string;
  name: string;
  tagline: string;
  useCases: [UseCase, UseCase];
}

export const solutionGroups: SolutionGroup[] = [
  {
    key: "real-estate",
    name: "Real Estate",
    tagline: "SkyMap™ powers property visualization and construction visibility.",
    useCases: [
      {
        n: "01",
        title: "Property Tour",
        description:
          "3D and 360° immersive property experiences for builders, developers, sellers and buyers.",
        capabilities: [
          "3D property visualization",
          "360° virtual tours",
          "Aerial photography",
          "Interactive property experience",
        ],
        href: SKYMAP_ROUTE,
        poweredBy: "SkyMap™",
      },
      {
        n: "02",
        title: "Project Progress",
        description:
          "Aerial documentation and visual monitoring of construction progress over time.",
        capabilities: [
          "Site capture",
          "Progress monitoring",
          "Periodic documentation",
          "Visual comparison & reporting",
        ],
      },
    ],
  },
  {
    key: "agriculture",
    name: "Agriculture",
    tagline: "AgriSure™ powers crop intelligence and precision field operations.",
    useCases: [
      {
        n: "01",
        title: "Crop Intelligence",
        description:
          "Crop mapping and health monitoring using NDVI and vegetation analysis to catch stress early.",
        capabilities: [
          "Crop mapping",
          "NDVI / vegetation analysis",
          "Crop stress & disease detection",
          "Field analytics",
        ],
      },
      {
        n: "02",
        title: "Precision Agriculture",
        description:
          "Drone-enabled, field-level precision operations — from spraying to yield forecasting.",
        capabilities: [
          "Precision spraying",
          "Variable-rate application",
          "Yield prediction",
          "Field-level intelligence",
        ],
      },
    ],
  },
];

// Hardware & Capture Technology.
export interface HardwareItem {
  key: string;
  title: string;
  description: string;
}

export const hardwareItems: HardwareItem[] = [
  {
    key: "drones",
    title: "Aerial Drones",
    description: "The aerial platform behind every Hawk Aerospace capture mission.",
  },
  {
    key: "rgb",
    title: "RGB / High-Res Imaging",
    description: "High-resolution visual capture for mapping, documentation and analysis.",
  },
  {
    key: "thermal",
    title: "Thermal Imaging",
    description: "Temperature-based visual intelligence for inspection and analysis.",
  },
  {
    key: "lidar",
    title: "LiDAR",
    description: "Dense spatial data for terrain, structures and complex environments.",
  },
];

// Software / SaaS platforms.
export interface PlatformItem {
  key: string;
  name: string;
  tagline: string;
  description: string;
  capabilities: string[];
  stats: { value: string; label: string }[];
  href?: string;
}

export const platforms: PlatformItem[] = [
  {
    key: "skymap",
    name: "SkyMap™",
    tagline: "AI-Powered 3D Mapping & Geospatial Intelligence",
    description:
      "A cloud-based AI 3D mapping, monitoring and 3D modelling platform delivering actionable geospatial intelligence across every industry Hawk Aerospace serves.",
    capabilities: [
      "3D mapping & photogrammetry",
      "GIS & digital twins",
      "Monitoring & spatial visualization",
      "Insight-ready PDF reports",
    ],
    stats: [
      { value: "24–48 hrs", label: "Capture to report" },
      { value: "Sub-5 cm", label: "Orthomosaic resolution" },
    ],
    href: SKYMAP_ROUTE,
  },
  {
    key: "agrisure",
    name: "AgriSure™",
    tagline: "AI-Powered Agriculture Intelligence",
    description:
      "A cloud-based AI photogrammetry platform for agriculture — automated farm mapping, crop analysis and weather-impact insight, built on the same end-to-end workflow as SkyMap.",
    capabilities: [
      "Farm mapping & crop analytics",
      "NDVI & crop monitoring",
      "Field-level intelligence",
      "Precision agriculture reports",
    ],
    stats: [
      { value: "24–48 hrs", label: "Capture to report" },
      { value: "Sub-5 cm", label: "Orthomosaic resolution" },
    ],
  },
];

// How It Works — four simple steps.
export const howItWorks = [
  { n: "01", title: "Capture", desc: "Collect aerial imagery and sensor data." },
  { n: "02", title: "Process", desc: "Convert raw data into structured spatial information." },
  { n: "03", title: "Understand", desc: "AI, GIS and analytics extract useful intelligence." },
  { n: "04", title: "Deliver", desc: "Maps, reports, 3D models, dashboards and digital experiences." },
];

// Why Hawk — four compact value cards.
export const whyHawk = [
  { title: "End-to-End Ecosystem", desc: "Hardware + data + software + SaaS." },
  { title: "Multi-Sensor Intelligence", desc: "RGB + Thermal + LiDAR + aerial data." },
  { title: "AI-Powered Analysis", desc: "Move beyond raw imagery toward useful intelligence." },
  { title: "Cloud-Based Delivery", desc: "Access outputs, analytics and reports through modern platforms." },
];

export const footerColumns = [
  {
    title: "Company",
    links: [
      { text: "Solutions", href: "#solutions" },
      { text: "Technology", href: "#pipeline" },
      { text: "Platforms", href: "#platforms" },
      { text: "About", href: "#why-hawk" },
      { text: "Contact", href: "#contact" },
    ],
  },
  {
    title: "Platforms",
    links: [
      { text: "SkyMap™", href: "#platforms" },
      { text: "AgriSure™", href: "#platforms" },
    ],
  },
];
