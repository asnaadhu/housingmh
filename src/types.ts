export interface Building {
  id: string;
  name: string;
  code: string;
  description?: string;
  propertyCode?: string;
  createdAt: string;
}

export interface Floor {
  id: string;
  buildingId: string;
  number: number;
  label: string;
  description?: string;
  propertyCode?: string;
}

export interface RoomType {
  id: string;
  name: string;
  defaultBedCount: number;
  description?: string;
  badgeColor: string; // e.g., 'blue', 'emerald', 'purple', 'amber', 'rose', 'indigo'
}

export interface StatusCategory {
  id: string;
  name: string;
  type: 'room' | 'bed' | 'both';
  color: string; // Hex color or Tailwind color token, e.g., '#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'
  description?: string;
  isOccupiedState?: boolean;
  isMaintenanceState?: boolean;
}

export interface BedAssignment {
  memberId: string;
  memberName: string;
  employeeId: string;
  department: string;
  position?: string;
  email?: string;
  phone?: string;
  checkInDate: string;
  expectedCheckOutDate?: string;
  notes?: string;
}

export interface Bed {
  id: string;
  roomId: string;
  bedNumber: number; // e.g. 1, 2, 3
  label: string; // e.g., "Bed A", "Bed B", "Top Bunk"
  statusId: string; // ID from StatusCategory
  assignedTo?: BedAssignment | null;
  notes?: string;
  propertyCode?: string;
}

export interface Room {
  id: string;
  buildingId: string;
  floorId: string;
  roomNumber: string; // e.g., "101", "A-204"
  roomTypeId: string;
  totalBeds: number;
  statusId: string; // ID from StatusCategory
  notes?: string;
  lastCleaned?: string;
  propertyCode?: string;
  updatedAt: string;
}

export type MealServiceType = 'Breakfast' | 'Lunch' | 'Dinner' | 'Night Snack / Other';

export type WasteReason = string;

export interface FoodWasteLog {
  id: string;
  date: string; // YYYY-MM-DD
  mealService: MealServiceType;
  weightKg: number; // Weight strictly in Kilograms (Kg)
  diningHallLocation: string;
  preparedServings?: number;
  unconsumedServings?: number;
  wasteReason: WasteReason;
  shiftNotes?: string;
  loggedBy: string;
  loggedByUserId?: string;
  loggedByRole?: string;
  propertyCode?: string;
  createdAt: string;
  updatedAt: string;
}

export type UserRole = 'Global Admin' | 'Admin' | 'Property Manager' | 'Staff' | 'Tenant' | 'View Only (Dashboard & Reports)';

export type ModuleAccessLevel = 'full' | 'view' | 'none';

export interface ModulePermissions {
  dashboard: ModuleAccessLevel;
  availability: ModuleAccessLevel;
  foodWaste: ModuleAccessLevel;
  inventory: ModuleAccessLevel;
  assignments: ModuleAccessLevel;
  maintenance: ModuleAccessLevel;
  reports: ModuleAccessLevel;
  users: ModuleAccessLevel;
  settings: ModuleAccessLevel;
}

export interface UserProfile {
  id: string;
  email: string;
  password?: string;
  name: string;
  role: UserRole;
  employeeId?: string;
  department?: string;
  assignedBuildingIds?: string[]; // for Property Manager
  assignedBedId?: string; // for Tenant
  phone?: string;
  avatarUrl?: string;
  createdAt?: string;
  propertyCode?: string; // Multi-tenant property workspace isolation
  modulePermissions?: Partial<ModulePermissions>;
}

export type MaintenanceCategory =
  | 'Plumbing'
  | 'Electrical'
  | 'HVAC'
  | 'Appliance'
  | 'Furniture'
  | 'Structural'
  | 'Cleaning'
  | 'General';

export type MaintenanceUrgency = 'Low' | 'Medium' | 'High' | 'Urgent';

export type MaintenanceStatus = 'New' | 'In Progress' | 'Pending Parts' | 'Completed' | 'Cancelled';

export interface MaintenanceRequest {
  id: string;
  title: string;
  description: string;
  category: MaintenanceCategory;
  urgency: MaintenanceUrgency;
  status: MaintenanceStatus;
  buildingId: string;
  floorId: string;
  roomId: string;
  bedId?: string;
  propertyCode?: string;
  requesterId: string;
  requesterName: string;
  requesterRole: UserRole;
  contactPhone?: string;
  assignedTechnician?: string;
  assignedTechnicianPhone?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  resolutionNotes?: string;
  updateRoomBedStatusOnComplete?: boolean;
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  action:
    | 'ASSIGN'
    | 'CHECKOUT'
    | 'ROOM_CREATE'
    | 'ROOM_UPDATE'
    | 'STATUS_CHANGE'
    | 'SETTING_CHANGE'
    | 'MAINTENANCE_CREATE'
    | 'MAINTENANCE_UPDATE'
    | 'FOOD_WASTE_CREATE'
    | 'FOOD_WASTE_UPDATE'
    | 'FOOD_WASTE_DELETE'
    | 'USER_CHANGE'
    | 'LOGIN'
    | 'LOGOUT'
    | 'ROLE_SWITCH';
  title: string;
  details: string;
  actor?: string;
  actorEmail?: string;
  actorRole?: string;
  ipAddress?: string;
  browser?: string;
  deviceType?: string;
}

export interface TenantWorkspace {
  id: string;
  propertyCode: string; // e.g. VFAR, NREE, AVANI, MJR, LUX
  propertyName: string; // e.g. Avani+ Fares Maldives Resort
  status: 'ACTIVE' | 'SUSPENDED' | 'MAINTENANCE';
  region?: string;
  contactEmail?: string;
  databaseId?: string;
  createdAt: string;
  updatedAt?: string;
  totalBuildingsCount?: number;
  totalRoomsCount?: number;
  totalBedsCount?: number;
  activeUsersCount?: number;
}

export interface PropertyData {
  buildings: Building[];
  floors: Floor[];
  roomTypes: RoomType[];
  statuses: StatusCategory[];
  rooms: Room[];
  beds: Bed[];
  logs: ActivityLog[];
  users: UserProfile[];
  maintenanceRequests: MaintenanceRequest[];
  foodWasteLogs: FoodWasteLog[];
  tenants?: TenantWorkspace[];
  allUsers?: UserProfile[];
  allBuildings?: Building[];
  allBeds?: Bed[];
  allRooms?: Room[];
}

export type ActiveTab =
  | 'dashboard'
  | 'availability'
  | 'foodWaste'
  | 'inventory'
  | 'assignments'
  | 'maintenance'
  | 'reports'
  | 'users'
  | 'settings';

