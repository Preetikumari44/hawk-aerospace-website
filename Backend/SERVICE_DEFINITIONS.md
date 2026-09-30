# 🚁 HAWK Drone Service Definitions

Complete reference for all drone services, sub-services, and their requirements.

---

## 📋 Table of Contents

1. [Spraying Services](#1-spraying-services)
2. [Seeding Services](#2-seeding-services)
3. [Monitoring Services](#3-monitoring-services)
4. [Mapping Services](#4-mapping-services)
5. [Surveillance Services](#5-surveillance-services)
6. [Videography Services](#6-videography-services)
7. [Delivery Services](#7-delivery-services)

---

## 1. Spraying Services

### Sub-Service Types

| Sub-Service | Description | Typical Use Cases |
|------------|-------------|-------------------|
| `fertilizer_spraying` | Application of liquid or granular fertilizers | NPK, Urea, DAP application |
| `pesticide_spraying` | Pest control chemical application | Aphid control, bollworm control |
| `insecticide_spraying` | Insect-specific chemical application | Locust control, whitefly control |
| `herbicide_spraying` | Weed control chemical application | Pre/post-emergent weed control |
| `fungicide_spraying` | Fungal disease prevention/treatment | Rust control, blight prevention |
| `growth_regulator_spraying` | Plant growth hormone application | Height control, flowering induction |
| `micronutrient_spraying` | Trace element supplementation | Zinc, Boron, Iron application |
| `organic_spraying` | Organic-certified inputs | Neem oil, bio-pesticides |
| `other` | Custom spraying requirements | - |

### Required Fields

```typescript
{
  "serviceType": "spraying",
  "serviceDetails": {
    "sprayingSubType": "fertilizer_spraying",  // REQUIRED
    "chemicalName": "Urea Solution",           // RECOMMENDED
    "chemicalQuantity": 50,                    // OPTIONAL
    "chemicalUnit": "liters",                  // OPTIONAL
    "targetPest": "N/A",                       // OPTIONAL
    "applicationRate": 15,                     // OPTIONAL (ml/acre)
    "sprayHeight": 3,                          // OPTIONAL (meters)
    "specialInstructions": "Avoid windy conditions" // OPTIONAL
  }
}
```

### Example Request

```json
POST /api/bookings
{
  "serviceType": "spraying",
  "cropType": "wheat",
  "areaValue": 10,
  "areaUnit": "acres",
  "location": { "lat": 28.7041, "lng": 77.1025 },
  "scheduledDate": "2026-07-15T06:00:00Z",
  "serviceDetails": {
    "sprayingSubType": "pesticide_spraying",
    "chemicalName": "Chlorpyrifos 20% EC",
    "chemicalQuantity": 25,
    "chemicalUnit": "liters",
    "targetPest": "Aphids",
    "applicationRate": 12.5,
    "sprayHeight": 2.5,
    "specialInstructions": "Early morning application preferred"
  }
}
```

---

## 2. Seeding Services

### Sub-Service Types

| Sub-Service | Description | Typical Use Cases |
|------------|-------------|-------------------|
| `rice_seeding` | Paddy/rice seed broadcasting | Direct seeding in flooded fields |
| `wheat_seeding` | Wheat seed distribution | No-till wheat seeding |
| `corn_seeding` | Maize/corn seed planting | Precision corn seeding |
| `pulses_seeding` | Legume seed distribution | Chickpea, lentil seeding |
| `vegetable_seeding` | Vegetable crop seeding | Tomato, cabbage seeding |
| `cover_crop_seeding` | Cover crop establishment | Clover, rye grass seeding |
| `grass_seeding` | Pasture/lawn grass seeding | Lawn establishment, pasture renovation |
| `reforestation_seeding` | Tree seed distribution | Forest restoration |
| `other` | Custom seeding requirements | - |

### Required Fields

```typescript
{
  "serviceType": "seeding",
  "serviceDetails": {
    "seedingSubType": "rice_seeding",    // REQUIRED
    "seedType": "Basmati 370",           // RECOMMENDED
    "seedQuantity": 25,                  // OPTIONAL (kg)
    "seedingRate": 120,                  // OPTIONAL (seeds/m²)
    "seedingDepth": 2,                   // OPTIONAL (cm)
    "specialInstructions": "Ensure uniform coverage" // OPTIONAL
  }
}
```

### Example Request

```json
POST /api/bookings
{
  "serviceType": "seeding",
  "cropType": "wheat",
  "areaValue": 15,
  "areaUnit": "acres",
  "location": { "lat": 30.7046, "lng": 76.7179 },
  "scheduledDate": "2026-11-10T07:00:00Z",
  "serviceDetails": {
    "seedingSubType": "wheat_seeding",
    "seedType": "HD-2967",
    "seedQuantity": 75,
    "seedingRate": 100,
    "seedingDepth": 5,
    "specialInstructions": "No-till seeding required"
  }
}
```

---

## 3. Monitoring Services

### Sub-Service Types

| Sub-Service | Description | Typical Use Cases |
|------------|-------------|-------------------|
| `crop_health_monitoring` | Overall crop vigor assessment | NDVI, chlorophyll analysis |
| `pest_detection` | Identify pest infestation | Early detection, hotspot mapping |
| `disease_detection` | Identify disease symptoms | Fungal, bacterial, viral diseases |
| `weed_detection` | Weed pressure mapping | Precision weed control |
| `irrigation_monitoring` | Soil moisture & water stress | Optimize irrigation scheduling |
| `growth_stage_monitoring` | Track crop phenology | Harvest timing, input planning |
| `yield_estimation` | Predict harvest output | Revenue forecasting |
| `soil_analysis` | Soil health assessment | Nutrient mapping, compaction |
| `thermal_imaging` | Heat stress detection | Drought stress, disease |
| `multispectral_analysis` | Multi-band imaging | Comprehensive crop analysis |
| `ndvi_analysis` | Normalized Difference Vegetation Index | Vegetation health mapping |
| `other` | Custom monitoring | - |

### Required Fields

```typescript
{
  "serviceType": "monitoring",
  "serviceDetails": {
    "monitoringSubType": "crop_health_monitoring",  // REQUIRED
    "monitoringFrequency": "weekly",                // OPTIONAL
    "analysisType": ["ndvi", "thermal"],            // OPTIONAL
    "reportFormat": "pdf",                          // OPTIONAL
    "specialInstructions": "Focus on north field"   // OPTIONAL
  }
}
```

### Example Request

```json
POST /api/bookings
{
  "serviceType": "monitoring",
  "cropType": "cotton",
  "areaValue": 20,
  "areaUnit": "acres",
  "location": { "lat": 21.1458, "lng": 79.0882 },
  "scheduledDate": "2026-07-20T08:00:00Z",
  "serviceDetails": {
    "monitoringSubType": "pest_detection",
    "monitoringFrequency": "weekly",
    "analysisType": ["rgb", "thermal"],
    "reportFormat": "pdf",
    "specialInstructions": "Monitor for bollworm infestation"
  }
}
```

---

## 4. Mapping Services

### Sub-Service Types

| Sub-Service | Description | Infrastructure Types |
|------------|-------------|---------------------|
| `topographic_mapping` | Elevation & terrain mapping | Urban, agricultural, construction sites |
| `orthomosaic_mapping` | High-resolution stitched imagery | Agricultural land, industrial zones |
| `3d_modeling` | 3D reconstruction | Buildings, monuments, construction sites |
| `agricultural_mapping` | Farm-specific mapping | Crop fields, orchards, plantations |
| `construction_site_mapping` | Progress & volume calculation | Residential, commercial, infrastructure |
| `forest_vegetation_mapping` | Tree density & species mapping | Forests, wildlife sanctuaries |
| `flood_plain_mapping` | Water body & flood risk | Rivers, reservoirs, wetlands |
| `infrastructure_mapping` | Linear infrastructure | Roads, railways, pipelines |
| `mining_quarry_surveys` | Volume & stockpile measurement | Open cast mines, quarries |
| `other` | Custom mapping | - |

### Infrastructure Types

- Urban/Residential Area
- Agricultural Land
- Forest
- Construction Site
- Mining/Quarry Site
- Water Body (River/Lake/Reservoir)
- Highway/Road Network
- Railway Corridor
- Hill/Mountain Terrain
- Industrial Zone
- Solar/Wind Farm
- Airport
- Historical Monument
- Bridge/Dam
- Warehouse

### Required Fields

```typescript
{
  "serviceType": "mapping",
  "serviceDetails": {
    "mappingSubType": "orthomosaic_mapping",        // REQUIRED
    "mappingInfrastructure": "agricultural_land",   // OPTIONAL
    "resolution": 5,                                // OPTIONAL (cm/pixel)
    "outputFormat": "geotiff",                      // OPTIONAL
    "coordinateSystem": "WGS84",                    // OPTIONAL
    "specialInstructions": "High-res required"      // OPTIONAL
  }
}
```

### Example Request

```json
POST /api/bookings
{
  "serviceType": "mapping",
  "cropType": "n/a",
  "areaValue": 50,
  "areaUnit": "acres",
  "location": { "lat": 28.5355, "lng": 77.3910 },
  "scheduledDate": "2026-07-25T09:00:00Z",
  "serviceDetails": {
    "mappingSubType": "3d_modeling",
    "mappingInfrastructure": "construction_site",
    "resolution": 3,
    "outputFormat": "all",
    "coordinateSystem": "UTM",
    "specialInstructions": "Need monthly progress tracking"
  }
}
```

---

## 5. Surveillance Services

### Sub-Service Types

| Sub-Service | Description | Infrastructure Types |
|------------|-------------|---------------------|
| `perimeter_border_surveillance` | Perimeter security monitoring | Residential, industrial, military facilities |
| `event_monitoring` | Crowd & event management | Stadiums, venues, public gatherings |
| `traffic_road_monitoring` | Traffic flow analysis | Highways, toll plazas, junctions |
| `wildlife_environmental_monitoring` | Wildlife tracking & habitat | Forests, reserves, protected areas |
| `disaster_emergency_response` | Emergency situation monitoring | Flood, fire, disaster zones |
| `pipeline_powerline_inspection` | Infrastructure inspection | Oil/gas pipelines, power lines |
| `construction_site_security` | Site security & safety | Construction sites |
| `anti_poaching_surveillance` | Wildlife protection | National parks, reserves |
| `other` | Custom surveillance | - |

### Infrastructure Types

- Residential Colony/Housing Society
- Commercial Complex/Mall
- Industrial Plant/Factory
- Warehouse/Logistics Hub
- Border/Perimeter Wall
- Oil & Gas Pipeline
- Power Transmission Lines
- Port/Harbour
- Airport Perimeter
- Military Base/Government Facility
- Event Venue/Stadium
- Highway/Toll Plaza
- Forest/Wildlife Reserve
- Construction Site
- Other

### Required Fields

```typescript
{
  "serviceType": "surveillance",
  "serviceDetails": {
    "surveillanceSubType": "perimeter_border_surveillance",  // REQUIRED
    "surveillanceInfrastructure": "industrial_plant",        // OPTIONAL
    "surveillanceShift": "24_hours",                         // OPTIONAL
    "cameraType": "both",                                    // OPTIONAL
    "recordingRequired": true,                               // OPTIONAL
    "liveStreamRequired": true,                              // OPTIONAL
    "durationMinutes": 480,                                  // OPTIONAL
    "specialInstructions": "Focus on north perimeter"        // OPTIONAL
  }
}
```

### Example Request

```json
POST /api/bookings
{
  "serviceType": "surveillance",
  "cropType": "n/a",
  "areaValue": 100,
  "areaUnit": "acres",
  "location": { "lat": 19.0760, "lng": 72.8777 },
  "scheduledDate": "2026-08-01T00:00:00Z",
  "serviceDetails": {
    "surveillanceSubType": "pipeline_powerline_inspection",
    "surveillanceInfrastructure": "oil_gas_pipeline",
    "surveillanceShift": "day",
    "cameraType": "thermal",
    "recordingRequired": true,
    "liveStreamRequired": false,
    "durationMinutes": 240,
    "specialInstructions": "Check for leaks and damage"
  }
}
```

---

## 6. Videography Services

### Sub-Service Types

| Sub-Service | Description | Typical Use Cases |
|------------|-------------|-------------------|
| `real_estate_photography` | Property showcase | Residential, commercial properties |
| `wedding_event_coverage` | Wedding aerial shots | Wedding ceremonies, receptions |
| `commercial_advertisement` | Commercial video production | Product launches, brand campaigns |
| `documentary_filming` | Documentary footage | Nature, cultural documentaries |
| `sports_event_coverage` | Sports event recording | Marathons, cricket matches |
| `construction_progress_documentation` | Time-lapse & progress | Construction projects |
| `tourism_promotional` | Tourism marketing | Destination promotion |
| `inspection_documentation` | Technical inspection videos | Infrastructure, industrial |
| `cinematic_production` | Film/series production | Movies, web series |
| `aerial_time_lapse` | Time-lapse sequences | Sunrises, urban development |
| `other` | Custom videography | - |

### Required Fields

```typescript
{
  "serviceType": "videography",
  "serviceDetails": {
    "videographySubType": "real_estate_photography",  // REQUIRED
    "shotType": ["aerial_pan", "orbit"],              // OPTIONAL
    "videoResolution": "4k",                          // OPTIONAL
    "frameRate": 30,                                  // OPTIONAL
    "editingRequired": true,                          // OPTIONAL
    "rawFootageRequired": false,                      // OPTIONAL
    "durationMinutes": 60,                            // OPTIONAL
    "specialInstructions": "Golden hour preferred"    // OPTIONAL
  }
}
```

### Example Request

```json
POST /api/bookings
{
  "serviceType": "videography",
  "cropType": "n/a",
  "areaValue": 5,
  "areaUnit": "acres",
  "location": { "lat": 26.9124, "lng": 75.7873 },
  "scheduledDate": "2026-08-10T17:00:00Z",
  "serviceDetails": {
    "videographySubType": "wedding_event_coverage",
    "shotType": ["aerial_pan", "orbit", "flythrough"],
    "videoResolution": "4k",
    "frameRate": 60,
    "editingRequired": true,
    "rawFootageRequired": true,
    "durationMinutes": 120,
    "specialInstructions": "Capture venue and baraat procession"
  }
}
```

---

## 7. Delivery Services

### Sub-Service Types (Package Categories)

| Sub-Service | Description | Typical Contents |
|------------|-------------|------------------|
| `documents_envelopes` | Documents & legal papers | Passports, contracts, certificates |
| `small_parcel` | Small packages (≤2.5kg) | Electronics, gifts |
| `medium_parcel` | Medium packages (≤15kg) | Apparel, books |
| `large_parcel` | Large packages (≤50kg) | Appliances |
| `heavy_cargo` | Heavy freight (≤200kg) | Industrial parts |
| `fragile_breakable` | Fragile items | Glass, ceramics, artwork |
| `perishable_food` | Perishable food items | Fruits, dairy, frozen food |
| `medical_supplies` | Medical deliveries | Medicines, samples, vaccines |
| `electronics` | Electronic devices | Phones, laptops, computers |
| `clothing_apparel` | Fashion items | Garments, shoes, accessories |
| `gifts_collectibles` | Gift items | Gift boxes, flowers, toys |
| `industrial_parts` | Industrial components | Machine parts, tools |
| `hazardous_materials` | Hazmat items | Chemicals, batteries |
| `other` | Custom delivery | - |

### Package Size Categories

| Package Size | Max Dimensions (L×W×H) | Max Weight |
|-------------|------------------------|------------|
| `small_parcel` | 30×25×10 cm | 2.5 kg |
| `medium_parcel` | 45×35×20 cm | 15 kg |
| `large_parcel` | 80×60×50 cm | 50 kg |
| `heavy_cargo` | 150×100×80 cm | 200 kg |

### Required Fields

```typescript
{
  "serviceType": "delivery",
  "serviceDetails": {
    "deliverySubType": "medical_supplies",           // REQUIRED
    "packageSize": "small_parcel",                   // OPTIONAL
    "weightKg": 1.5,                                 // REQUIRED
    "dimensions": { length: 25, width: 20, height: 8 }, // OPTIONAL
    "contents": "Medical samples",                   // REQUIRED
    "isFragile": false,                              // OPTIONAL
    "requiresColdChain": true,                       // OPTIONAL
    "requiresSignature": true,                       // OPTIONAL
    "insuranceRequired": false,                      // OPTIONAL
    "estimatedValue": 5000,                          // OPTIONAL (₹)
    "specialInstructions": "Handle with care"        // OPTIONAL
  },
  "dropoffLocation": { "lat": 28.5355, "lng": 77.3910 }  // REQUIRED
}
```

### Example Request

```json
POST /api/bookings
{
  "serviceType": "delivery",
  "cropType": "n/a",
  "areaValue": 0,
  "areaUnit": "acres",
  "location": { "lat": 28.7041, "lng": 77.1025 },
  "dropoffLocation": { "lat": 28.5355, "lng": 77.3910 },
  "scheduledDate": "2026-08-15T10:00:00Z",
  "serviceDetails": {
    "deliverySubType": "medical_supplies",
    "packageSize": "small_parcel",
    "weightKg": 2,
    "dimensions": { "length": 30, "width": 25, "height": 10 },
    "contents": "Vaccine samples - Temperature controlled",
    "isFragile": true,
    "requiresColdChain": true,
    "requiresSignature": true,
    "insuranceRequired": true,
    "estimatedValue": 50000,
    "specialInstructions": "Maintain 2-8°C temperature"
  }
}
```

---

## 🔧 Validation Rules

### Service-Specific Validations

```typescript
// Spraying
✅ sprayingSubType: REQUIRED
⚠️  chemicalName: RECOMMENDED (warning logged if missing)

// Seeding
✅ seedingSubType: REQUIRED
⚠️  seedType: RECOMMENDED (warning logged if missing)

// Monitoring
✅ monitoringSubType: REQUIRED

// Mapping
✅ mappingSubType OR mappingType: REQUIRED (one must be present)

// Surveillance
✅ surveillanceSubType OR surveillanceType: REQUIRED (one must be present)

// Videography
✅ videographySubType OR videographyType: REQUIRED (one must be present)

// Delivery
✅ deliverySubType: REQUIRED
✅ weightKg: REQUIRED (must be > 0)
✅ contents: REQUIRED
✅ dropoffLocation: REQUIRED
⚠️  Package size validation (if packageSize + dimensions provided)
```

### Package Size Validation (Delivery Only)

If both `packageSize` and `dimensions` are provided, the system validates:

```typescript
// Small Parcel limits
if (packageSize === 'small_parcel') {
  assert(length ≤ 30 && width ≤ 25 && height ≤ 10);
  assert(weightKg ≤ 2.5);
}

// Medium Parcel limits
if (packageSize === 'medium_parcel') {
  assert(length ≤ 45 && width ≤ 35 && height ≤ 20);
  assert(weightKg ≤ 15);
}

// Large Parcel limits
if (packageSize === 'large_parcel') {
  assert(length ≤ 80 && width ≤ 60 && height ≤ 50);
  assert(weightKg ≤ 50);
}

// Heavy Cargo limits
if (packageSize === 'heavy_cargo') {
  assert(length ≤ 150 && width ≤ 100 && height ≤ 80);
  assert(weightKg ≤ 200);
}
```

---

## 📊 Complete Service Matrix

| Service | Sub-Types | Required Fields | Optional Fields | Locations |
|---------|-----------|----------------|-----------------|-----------|
| **Spraying** | 9 types | `sprayingSubType` | chemicalName, quantity, rate, height | 1 |
| **Seeding** | 9 types | `seedingSubType` | seedType, quantity, rate, depth | 1 |
| **Monitoring** | 12 types | `monitoringSubType` | frequency, analysisType, reportFormat | 1 |
| **Mapping** | 10 types | `mappingSubType` | infrastructure, resolution, format | 1 |
| **Surveillance** | 9 types | `surveillanceSubType` | infrastructure, shift, cameraType | 1 |
| **Videography** | 11 types | `videographySubType` | shotType, resolution, frameRate | 1 |
| **Delivery** | 14 types | `deliverySubType`, `weightKg`, `contents`, `dropoffLocation` | packageSize, dimensions, insurance | 2 |

---

## 🎯 Key Features

1. **Flexible Schema** - Single `serviceDetails` bag for all services
2. **Type Safety** - Strict TypeScript types for all sub-services
3. **Runtime Validation** - Service-specific validation at booking creation
4. **Backward Compatible** - Legacy `mappingType`, `surveillanceType`, `videographyType` still supported
5. **Extensible** - Easy to add new sub-services without schema changes
6. **Package Validation** - Automatic size/weight validation for delivery
7. **Comprehensive** - 73 total sub-service types across 7 main services

---

## 📝 Migration Notes

### Legacy Fields (Still Supported)

- `mappingType` → Use `mappingSubType` instead
- `surveillanceType` → Use `surveillanceSubType` instead
- `videographyType` → Use `videographySubType` instead

The system accepts BOTH formats for backward compatibility.

---

**Last Updated:** July 9, 2026  
**Version:** 2.0.0  
**Status:** ✅ Production Ready


---

## 🎯 Pilot Application System

### Overview

Complete system for customers to apply for pilot role and admins to review applications.

### Key Principle: One UID for Life

```
Firebase Auth UID (e.g., "2mZuHmKgcdjPUZPU3g3a")
├─ users/{uid}               ← Always exists
│  └─ roles: ["customer"]    → ["customer", "pilot"] after approval
├─ pilots/{uid}              ← Created on approval
│  └─ uid: {same-uid}
└─ pilotApplications/{applicationId}  ← Temporary application
   └─ uid: {same-uid}
```

### API Endpoints

#### Customer Endpoints

| Method | Endpoint | Description | Auth Role |
|--------|----------|-------------|-----------|
| POST | `/pilot-applications/submit` | Submit pilot application | customer |
| GET | `/pilot-applications/my-application` | Check application status | customer |
| DELETE | `/pilot-applications/:applicationId` | Withdraw pending application | customer |

#### Admin Endpoints

| Method | Endpoint | Description | Auth Role |
|--------|----------|-------------|-----------|
| GET | `/pilot-applications` | List all applications | admin |
| GET | `/pilot-applications/pending/count` | Get pending count | admin |
| GET | `/pilot-applications/:applicationId` | View application details | admin |
| PATCH | `/pilot-applications/:applicationId/review` | Approve/reject application | admin |
| PATCH | `/pilot-applications/:applicationId/documents/:type/verify` | Verify document | admin |

### Application Flow

```
1. Customer Registration
   └─ users/{uid} created with roles: ["customer"]

2. Apply for Pilot Role
   ├─ Upload documents via /files/upload-url and /files/register
   └─ Submit application via POST /pilot-applications/submit
      └─ pilotApplications/{applicationId} created (status: "pending")

3. Admin Reviews Application
   ├─ View via GET /pilot-applications?status=pending
   ├─ Verify documents via PATCH /pilot-applications/{id}/documents/{type}/verify
   └─ Approve/Reject via PATCH /pilot-applications/{id}/review

4. If Approved (Atomic Transaction)
   ├─ Update application: status → "approved"
   ├─ Update user: roles → ["customer", "pilot"]
   └─ Create pilot: pilots/{uid} with full pilot profile
```

### Submit Application Request

```json
POST /pilot-applications/submit
{
  "name": "Ramesh Patil",
  "age": 41,
  "phone": "+919220989863",
  "email": "ramesh@gmail.com",
  "address": "Pune",
  "pilotLicenseNumber": "DGCA-MA-2022-444633",
  "pilotExpiryDate": "2033-01-04T00:00:00.000Z",
  "aadhaarCardNumber": "2925 4862 8296",
  "panNumber": "PALGI5465N",
  "gstNumber": "27PALGI5465N1Z5",
  "serviceTypes": ["spraying", "mapping"],
  "specializations": ["Crop Spraying", "Monitoring"],
  "flightHours": 100,
  "experience": 3,
  "documents": [
    {
      "type": "aadhaar_front",
      "storagePath": "documents/2mZuHmKgcdjPUZPU3g3a/kyc/aadhaar_front/1704733200000_aadhaar_front.jpg",
      "downloadUrl": "https://storage.googleapis.com/...",
      "verified": "pending"
    },
    {
      "type": "aadhaar_back",
      "storagePath": "documents/.../aadhaar_back.jpg",
      "downloadUrl": "https://...",
      "verified": "pending"
    },
    {
      "type": "pilot_license",
      "storagePath": "documents/.../pilot_license.pdf",
      "downloadUrl": "https://...",
      "verified": "pending"
    },
    {
      "type": "gst_registration",
      "storagePath": "documents/.../gst.pdf",
      "downloadUrl": "https://...",
      "verified": "pending"
    }
  ]
}
```

### Approve Application Request

```json
PATCH /pilot-applications/PAPP000001/review
{
  "action": "approved",
  "reviewNotes": "All documents verified. Pilot license valid.",
  "assignedFleetManagerUid": "FM001"  // Optional
}
```

### Reject Application Request

```json
PATCH /pilot-applications/PAPP000001/review
{
  "action": "rejected",
  "rejectionReason": "Pilot license has expired",
  "reviewNotes": "Applicant needs to renew license before reapplying"
}
```

### Required Documents

| Document Type | Required | Description |
|--------------|----------|-------------|
| `aadhaar_front` | Yes | Aadhaar card front side |
| `aadhaar_back` | Yes | Aadhaar card back side |
| `pilot_license` | Yes | DGCA pilot license |
| `gst_registration` | Optional | GST registration certificate |
| `pilot_registration` | Optional | Pilot registration document |
| `medical_certificate` | Optional | Medical fitness certificate |

### Validation Rules

- **Age:** 18-70 years
- **License:** Must not be expired
- **Duplicate Prevention:** Cannot submit multiple pending applications
- **Role Check:** Cannot apply if already a pilot
- **File Size:** Maximum 50MB per document
- **File Types:** JPEG, PNG, WebP, PDF

### Application Status

| Status | Description |
|--------|-------------|
| `pending` | Application submitted, awaiting review |
| `approved` | Application approved, pilot profile created |
| `rejected` | Application rejected with reason |

### What Happens on Approval?

**Before:**
```json
users/{uid}:
  roles: ["customer"]

pilots/{uid}:
  (does not exist)

pilotApplications/PAPP000001:
  status: "pending"
```

**After (Atomic Transaction):**
```json
users/{uid}:
  roles: ["customer", "pilot"]  ← Updated

pilots/{uid}:  ← Created
  {
    "uid": "2mZuHmKgcdjPUZPU3g3a",
    "name": "Ramesh Patil",
    "status": "active",
    "rating": 0,
    "totalMissions": 0,
    ...
  }

pilotApplications/PAPP000001:
  status: "approved"  ← Updated
  reviewedBy: "ADMIN001"
  reviewedAt: "2026-07-09T14:00:00.000Z"
```

### Document Upload Process

1. **Request Upload URL**
   ```json
   POST /files/upload-url
   {
     "fileName": "aadhaar_front.jpg",
     "contentType": "image/jpeg",
     "fileSize": 245760,
     "bucket": "documents",
     "folder": "kyc/aadhaar_front"
   }
   ```

2. **Upload to Firebase Storage**
   - Client uploads directly using signed URL
   - No backend involvement in file transfer

3. **Register File Metadata**
   ```json
   POST /files/register
   {
     "fileName": "aadhaar_front.jpg",
     "storagePath": "documents/.../aadhaar_front.jpg",
     "downloadUrl": "https://...",
     "category": "kyc",
     "documentType": "aadhaar"
   }
   ```

### Error Responses

| Error | Status | Reason |
|-------|--------|--------|
| `ConflictException` | 409 | User already has pending/approved application or is already a pilot |
| `NotFoundException` | 404 | Application not found |
| `BadRequestException` | 400 | Invalid data or missing required fields |
| `ForbiddenException` | 403 | Unauthorized access to application |

### Firestore Collections

#### pilotApplications/{applicationId}
```json
{
  "applicationId": "PAPP000001",
  "uid": "2mZuHmKgcdjPUZPU3g3a",
  "status": "pending",
  "submittedAt": "2026-07-09T10:30:00.000Z",
  "reviewedBy": null,
  "reviewedAt": null,
  "personalInfo": {
    "name": "Ramesh Patil",
    "age": 41,
    "phone": "+919220989863",
    "email": "ramesh@gmail.com",
    "address": "Pune"
  },
  "pilotLicenseNumber": "DGCA-MA-2022-444633",
  "documents": { ... },
  "serviceTypes": ["spraying", "mapping"],
  "createdAt": "2026-07-09T10:30:00.000Z"
}
```

### Documentation Files

- **Implementation Details:** `/src/modules/pilot/PILOT_APPLICATION_FLOW.md`
- **Quick Reference:** `/src/modules/pilot/APPLICATION_README.md`
- **Summary:** `/PILOT_APPLICATION_IMPLEMENTATION_SUMMARY.md`
- **Tests:** `/src/modules/pilot/pilot-application.service.spec.ts`

### Next Steps

1. Deploy Firestore indexes: `firebase deploy --only firestore:indexes`
2. Test API endpoints with Postman
3. Implement frontend UI components
4. Configure notifications for status changes
5. Add analytics tracking

---
