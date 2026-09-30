/**
 * Google Maps Configuration
 */

export const GOOGLE_MAPS_CONFIG = {
  apiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY || '',
  libraries: ['places', 'geometry', 'drawing'] as const,
  language: 'en',
  region: 'US',
};

export const DEFAULT_MAP_OPTIONS = {
  zoom: 12,
  center: { lat: 40.7128, lng: -74.006 }, // Default to New York
  mapTypeControl: true,
  streetViewControl: true,
  fullscreenControl: true,
  zoomControl: true,
  styles: [], // You can add custom map styles here
};

export const MAP_MARKER_ICONS = {
  vehicle: {
    url: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIxNiIgY3k9IjE2IiByPSIxNCIgZmlsbD0iIzQyODVGNCIvPjxwYXRoIGQ9Ik0xNiA4QzEyLjY5IDggMTAgMTAuNjkgMTAgMTRDMTAgMTguNSAxNiAyNCAxNiAyNEMxNiAyNCAyMiAxOC41IDIyIDE0QzIyIDEwLjY5IDE5LjMxIDggMTYgOFpNMTYgMTcuNUMxNC4wNyAxNy41IDEyLjUgMTUuOTMgMTIuNSAxNEMxMi41IDEyLjA3IDE0LjA3IDEwLjUgMTYgMTAuNUMxNy45MyAxMC41IDE5LjUgMTIuMDcgMTkuNSAxNEMxOS41IDE1LjkzIDE3LjkzIDE3LjUgMTYgMTcuNVoiIGZpbGw9IndoaXRlIi8+PC9zdmc+',
    scaledSize: { width: 32, height: 32 },
  },
  pickup: {
    url: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIxNiIgY3k9IjE2IiByPSIxNCIgZmlsbD0iIzM0QTg1MyIvPjxwYXRoIGQ9Ik0xNiA4QzEyLjY5IDggMTAgMTAuNjkgMTAgMTRDMTAgMTguNSAxNiAyNCAxNiAyNEMxNiAyNCAyMiAxOC41IDIyIDE0QzIyIDEwLjY5IDE5LjMxIDggMTYgOFpNMTYgMTcuNUMxNC4wNyAxNy41IDEyLjUgMTUuOTMgMTIuNSAxNEMxMi41IDEyLjA3IDE0LjA3IDEwLjUgMTYgMTAuNUMxNy45MyAxMC41IDE5LjUgMTIuMDcgMTkuNSAxNEMxOS41IDE1LjkzIDE3LjkzIDE3LjUgMTYgMTcuNVoiIGZpbGw9IndoaXRlIi8+PC9zdmc+',
    scaledSize: { width: 32, height: 32 },
  },
  dropoff: {
    url: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIxNiIgY3k9IjE2IiByPSIxNCIgZmlsbD0iI0VBNDMzNSIvPjxwYXRoIGQ9Ik0xNiA4QzEyLjY5IDggMTAgMTAuNjkgMTAgMTRDMTAgMTguNSAxNiAyNCAxNiAyNEMxNiAyNCAyMiAxOC41IDIyIDE0QzIyIDEwLjY5IDE5LjMxIDggMTYgOFpNMTYgMTcuNUMxNC4wNyAxNy41IDEyLjUgMTUuOTMgMTIuNSAxNEMxMi41IDEyLjA3IDE0LjA3IDEwLjUgMTYgMTAuNUMxNy45MyAxMC41IDE5LjUgMTIuMDcgMTkuNSAxNEMxOS41IDE1LjkzIDE3LjkzIDE3LjUgMTYgMTcuNVoiIGZpbGw9IndoaXRlIi8+PC9zdmc+',
    scaledSize: { width: 32, height: 32 },
  },
};
