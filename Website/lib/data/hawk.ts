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
  { title: "Platforms", href: SKYMAP_ROUTE },
  { title: "Marketplace", href: "/marketplace" },
  { title: "About", href: "/about" },
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
  useCases: UseCase[];
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
  {
    key: "power-line-inspections",
    name: "Power Line Inspections",
    tagline: "Drone-powered infrastructure inspection and monitoring.",
    useCases: [
      {
        n: "01",
        title: "Aerial Inspection",
        description:
          "Hawk Aerospace enables efficient aerial inspection of power transmission and distribution infrastructure using high-resolution imaging, thermal sensing and geospatial analytics.",
        capabilities: [
          "Power line and corridor inspection",
          "Tower and structure visual inspection",
          "High-resolution aerial imaging",
          "Thermal anomaly detection",
          "Vegetation encroachment monitoring",
          "Asset condition documentation",
          "Geospatial mapping and reporting",
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
      { text: "Platforms", href: SKYMAP_ROUTE },
      { text: "About", href: "/about" },
      { text: "Contact", href: "#contact" },
    ],
  },
  {
    title: "Platforms",
    links: [
      { text: "SkyMap™", href: SKYMAP_ROUTE },
      { text: "AgriSure™", href: SKYMAP_ROUTE },
      { text: "Marketplace", href: "/marketplace" },
    ],
  },
];

// ---------------------------------------------------------------------------
// /about page content
// ---------------------------------------------------------------------------

// "What We Do" capability grid.
export interface AboutCapability {
  key: string;
  title: string;
  desc: string;
}

export const aboutCapabilities: AboutCapability[] = [
  { key: "aerial-capture", title: "Aerial Capture", desc: "Drone-based reality capture across sites, corridors and fields." },
  { key: "3d-mapping", title: "3D Mapping", desc: "Orthomosaics, DEM/DSM and 3D mesh models from aerial imagery." },
  { key: "ai-analytics", title: "AI Analytics", desc: "Deep learning models that turn imagery into structured intelligence." },
  { key: "geospatial-intelligence", title: "Geospatial Intelligence", desc: "GIS mapping and spatial analytics for planning and operations." },
  { key: "digital-twins", title: "Digital Twins", desc: "Interactive, geo-registered 3D representations of real assets." },
  { key: "cloud-saas", title: "Cloud SaaS", desc: "Cloud-first platforms for processing, storage and delivery." },
  { key: "rgb", title: "RGB / High-Resolution Imaging", desc: "High-resolution visual capture for mapping and documentation." },
  { key: "thermal", title: "Thermal Imaging", desc: "Temperature-based visual intelligence for inspection and analysis." },
  { key: "lidar", title: "LiDAR", desc: "Dense spatial data for terrain, structures and complex environments." },
];

// "Our Technology Ecosystem" — end-to-end workflow.
export const ecosystemStages = [
  "Drones & Sensors",
  "Data Capture",
  "Photogrammetry / Processing",
  "AI + Computer Vision",
  "GIS + 3D",
  "Analytics",
  "Cloud Platforms",
  "Actionable Intelligence",
];

// "Industries We Serve" on the About page.
export const aboutIndustries = [
  { title: "Real Estate", desc: "3D property visualization and construction progress monitoring." },
  { title: "Agriculture", desc: "Crop intelligence and precision field operations." },
  { title: "Infrastructure / Utilities", desc: "Asset inspection, monitoring and geospatial mapping." },
  { title: "Power Line Inspection", desc: "Aerial inspection of transmission and distribution infrastructure." },
];

// ---------------------------------------------------------------------------
// /marketplace page content
// ---------------------------------------------------------------------------

export const marketplaceCategories = [
  { title: "Drone & Capture Technology", desc: "Aerial platforms and capture hardware for reality capture missions." },
  { title: "Sensors & Imaging", desc: "RGB, thermal and LiDAR sensor technology for specialized capture." },
  { title: "Geospatial Data", desc: "Mapping outputs, spatial datasets and analysis-ready layers." },
  { title: "Software & Platforms", desc: "Cloud platforms and tools for processing and visualizing aerial data." },
  { title: "Enterprise Solutions", desc: "Industry-specific solutions built on the Hawk Aerospace ecosystem." },
];
