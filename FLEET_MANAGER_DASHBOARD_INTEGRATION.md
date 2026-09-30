# Fleet Manager Dashboard Integration

The supplied `hawk-aerospace-fleet-manager-header-fixed` dashboard has been integrated into `User_Frontend/src/fmModule` as the Fleet Manager Home dashboard.

- New UI: `src/fmModule/FleetManagerDashboardReplacement.tsx`
- Existing route/screen contract preserved: `src/fmModule/screens/fmHomeScreen.tsx`
- Existing backend `fleetApi` is reused for dashboard, pilots, availability and pilot onboarding.
- Existing Missions, Resources, Marketplace and Account screens remain available through the existing Fleet Manager navigation.
- Pilot, Sales Aggregator and Technician integrations from the previous ZIP are preserved.
