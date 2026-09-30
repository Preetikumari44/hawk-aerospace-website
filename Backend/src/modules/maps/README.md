# Maps Module

## Overview
Integrates mapping services (Google Maps, Mapbox) for location services, distance calculation, route planning, and geofencing.

## Features
- Geocoding and reverse geocoding
- Distance and duration calculation
- Route optimization
- Geofencing for service areas
- Location tracking
- Address validation
- Map visualization

## API Endpoints
- `POST /maps/geocode` - Convert address to coordinates
- `POST /maps/reverse-geocode` - Convert coordinates to address
- `POST /maps/distance` - Calculate distance
- `POST /maps/route` - Get optimal route
- `GET /maps/service-areas` - Get service coverage areas

## Usage Example
```typescript
const distance = await mapsService.calculateDistance({
  origin: { lat: 28.7041, lng: 77.1025 },
  destination: { lat: 28.5355, lng: 77.3910 }
});

const route = await mapsService.getOptimalRoute({
  start: originCoords,
  waypoints: [farm1, farm2, farm3],
  end: baseLocation
});
```

## Related Modules
- [Booking Module](../booking/README.md)
- [Fleet Module](../fleet/README.md)
- [Pricing Module](../pricing/README.md)

## Testing
```bash
npm test -- maps.service.spec.ts
```
