export interface FleetManagerDto {
  fleetManagerId: string;
  fullName: string;
  mobile: string;
  email: string;
  firebaseUid?: string;
  status: 'ACTIVE' | 'INACTIVE';
  approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  assignedPilots: number;
  assignedDrones: number;
  activeBookings: number;
  completedBookings: number;
  totalRevenue: number;
  region: string;
  state: string;
  district: string;
  coverageRadius: number;
  licenseNumber: string;
  licenseType: string;
  licenseIssueDate: string;
  licenseExpiry: string;
  panNumber?: string;
  gstNumber?: string;
  bankDetails?: {
    accountNumber: string;
    ifscCode: string;
    accountHolderName: string;
    bankName: string;
  };
  rating: number;
  responseTime: number;
  alternatePhone?: string;
  address: string;
  pincode: string;
  createdAt: string;
  updatedAt: string;
  approvedAt?: string;
}

export interface PilotDto {
  pilotId: string;
  fullName: string;
  mobile: string;
  email: string;
  firebaseUid?: string;
  assignedFleetManagerId: string;
  currentDroneId?: string;
  currentBookingId?: string;
  status: 'AVAILABLE' | 'ON_MISSION' | 'ON_BREAK' | 'OFFLINE';
  licenseNumber: string;
  licenseExpiry: string;
  medicalCertificateExpiry: string;
  rating: number;
  flightHours: number;
  missions: number;
  completedMissions: number;
  onTimePercentage: number;
  safetyScore: number;
  state: string;
  district: string;
  address: string;
  createdAt: string;
  updatedAt: string;
  lastActiveAt?: string;
}

export interface DroneDto {
  droneId: string;
  model: string;
  manufacturer: string;
  serialNumber: string;
  assignedFleetManagerId: string;
  currentPilotId?: string;
  currentBookingId?: string;
  status: 'AVAILABLE' | 'IN_USE' | 'MAINTENANCE' | 'OUT_OF_SERVICE';
  serviceCapabilities: string[];
  specifications: Record<string, any>;
  batteryHealth: number;
  batteryCycles: number;
  batteryCapacity: number;
  flightHours: number;
  missions: number;
  completedMissions: number;
  lastMaintenance?: string;
  nextMaintenance?: string;
  maintenanceInterval: number;
  totalMaintenanceCount: number;
  registrationNumber: string;
  registrationExpiry: string;
  insuranceNumber: string;
  insuranceExpiry: string;
  insuranceProvider: string;
  purchaseDate: string;
  purchasePrice: number;
  warrantyExpiry: string;
  location?: {
    lat: number;
    lng: number;
  };
  homeBase?: {
    lat: number;
    lng: number;
  };
  averageFlightTime: number;
  averageAreaCovered: number;
  fuelEfficiency: number;
  overallCondition: string;
  createdAt: string;
  updatedAt: string;
  lastFlightAt?: string;
}

export interface BookingDto {
  bookingId: string;
  bookingNumber: string;
  bookingSource: string;
  createdById: string;
  customerId: string;
  salesAggregatorId?: string;
  fleetManagerId?: string;
  pilotId?: string;
  droneId?: string;
  farmId: string;
  serviceType: string;
  serviceSubType?: string;
  chemicalType?: string;
  cropType: string;
  cropStage: string;
  area: number;
  unit: string;
  estimatedDurationMinutes?: number;
  actualDurationMinutes?: number;
  priority: string;
  preferredDate: string;
  preferredTimeSlot?: string;
  scheduledStart?: string;
  scheduledEnd?: string;
  specialInstructions?: string;
  location: {
    state: string;
    district: string;
    taluka: string;
    village: string;
    lat: number;
    lng: number;
  };
  weatherSnapshot?: {
    temperature: number;
    humidity: number;
    windSpeed: number;
    safeToFly: boolean;
  };
  flightRestriction?: {
    safe: boolean;
    airspace: string;
  };
  price: {
    basePrice: number;
    chemicalCost?: number;
    travelCost?: number;
    tax: number;
    discount?: number;
    total: number;
  };
  paymentStatus: string;
  bookingStatus: string;
  missionStatus?: string;
  invoiceId?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface MaintenanceTicketDto {
  ticketId: string;
  ticketNumber: string;
  category: string;
  droneId: string;
  fleetManagerId: string;
  title: string;
  description: string;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  status: 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  reportedBy: string;
  assignedTo?: string;
  assignedTechnician?: string;
  estimatedCost?: number;
  actualCost?: number;
  estimatedDuration?: number;
  actualDuration?: number;
  partsReplaced?: string[];
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  resolution?: string;
}

export interface SupportTicketDto {
  ticketId: string;
  ticketNumber: string;
  category: string;
  customerId: string;
  bookingId?: string;
  subject: string;
  description: string;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  status: 'PENDING' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  submittedBy: string;
  assignedTo?: string;
  channel: string;
  responseTime?: number;
  resolutionTime?: number;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  closedAt?: string;
  resolution?: string;
  closeReason?: string;
  customerSatisfactionRating?: number;
}

export interface PaginationDto {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface FleetManagerListResponseDto {
  data: FleetManagerDto[];
  pagination: PaginationDto;
}

export interface FleetManagerProfileResponseDto {
  fleetManager: FleetManagerDto;
}

export interface FleetManagerStatsResponseDto {
  period: string;
  startDate: string;
  endDate: string;
  bookings: {
    total: number;
    completed: number;
    active: number;
    cancelled: number;
  };
  revenue: {
    total: number;
    average: number;
  };
}

export interface FleetManagerDashboardResponseDto {
  fleetManager: FleetManagerDto;
  summary: {
    totalPilots: number;
    totalDrones: number;
    totalBookings: number;
    completedBookings: number;
    totalRevenue: number;
    averageCustomerRating: number;
  };
  pilots: {
    total: number;
    byStatus: {
      AVAILABLE: number;
      ON_MISSION: number;
      ON_BREAK: number;
      OFFLINE: number;
    };
  };
  drones: {
    total: number;
    byStatus: {
      AVAILABLE: number;
      IN_USE: number;
      MAINTENANCE: number;
      OUT_OF_SERVICE: number;
    };
  };
  bookings: {
    total: number;
    byStatus: {
      PENDING: number;
      CONFIRMED: number;
      IN_PROGRESS: number;
      COMPLETED: number;
      CANCELLED: number;
    };
  };
  maintenance: {
    total: number;
    byStatus: {
      OPEN: number;
      IN_PROGRESS: number;
      COMPLETED: number;
    };
    byPriority: {
      URGENT: number;
      HIGH: number;
      NORMAL: number;
      LOW: number;
    };
  };
  support: {
    total: number;
    byStatus: {
      PENDING: number;
      IN_PROGRESS: number;
      RESOLVED: number;
      CLOSED: number;
    };
    averageRating: number;
  };
}
