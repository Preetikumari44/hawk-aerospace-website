# Flight Conditions Module

## Overview
Monitors weather conditions and determines flight safety for drone operations based on real-time weather data.

## Features
- Real-time weather monitoring
- Flight safety assessment
- Weather alerts and warnings
- Historical weather data
- Automated booking cancellation for unsafe conditions
- Integration with weather APIs
- Wind speed, visibility, and precipitation tracking

## API Endpoints
- `GET /flight-conditions/current` - Current weather conditions
- `POST /flight-conditions/check-safety` - Check if safe to fly
- `GET /flight-conditions/forecast` - Weather forecast
- `GET /flight-conditions/alerts` - Active weather alerts

## Safety Parameters
- **Wind Speed**: Max 15 km/h for safe operation
- **Visibility**: Minimum 5 km
- **Precipitation**: No heavy rain
- **Temperature**: -10°C to 45°C
- **Cloud Cover**: Must have clear line of sight

## Data Model
```typescript
interface IFlightCondition {
  location: GeoPoint;
  timestamp: Date;
  temperature: number;
  windSpeed: number;
  windDirection: string;
  visibility: number;
  precipitation: number;
  humidity: number;
  pressure: number;
  isSafeToFly: boolean;
  warnings: string[];
}
```

## Usage Example
```typescript
const safety = await flightConditionsService.checkSafety({
  latitude: 28.7041,
  longitude: 77.1025,
  scheduledTime: new Date('2024-07-15T09:00:00')
});

if (!safety.isSafeToFly) {
  // Notify customer and reschedule
  await bookingService.reschedule(bookingId);
}
```

## Weather API Integration
- OpenWeatherMap
- WeatherAPI
- Custom sensors (future)

## Related Modules
- [Booking Module](../booking/README.md)
- [Pilot Module](../pilot/README.md)

## Testing
```bash
npm test -- flight-conditions.service.spec.ts
```
