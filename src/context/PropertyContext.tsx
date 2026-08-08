import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  PropertyData,
  Building,
  Floor,
  RoomType,
  StatusCategory,
  Room,
  Bed,
  BedAssignment,
  ActivityLog,
  UserProfile,
  UserRole,
  MaintenanceRequest,
  MaintenanceCategory,
  MaintenanceUrgency,
  FoodWasteLog,
  TenantWorkspace,
} from '../types';
import { INITIAL_PROPERTY_DATA } from '../data/initialData';
import { getFullClientMeta } from '../utils/deviceInfo';

interface RawCollectionsData {
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
  tenants: TenantWorkspace[];
}

interface PropertyContextType {
  data: PropertyData;
  isLoading: boolean;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
  toggleMobileMenu: () => void;

  // Building Actions
  addBuilding: (name: string, code: string, description?: string) => Promise<void>;
  updateBuilding: (id: string, name: string, code: string, description?: string) => Promise<void>;
  deleteBuilding: (id: string, force?: boolean) => Promise<boolean>;

  // Floor Actions
  addFloor: (buildingId: string, number: number, label: string, description?: string) => Promise<void>;
  updateFloor: (id: string, number: number, label: string, description?: string) => Promise<void>;
  deleteFloor: (id: string, force?: boolean) => Promise<boolean>;

  // Room Type Actions
  addRoomType: (name: string, defaultBedCount: number, description?: string, badgeColor?: string) => Promise<void>;
  updateRoomType: (id: string, name: string, defaultBedCount: number, description?: string, badgeColor?: string) => Promise<void>;
  deleteRoomType: (id: string, force?: boolean) => Promise<boolean>;

  // Status Category Actions
  addStatusCategory: (
    name: string,
    type: 'room' | 'bed' | 'both',
    color: string,
    description?: string,
    isOccupiedState?: boolean,
    isMaintenanceState?: boolean
  ) => Promise<void>;
  updateStatusCategory: (
    id: string,
    name: string,
    type: 'room' | 'bed' | 'both',
    color: string,
    description?: string,
    isOccupiedState?: boolean,
    isMaintenanceState?: boolean
  ) => Promise<void>;
  deleteStatusCategory: (id: string, force?: boolean) => Promise<boolean>;

  // Room Actions
  addRoom: (
    buildingId: string,
    floorId: string,
    roomNumber: string,
    roomTypeId: string,
    customBedCount?: number,
    notes?: string
  ) => Promise<void>;
  updateRoom: (
    id: string,
    roomNumber: string,
    roomTypeId: string,
    totalBeds: number,
    statusId: string,
    notes?: string
  ) => Promise<void>;
  deleteRoom: (id: string) => Promise<void>;

  // Bed & Assignment Actions
  assignBed: (bedId: string, memberData: BedAssignment) => Promise<void>;
  checkoutBed: (bedId: string) => Promise<void>;
  updateBedStatus: (bedId: string, statusId: string, notes?: string) => Promise<void>;

  // Maintenance Request Actions
  addMaintenanceRequest: (reqData: {
    title: string;
    description: string;
    category: MaintenanceCategory;
    urgency: MaintenanceUrgency;
    buildingId: string;
    floorId: string;
    roomId: string;
    bedId?: string;
    requesterId: string;
    requesterName: string;
    requesterRole: UserRole;
    contactPhone?: string;
    setRoomBedMaintenance?: boolean;
  }) => Promise<void>;
  updateMaintenanceRequest: (id: string, updates: Partial<MaintenanceRequest>) => Promise<void>;
  completeMaintenanceRequest: (
    id: string,
    resolutionNotes?: string,
    revertRoomBedStatus?: boolean
  ) => Promise<void>;
  deleteMaintenanceRequest: (id: string) => Promise<void>;

  // Food Waste Tracker Actions
  addFoodWasteLog: (logData: Omit<FoodWasteLog, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateFoodWasteLog: (id: string, updates: Partial<FoodWasteLog>) => Promise<void>;
  deleteFoodWasteLog: (id: string) => Promise<void>;

  // User Management Actions
  addUser: (userData: Omit<UserProfile, 'id' | 'createdAt'>) => Promise<void>;
  updateUser: (id: string, updates: Partial<UserProfile>) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;

  // Multi-Tenant Database Actions
  activeTenantCode: string;
  setActiveTenantCode: (code: string) => void;
  createTenantWorkspace: (newTenant: {
    propertyCode: string;
    propertyName: string;
    region?: string;
    contactEmail?: string;
    templateMode: 'clean' | 'seed' | 'clone';
    initialAdminEmail?: string;
    initialAdminPassword?: string;
  }) => Promise<void>;
  updateTenantStatus: (propertyCode: string, status: 'ACTIVE' | 'SUSPENDED' | 'MAINTENANCE') => Promise<void>;
  updateTenantWorkspace: (
    propertyCode: string,
    updates: Partial<Omit<TenantWorkspace, 'id' | 'createdAt'>>
  ) => Promise<void>;
  deleteTenantWorkspace: (propertyCode: string) => Promise<boolean>;

  // Global Helpers
  writeLog: (
    action: ActivityLog['action'],
    title: string,
    details: string,
    actorInfo?: {
      actor?: string;
      actorEmail?: string;
      actorRole?: string;
      ipAddress?: string;
      browser?: string;
      deviceType?: string;
    }
  ) => Promise<void>;
  resetToDefaults: () => Promise<void>;
  saveDataToServer: (newData: PropertyData) => Promise<void>;
}

const PropertyContext = createContext<PropertyContextType | undefined>(undefined);

const STORAGE_KEY = 'haharu_property_raw_data_v3';

// Recalculates room status based on its beds
export const recalculateRoomStatus = (
  allBeds: Bed[],
  allStatuses: StatusCategory[],
  roomId: string,
  targetBedStatusId: string
): string => {
  const targetStatus = allStatuses.find((s) => s.id === targetBedStatusId);
  if (targetStatus?.isMaintenanceState === true) {
    return 'status-maintenance';
  }

  const roomBeds = allBeds.filter((b) => b.roomId === roomId);
  if (roomBeds.length === 0) return 'status-vacant';

  const occupiedBeds = roomBeds.filter((b) => {
    const statusObj = allStatuses.find((s) => s.id === b.statusId);
    return b.assignedTo != null || statusObj?.isOccupiedState === true;
  }).length;

  const maintenanceBeds = roomBeds.filter((b) => {
    const statusObj = allStatuses.find((s) => s.id === b.statusId);
    return statusObj?.isMaintenanceState === true;
  }).length;

  if (maintenanceBeds === roomBeds.length) {
    return 'status-maintenance';
  }

  if (occupiedBeds === 0) {
    return 'status-vacant';
  }

  if (occupiedBeds === roomBeds.length) {
    return 'status-occupied';
  }

  return 'status-partially';
};

const getInitialRawData = (): RawCollectionsData => {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (parsed && Array.isArray(parsed.buildings)) {
        return {
          buildings: parsed.buildings || [],
          floors: parsed.floors || [],
          roomTypes: parsed.roomTypes || INITIAL_PROPERTY_DATA.roomTypes,
          statuses: parsed.statuses || INITIAL_PROPERTY_DATA.statuses,
          rooms: parsed.rooms || [],
          beds: parsed.beds || [],
          logs: parsed.logs || [],
          users: parsed.users || INITIAL_PROPERTY_DATA.users,
          maintenanceRequests: parsed.maintenanceRequests || [],
          foodWasteLogs: parsed.foodWasteLogs || [],
          tenants: parsed.tenants && parsed.tenants.length > 0 ? parsed.tenants : (INITIAL_PROPERTY_DATA.tenants || []),
        };
      }
    } catch (e) {
      console.error('Error parsing stored property raw data', e);
    }
  }

  return {
    buildings: INITIAL_PROPERTY_DATA.buildings,
    floors: INITIAL_PROPERTY_DATA.floors,
    roomTypes: INITIAL_PROPERTY_DATA.roomTypes,
    statuses: INITIAL_PROPERTY_DATA.statuses,
    rooms: INITIAL_PROPERTY_DATA.rooms,
    beds: INITIAL_PROPERTY_DATA.beds,
    logs: INITIAL_PROPERTY_DATA.logs,
    users: INITIAL_PROPERTY_DATA.users,
    maintenanceRequests: INITIAL_PROPERTY_DATA.maintenanceRequests,
    foodWasteLogs: INITIAL_PROPERTY_DATA.foodWasteLogs || [],
    tenants: INITIAL_PROPERTY_DATA.tenants || [],
  };
};

const computeFilteredData = (raw: RawCollectionsData, tenantCode: string): PropertyData => {
  const code = tenantCode || 'VFAR';

  const sortedLogs = [...raw.logs].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const sortedWasteLogs = [...raw.foodWasteLogs].sort(
    (a, b) => new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime()
  );

  const filteredBldgs = code === 'ALL'
    ? raw.buildings
    : raw.buildings.filter((b) => (b.propertyCode || 'VFAR') === code);

  const filteredFloors = code === 'ALL'
    ? raw.floors
    : raw.floors.filter(
        (f) => (f.propertyCode || 'VFAR') === code || filteredBldgs.some((b) => b.id === f.buildingId)
      );

  const filteredRooms = code === 'ALL'
    ? raw.rooms
    : raw.rooms.filter(
        (r) => (r.propertyCode || 'VFAR') === code || filteredBldgs.some((b) => b.id === r.buildingId)
      );

  const filteredBeds = code === 'ALL'
    ? raw.beds
    : raw.beds.filter(
        (b) => (b.propertyCode || 'VFAR') === code || filteredRooms.some((r) => r.id === b.roomId)
      );

  const filteredMaint = code === 'ALL'
    ? raw.maintenanceRequests
    : raw.maintenanceRequests.filter(
        (m) => (m.propertyCode || 'VFAR') === code || filteredRooms.some((r) => r.id === m.roomId)
      );

  const filteredWaste = code === 'ALL'
    ? sortedWasteLogs
    : sortedWasteLogs.filter((w) => (w.propertyCode || 'VFAR') === code);

  const filteredUsers = code === 'ALL'
    ? raw.users
    : raw.users.filter((u) => u.role === 'Global Admin' || (u.propertyCode || 'VFAR') === code);

  return {
    buildings: filteredBldgs,
    floors: filteredFloors,
    roomTypes: raw.roomTypes,
    statuses: raw.statuses,
    rooms: filteredRooms,
    beds: filteredBeds,
    logs: sortedLogs,
    users: filteredUsers,
    maintenanceRequests: filteredMaint,
    foodWasteLogs: filteredWaste,
    tenants: raw.tenants && raw.tenants.length > 0 ? raw.tenants : (INITIAL_PROPERTY_DATA.tenants || []),
    allUsers: raw.users,
    allBuildings: raw.buildings,
    allBeds: raw.beds,
    allRooms: raw.rooms,
  };
};

export const PropertyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [activeTenantCode, setActiveTenantCodeState] = useState<string>(() => {
    return localStorage.getItem('haharu_active_property_code') || 'VFAR';
  });

  const [rawCollections, setRawCollections] = useState<RawCollectionsData>(getInitialRawData);
  const [data, setData] = useState<PropertyData>(() => computeFilteredData(rawCollections, activeTenantCode));
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [activeTab, setActiveTabState] = useState<string>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  const setActiveTenantCode = (code: string) => {
    setActiveTenantCodeState(code);
    localStorage.setItem('haharu_active_property_code', code);
  };

  const setActiveTab = (tab: string) => {
    setActiveTabState(tab);
    setIsMobileMenuOpen(false);
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen((prev) => !prev);
  };

  // Sync data when rawCollections or activeTenantCode changes
  useEffect(() => {
    const computed = computeFilteredData(rawCollections, activeTenantCode);
    setData(computed);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rawCollections));
  }, [rawCollections, activeTenantCode]);

  const updateRaw = (updater: (prev: RawCollectionsData) => RawCollectionsData) => {
    setRawCollections((prev) => updater(prev));
  };

  // Log Writer Helper
  const writeLog = async (
    action: ActivityLog['action'],
    title: string,
    details: string,
    actorInfo?: {
      actor?: string;
      actorEmail?: string;
      actorRole?: string;
      ipAddress?: string;
      browser?: string;
      deviceType?: string;
    }
  ) => {
    const clientMeta = getFullClientMeta();
    const logId = `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const newLog: ActivityLog = {
      id: logId,
      timestamp: new Date().toISOString(),
      action,
      title,
      details,
      actor: actorInfo?.actor || 'Admin',
      actorEmail: actorInfo?.actorEmail,
      actorRole: actorInfo?.actorRole,
      ipAddress: actorInfo?.ipAddress || clientMeta.ipAddress,
      browser: actorInfo?.browser || clientMeta.browser,
      deviceType: actorInfo?.deviceType || clientMeta.deviceType,
    };

    updateRaw((prev) => ({
      ...prev,
      logs: [newLog, ...prev.logs],
    }));
  };

  // Building Actions
  const addBuilding = async (name: string, code: string, description?: string) => {
    const newBuilding: Building = {
      id: `bldg-${Date.now()}`,
      name,
      code,
      description,
      propertyCode: activeTenantCode,
      createdAt: new Date().toISOString(),
    };

    updateRaw((prev) => ({
      ...prev,
      buildings: [...prev.buildings, newBuilding],
    }));

    await writeLog('SETTING_CHANGE', 'Building Added', `Added building ${name} (${code})`);
  };

  const updateBuilding = async (id: string, name: string, code: string, description?: string) => {
    updateRaw((prev) => ({
      ...prev,
      buildings: prev.buildings.map((b) =>
        b.id === id ? { ...b, name, code, description: description || '' } : b
      ),
    }));

    await writeLog('SETTING_CHANGE', 'Building Updated', `Updated building details for ${name}`);
  };

  const deleteBuilding = async (id: string, force = false): Promise<boolean> => {
    const associatedRooms = rawCollections.rooms.filter((r) => r.buildingId === id);
    if (associatedRooms.length > 0 && !force) {
      return false;
    }

    const associatedFloors = rawCollections.floors.filter((f) => f.buildingId === id);
    const deletedRoomIds = associatedRooms.map((r) => r.id);
    const associatedBeds = rawCollections.beds.filter((b) => deletedRoomIds.includes(b.roomId));
    const deletedBedIds = associatedBeds.map((b) => b.id);

    updateRaw((prev) => ({
      ...prev,
      buildings: prev.buildings.filter((b) => b.id !== id),
      floors: prev.floors.filter((f) => f.buildingId !== id),
      rooms: prev.rooms.filter((r) => r.buildingId !== id),
      beds: prev.beds.filter((b) => !deletedRoomIds.includes(b.roomId)),
      users: prev.users.map((u) => {
        const nextBedId = u.assignedBedId && deletedBedIds.includes(u.assignedBedId) ? null : u.assignedBedId;
        const nextBuildings = u.assignedBuildingIds ? u.assignedBuildingIds.filter((bId) => bId !== id) : [];
        return { ...u, assignedBedId: nextBedId, assignedBuildingIds: nextBuildings };
      }),
    }));

    await writeLog('SETTING_CHANGE', 'Building Removed', `Deleted building ID ${id}`);
    return true;
  };

  // Floor Actions
  const addFloor = async (buildingId: string, number: number, label: string, description?: string) => {
    const newFloor: Floor = {
      id: `flr-${Date.now()}`,
      buildingId,
      number,
      label,
      description,
      propertyCode: activeTenantCode,
    };

    updateRaw((prev) => ({
      ...prev,
      floors: [...prev.floors, newFloor],
    }));

    await writeLog('SETTING_CHANGE', 'Floor Added', `Added floor ${label} (#${number})`);
  };

  const updateFloor = async (id: string, number: number, label: string, description?: string) => {
    updateRaw((prev) => ({
      ...prev,
      floors: prev.floors.map((f) =>
        f.id === id ? { ...f, number, label, description: description || '' } : f
      ),
    }));

    await writeLog('SETTING_CHANGE', 'Floor Updated', `Updated floor ${label}`);
  };

  const deleteFloor = async (id: string, force = false): Promise<boolean> => {
    const associatedRooms = rawCollections.rooms.filter((r) => r.floorId === id);
    if (associatedRooms.length > 0 && !force) {
      return false;
    }

    const deletedRoomIds = associatedRooms.map((r) => r.id);

    updateRaw((prev) => ({
      ...prev,
      floors: prev.floors.filter((f) => f.id !== id),
      rooms: prev.rooms.filter((r) => r.floorId !== id),
      beds: prev.beds.filter((b) => !deletedRoomIds.includes(b.roomId)),
    }));

    await writeLog('SETTING_CHANGE', 'Floor Removed', `Deleted floor ID ${id}`);
    return true;
  };

  // Room Type Actions
  const addRoomType = async (
    name: string,
    defaultBedCount: number,
    description?: string,
    badgeColor: string = '#3b82f6'
  ) => {
    const newRoomType: RoomType = {
      id: `rtype-${Date.now()}`,
      name,
      defaultBedCount,
      description,
      badgeColor,
    };

    updateRaw((prev) => ({
      ...prev,
      roomTypes: [...prev.roomTypes, newRoomType],
    }));

    await writeLog('SETTING_CHANGE', 'Room Type Added', `Added custom type ${name}`);
  };

  const updateRoomType = async (
    id: string,
    name: string,
    defaultBedCount: number,
    description?: string,
    badgeColor?: string
  ) => {
    updateRaw((prev) => ({
      ...prev,
      roomTypes: prev.roomTypes.map((rt) =>
        rt.id === id
          ? { ...rt, name, defaultBedCount, description: description || '', badgeColor: badgeColor || '#3b82f6' }
          : rt
      ),
    }));

    await writeLog('SETTING_CHANGE', 'Room Type Updated', `Updated room type ${name}`);
  };

  const deleteRoomType = async (id: string, force = false): Promise<boolean> => {
    const associatedRooms = rawCollections.rooms.filter((r) => r.roomTypeId === id);
    if (associatedRooms.length > 0 && !force) {
      return false;
    }

    const fallbackType = rawCollections.roomTypes.find((rt) => rt.id !== id);

    updateRaw((prev) => ({
      ...prev,
      roomTypes: prev.roomTypes.filter((rt) => rt.id !== id),
      rooms: prev.rooms.map((r) =>
        r.roomTypeId === id ? { ...r, roomTypeId: fallbackType?.id || 'rtype-std' } : r
      ),
    }));

    await writeLog('SETTING_CHANGE', 'Room Type Deleted', `Deleted room type ID ${id}`);
    return true;
  };

  // Status Category Actions
  const addStatusCategory = async (
    name: string,
    type: 'room' | 'bed' | 'both',
    color: string,
    description?: string,
    isOccupiedState: boolean = false,
    isMaintenanceState: boolean = false
  ) => {
    const newStatus: StatusCategory = {
      id: `status-${Date.now()}`,
      name,
      type,
      color,
      description,
      isOccupiedState,
      isMaintenanceState,
    };

    updateRaw((prev) => ({
      ...prev,
      statuses: [...prev.statuses, newStatus],
    }));

    await writeLog('SETTING_CHANGE', 'Status Category Added', `Added status '${name}'`);
  };

  const updateStatusCategory = async (
    id: string,
    name: string,
    type: 'room' | 'bed' | 'both',
    color: string,
    description?: string,
    isOccupiedState?: boolean,
    isMaintenanceState?: boolean
  ) => {
    updateRaw((prev) => ({
      ...prev,
      statuses: prev.statuses.map((s) =>
        s.id === id
          ? {
              ...s,
              name,
              type,
              color,
              description: description || '',
              isOccupiedState: isOccupiedState ?? false,
              isMaintenanceState: isMaintenanceState ?? false,
            }
          : s
      ),
    }));

    await writeLog('SETTING_CHANGE', 'Status Category Updated', `Updated status '${name}'`);
  };

  const deleteStatusCategory = async (id: string, force = false): Promise<boolean> => {
    const inUseRooms = rawCollections.rooms.filter((r) => r.statusId === id);
    const inUseBeds = rawCollections.beds.filter((b) => b.statusId === id);
    if ((inUseRooms.length > 0 || inUseBeds.length > 0) && !force) {
      return false;
    }

    updateRaw((prev) => ({
      ...prev,
      statuses: prev.statuses.filter((s) => s.id !== id),
      rooms: prev.rooms.map((r) => (r.statusId === id ? { ...r, statusId: 'status-vacant' } : r)),
      beds: prev.beds.map((b) => (b.statusId === id ? { ...b, statusId: 'status-vacant' } : b)),
    }));

    await writeLog('SETTING_CHANGE', 'Status Category Deleted', `Deleted status category ID ${id}`);
    return true;
  };

  // Room Actions
  const addRoom = async (
    buildingId: string,
    floorId: string,
    roomNumber: string,
    roomTypeId: string,
    customBedCount?: number,
    notes?: string
  ) => {
    const roomType = rawCollections.roomTypes.find((rt) => rt.id === roomTypeId);
    const bedCount = customBedCount || roomType?.defaultBedCount || 1;
    const roomId = `rm-${Date.now()}`;

    const newRoom: Room = {
      id: roomId,
      buildingId,
      floorId,
      roomNumber,
      roomTypeId,
      totalBeds: bedCount,
      statusId: 'status-vacant',
      notes,
      lastCleaned: new Date().toISOString().split('T')[0],
      propertyCode: activeTenantCode,
      updatedAt: new Date().toISOString(),
    };

    const newBeds: Bed[] = Array.from({ length: bedCount }, (_, i) => ({
      id: `bed-${roomId}-${i + 1}`,
      roomId,
      bedNumber: i + 1,
      label: bedCount === 1 ? 'Master Bed' : `Bed ${i + 1}`,
      statusId: 'status-vacant',
      assignedTo: null,
      propertyCode: activeTenantCode,
    }));

    updateRaw((prev) => ({
      ...prev,
      rooms: [...prev.rooms, newRoom],
      beds: [...prev.beds, ...newBeds],
    }));

    await writeLog('ROOM_CREATE', 'Room Created', `Created Room #${roomNumber} with ${bedCount} beds`);
  };

  const updateRoom = async (
    id: string,
    roomNumber: string,
    roomTypeId: string,
    totalBeds: number,
    statusId: string,
    notes?: string
  ) => {
    updateRaw((prev) => {
      let currentBeds = prev.beds.filter((b) => b.roomId === id);
      let updatedBeds = [...prev.beds];

      if (totalBeds > currentBeds.length) {
        const addedCount = totalBeds - currentBeds.length;
        for (let i = 0; i < addedCount; i++) {
          const num = currentBeds.length + i + 1;
          const newBed: Bed = {
            id: `bed-${id}-${num}`,
            roomId: id,
            bedNumber: num,
            label: `Bed ${num}`,
            statusId: 'status-vacant',
            assignedTo: null,
          };
          updatedBeds.push(newBed);
        }
      } else if (totalBeds < currentBeds.length) {
        const bedsToRemove = currentBeds.slice(totalBeds).map((b) => b.id);
        updatedBeds = updatedBeds.filter((b) => !bedsToRemove.includes(b.id));
      }

      const updatedRooms = prev.rooms.map((r) =>
        r.id === id
          ? {
              ...r,
              roomNumber,
              roomTypeId,
              totalBeds,
              statusId,
              notes: notes || '',
              updatedAt: new Date().toISOString(),
            }
          : r
      );

      return {
        ...prev,
        rooms: updatedRooms,
        beds: updatedBeds,
      };
    });

    await writeLog('ROOM_UPDATE', 'Room Updated', `Updated Room #${roomNumber}`);
  };

  const deleteRoom = async (id: string) => {
    const room = rawCollections.rooms.find((r) => r.id === id);

    updateRaw((prev) => ({
      ...prev,
      rooms: prev.rooms.filter((r) => r.id !== id),
      beds: prev.beds.filter((b) => b.roomId !== id),
    }));

    await writeLog('ROOM_UPDATE', 'Room Deleted', `Deleted Room #${room?.roomNumber || id}`);
  };

  // Bed & Assignment Actions
  const assignBed = async (bedId: string, memberData: BedAssignment) => {
    const targetBed = rawCollections.beds.find((b) => b.id === bedId);
    if (!targetBed) return;

    updateRaw((prev) => {
      const nextBeds = prev.beds.map((b) =>
        b.id === bedId ? { ...b, statusId: 'status-occupied', assignedTo: memberData } : b
      );
      const calcRoomStatus = recalculateRoomStatus(nextBeds, prev.statuses, targetBed.roomId, 'status-occupied');
      const nextRooms = prev.rooms.map((r) =>
        r.id === targetBed.roomId ? { ...r, statusId: calcRoomStatus, updatedAt: new Date().toISOString() } : r
      );

      return {
        ...prev,
        beds: nextBeds,
        rooms: nextRooms,
      };
    });

    const room = rawCollections.rooms.find((r) => r.id === targetBed.roomId);
    await writeLog(
      'ASSIGN',
      'Team Member Assigned',
      `Assigned ${memberData.memberName} to Room #${room?.roomNumber || ''} - ${targetBed.label}`
    );
  };

  const checkoutBed = async (bedId: string) => {
    const targetBed = rawCollections.beds.find((b) => b.id === bedId);
    if (!targetBed) return;

    const assignedName = targetBed.assignedTo?.memberName || 'Member';

    updateRaw((prev) => {
      const nextBeds = prev.beds.map((b) =>
        b.id === bedId ? { ...b, statusId: 'status-vacant', assignedTo: null } : b
      );
      const calcRoomStatus = recalculateRoomStatus(nextBeds, prev.statuses, targetBed.roomId, 'status-vacant');
      const nextRooms = prev.rooms.map((r) =>
        r.id === targetBed.roomId ? { ...r, statusId: calcRoomStatus, updatedAt: new Date().toISOString() } : r
      );

      return {
        ...prev,
        beds: nextBeds,
        rooms: nextRooms,
      };
    });

    const room = rawCollections.rooms.find((r) => r.id === targetBed.roomId);
    await writeLog(
      'CHECKOUT',
      'Bed Checkout',
      `Checked out ${assignedName} from Room #${room?.roomNumber || ''} - ${targetBed.label}`
    );
  };

  const updateBedStatus = async (bedId: string, statusId: string, notes?: string) => {
    const targetBed = rawCollections.beds.find((b) => b.id === bedId);
    if (!targetBed) return;

    updateRaw((prev) => {
      const nextBeds = prev.beds.map((b) =>
        b.id === bedId ? { ...b, statusId, notes: notes ?? b.notes } : b
      );
      const calcRoomStatus = recalculateRoomStatus(nextBeds, prev.statuses, targetBed.roomId, statusId);
      const nextRooms = prev.rooms.map((r) =>
        r.id === targetBed.roomId ? { ...r, statusId: calcRoomStatus, updatedAt: new Date().toISOString() } : r
      );

      return {
        ...prev,
        beds: nextBeds,
        rooms: nextRooms,
      };
    });

    const statusObj = rawCollections.statuses.find((s) => s.id === statusId);
    await writeLog(
      'STATUS_CHANGE',
      'Bed Status Change',
      `Bed ${targetBed.label} status changed to ${statusObj?.name || statusId}`
    );
  };

  // Maintenance Request Actions
  const addMaintenanceRequest = async (reqData: {
    title: string;
    description: string;
    category: MaintenanceCategory;
    urgency: MaintenanceUrgency;
    buildingId: string;
    floorId: string;
    roomId: string;
    bedId?: string;
    requesterId: string;
    requesterName: string;
    requesterRole: UserRole;
    contactPhone?: string;
    setRoomBedMaintenance?: boolean;
  }) => {
    const newReqId = `maint-${Date.now()}`;
    const newRequest: MaintenanceRequest = {
      id: newReqId,
      title: reqData.title,
      description: reqData.description,
      category: reqData.category,
      urgency: reqData.urgency,
      status: 'New',
      buildingId: reqData.buildingId,
      floorId: reqData.floorId,
      roomId: reqData.roomId,
      bedId: reqData.bedId,
      propertyCode: activeTenantCode,
      requesterId: reqData.requesterId,
      requesterName: reqData.requesterName,
      requesterRole: reqData.requesterRole,
      contactPhone: reqData.contactPhone,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      updateRoomBedStatusOnComplete: reqData.setRoomBedMaintenance ?? true,
    };

    updateRaw((prev) => {
      const nextMaint = [newRequest, ...prev.maintenanceRequests];
      let nextBeds = prev.beds;
      let nextRooms = prev.rooms;

      if (reqData.setRoomBedMaintenance) {
        if (reqData.bedId) {
          nextBeds = prev.beds.map((b) =>
            b.id === reqData.bedId ? { ...b, statusId: 'status-maintenance' } : b
          );
        }
        if (reqData.roomId) {
          nextRooms = prev.rooms.map((r) =>
            r.id === reqData.roomId ? { ...r, statusId: 'status-maintenance' } : r
          );
        }
      }

      return {
        ...prev,
        maintenanceRequests: nextMaint,
        beds: nextBeds,
        rooms: nextRooms,
      };
    });

    await writeLog(
      'MAINTENANCE_CREATE',
      'Maintenance Request Created',
      `Created [${reqData.urgency}] request: "${reqData.title}" by ${reqData.requesterName}`
    );
  };

  const updateMaintenanceRequest = async (id: string, updates: Partial<MaintenanceRequest>) => {
    const targetReq = rawCollections.maintenanceRequests.find((r) => r.id === id);

    updateRaw((prev) => ({
      ...prev,
      maintenanceRequests: prev.maintenanceRequests.map((r) =>
        r.id === id ? { ...r, ...updates, updatedAt: new Date().toISOString() } : r
      ),
    }));

    await writeLog(
      'MAINTENANCE_UPDATE',
      'Maintenance Request Updated',
      `Updated maintenance request "${targetReq?.title || id}"`
    );
  };

  const completeMaintenanceRequest = async (
    id: string,
    resolutionNotes?: string,
    revertRoomBedStatus: boolean = true
  ) => {
    const targetReq = rawCollections.maintenanceRequests.find((r) => r.id === id);
    if (!targetReq) return;

    updateRaw((prev) => {
      const nextMaint = prev.maintenanceRequests.map((r) =>
        r.id === id
          ? {
              ...r,
              status: 'Completed' as const,
              completedAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              resolutionNotes: resolutionNotes || r.resolutionNotes || 'Maintenance completed successfully.',
            }
          : r
      );

      let nextBeds = prev.beds;
      let nextRooms = prev.rooms;

      if (revertRoomBedStatus) {
        if (targetReq.bedId) {
          nextBeds = prev.beds.map((b) => {
            if (b.id === targetReq.bedId && b.statusId === 'status-maintenance') {
              return { ...b, statusId: b.assignedTo ? 'status-occupied' : 'status-vacant' };
            }
            return b;
          });
        }

        if (targetReq.roomId) {
          nextRooms = prev.rooms.map((r) => {
            if (r.id === targetReq.roomId && r.statusId === 'status-maintenance') {
              return { ...r, statusId: 'status-vacant' };
            }
            return r;
          });
        }
      }

      return {
        ...prev,
        maintenanceRequests: nextMaint,
        beds: nextBeds,
        rooms: nextRooms,
      };
    });

    await writeLog('MAINTENANCE_UPDATE', 'Maintenance Completed', `Completed request: "${targetReq.title}"`);
  };

  const deleteMaintenanceRequest = async (id: string) => {
    const targetReq = rawCollections.maintenanceRequests.find((r) => r.id === id);

    updateRaw((prev) => ({
      ...prev,
      maintenanceRequests: prev.maintenanceRequests.filter((r) => r.id !== id),
    }));

    await writeLog('MAINTENANCE_UPDATE', 'Maintenance Deleted', `Deleted request "${targetReq?.title || id}"`);
  };

  // Food Waste Tracker Actions
  const addFoodWasteLog = async (logData: Omit<FoodWasteLog, 'id' | 'createdAt' | 'updatedAt'>) => {
    const logId = `fwl-${Date.now()}`;
    const now = new Date().toISOString();
    const newWasteLog: FoodWasteLog = {
      ...logData,
      id: logId,
      propertyCode: logData.propertyCode || activeTenantCode,
      createdAt: now,
      updatedAt: now,
    };

    updateRaw((prev) => ({
      ...prev,
      foodWasteLogs: [newWasteLog, ...prev.foodWasteLogs],
    }));

    await writeLog(
      'FOOD_WASTE_CREATE',
      'Food Waste Recorded',
      `Logged ${logData.weightKg} Kg for ${logData.mealService} service at ${logData.diningHallLocation}`
    );
  };

  const updateFoodWasteLog = async (id: string, updates: Partial<FoodWasteLog>) => {
    const target = rawCollections.foodWasteLogs.find((f) => f.id === id);

    updateRaw((prev) => ({
      ...prev,
      foodWasteLogs: prev.foodWasteLogs.map((f) =>
        f.id === id ? { ...f, ...updates, updatedAt: new Date().toISOString() } : f
      ),
    }));

    await writeLog(
      'FOOD_WASTE_UPDATE',
      'Food Waste Record Updated',
      `Updated waste entry for ${target?.mealService || 'service'} on ${target?.date || ''} (${updates.weightKg ?? target?.weightKg ?? 0} Kg)`
    );
  };

  const deleteFoodWasteLog = async (id: string) => {
    const target = rawCollections.foodWasteLogs.find((f) => f.id === id);

    updateRaw((prev) => ({
      ...prev,
      foodWasteLogs: prev.foodWasteLogs.filter((f) => f.id !== id),
    }));

    await writeLog(
      'FOOD_WASTE_DELETE',
      'Food Waste Record Deleted',
      `Deleted food waste record of ${target?.weightKg ?? 0} Kg (${target?.mealService ?? 'service'})`
    );
  };

  // User Management Actions
  const addUser = async (userData: Omit<UserProfile, 'id' | 'createdAt'>) => {
    const userId = `usr-${Date.now()}`;
    const effectiveCode = userData.propertyCode && userData.propertyCode !== 'ALL'
      ? userData.propertyCode
      : (activeTenantCode !== 'ALL' ? activeTenantCode : 'VFAR');

    const newUser: UserProfile = {
      ...userData,
      id: userId,
      propertyCode: effectiveCode,
      createdAt: new Date().toISOString(),
    };

    updateRaw((prev) => ({
      ...prev,
      users: [...prev.users, newUser],
    }));

    await writeLog('USER_CHANGE', 'User Added', `Added user ${userData.name} (${userData.role})`);
  };

  const updateUser = async (id: string, updates: Partial<UserProfile>) => {
    const targetUser = rawCollections.users.find((u) => u.id === id);

    updateRaw((prev) => ({
      ...prev,
      users: prev.users.map((u) => {
        if (u.id === id) {
          const effectiveUpdates = { ...updates };
          if (effectiveUpdates.propertyCode === 'ALL') {
            effectiveUpdates.propertyCode = activeTenantCode !== 'ALL' ? activeTenantCode : 'VFAR';
          }
          return { ...u, ...effectiveUpdates };
        }
        return u;
      }),
    }));

    await writeLog('USER_CHANGE', 'User Updated', `Updated user profile for ${targetUser?.name || id}`);
  };

  const deleteUser = async (id: string) => {
    const targetUser = rawCollections.users.find((u) => u.id === id);

    updateRaw((prev) => ({
      ...prev,
      users: prev.users.filter((u) => u.id !== id),
    }));

    await writeLog('USER_CHANGE', 'User Deleted', `Deleted user ${targetUser?.name || id}`);
  };

  // Reset all data back to default initial state
  const resetToDefaults = async () => {
    setRawCollections({
      buildings: INITIAL_PROPERTY_DATA.buildings,
      floors: INITIAL_PROPERTY_DATA.floors,
      roomTypes: INITIAL_PROPERTY_DATA.roomTypes,
      statuses: INITIAL_PROPERTY_DATA.statuses,
      rooms: INITIAL_PROPERTY_DATA.rooms,
      beds: INITIAL_PROPERTY_DATA.beds,
      logs: INITIAL_PROPERTY_DATA.logs,
      users: INITIAL_PROPERTY_DATA.users,
      maintenanceRequests: INITIAL_PROPERTY_DATA.maintenanceRequests,
      foodWasteLogs: INITIAL_PROPERTY_DATA.foodWasteLogs || [],
      tenants: INITIAL_PROPERTY_DATA.tenants || [],
    });
    localStorage.removeItem(STORAGE_KEY);
  };

  const saveDataToServer = async (newData: PropertyData) => {
    updateRaw((prev) => ({
      ...prev,
      buildings: newData.buildings,
      floors: newData.floors,
      roomTypes: newData.roomTypes,
      statuses: newData.statuses,
      rooms: newData.rooms,
      beds: newData.beds,
      logs: newData.logs,
      users: newData.users,
      maintenanceRequests: newData.maintenanceRequests,
      foodWasteLogs: newData.foodWasteLogs || [],
      tenants: newData.tenants || [],
    }));
  };

  const createTenantWorkspace = async (newTenant: {
    propertyCode: string;
    propertyName: string;
    region?: string;
    contactEmail?: string;
    templateMode: 'clean' | 'seed' | 'clone';
    initialAdminEmail?: string;
    initialAdminPassword?: string;
  }) => {
    const code = newTenant.propertyCode.toUpperCase();
    const createdWorkspace: TenantWorkspace = {
      id: `tenant-${code.toLowerCase()}-${Date.now()}`,
      propertyCode: code,
      propertyName: newTenant.propertyName,
      status: 'ACTIVE',
      region: newTenant.region || 'Maldives',
      contactEmail: newTenant.contactEmail || `admin.${code.toLowerCase()}@haharu.com`,
      databaseId: `db_tenant_${code.toLowerCase()}_prod`,
      createdAt: new Date().toISOString(),
      totalBuildingsCount: newTenant.templateMode === 'seed' ? 2 : 0,
      totalRoomsCount: newTenant.templateMode === 'seed' ? 6 : 0,
      totalBedsCount: newTenant.templateMode === 'seed' ? 18 : 0,
      activeUsersCount: 1,
    };

    let newBldgs: Building[] = [];
    let newFlrs: Floor[] = [];
    let newRms: Room[] = [];
    let newBds: Bed[] = [];

    if (newTenant.templateMode === 'seed') {
      const bldg1: Building = {
        id: `bldg-${code.toLowerCase()}-1`,
        name: `${code} Staff Residence Block A`,
        code: `${code}-A`,
        description: `Primary accommodation building for ${newTenant.propertyName}`,
        propertyCode: code,
        createdAt: new Date().toISOString(),
      };
      const bldg2: Building = {
        id: `bldg-${code.toLowerCase()}-2`,
        name: `${code} Staff Residence Block B`,
        code: `${code}-B`,
        description: `Secondary accommodation building for ${newTenant.propertyName}`,
        propertyCode: code,
        createdAt: new Date().toISOString(),
      };

      const flr1: Floor = {
        id: `flr-${code.toLowerCase()}-101`,
        buildingId: bldg1.id,
        number: 1,
        label: 'Ground Floor (100s)',
        description: 'Ground floor rooms',
        propertyCode: code,
      };
      const flr2: Floor = {
        id: `flr-${code.toLowerCase()}-201`,
        buildingId: bldg2.id,
        number: 1,
        label: 'Ground Floor (200s)',
        description: 'Ground floor rooms',
        propertyCode: code,
      };

      newBldgs = [bldg1, bldg2];
      newFlrs = [flr1, flr2];

      const roomNumbers = ['101', '102', '103', '201', '202', '203'];
      roomNumbers.forEach((rNum, idx) => {
        const isBlockA = idx < 3;
        const roomId = `rm-${code.toLowerCase()}-${rNum}`;
        const roomObj: Room = {
          id: roomId,
          buildingId: isBlockA ? bldg1.id : bldg2.id,
          floorId: isBlockA ? flr1.id : flr2.id,
          roomNumber: rNum,
          roomTypeId: 'rtype-2',
          totalBeds: 3,
          statusId: 'status-vacant',
          notes: `Seeded room #${rNum} for ${code}`,
          propertyCode: code,
          updatedAt: new Date().toISOString(),
        };
        newRms.push(roomObj);

        [1, 2, 3].forEach((bedNum) => {
          const bedObj: Bed = {
            id: `bed-${roomId}-${bedNum}`,
            roomId: roomId,
            bedNumber: bedNum,
            label: `Bed ${bedNum}`,
            statusId: 'status-vacant',
            assignedTo: null,
            propertyCode: code,
          };
          newBds.push(bedObj);
        });
      });
    } else if (newTenant.templateMode === 'clone') {
      const sourceBldgs = rawCollections.buildings.filter(
        (b) => (b.propertyCode || 'VFAR') === 'VFAR'
      );
      sourceBldgs.forEach((srcBldg, bIdx) => {
        const newBldgId = `bldg-${code.toLowerCase()}-${bIdx + 1}`;
        const newBldg: Building = {
          ...srcBldg,
          id: newBldgId,
          propertyCode: code,
          createdAt: new Date().toISOString(),
        };
        newBldgs.push(newBldg);

        const sourceFloors = rawCollections.floors.filter((f) => f.buildingId === srcBldg.id);
        sourceFloors.forEach((srcFlr, fIdx) => {
          const newFlrId = `flr-${code.toLowerCase()}-${bIdx + 1}-${fIdx + 1}`;
          const newFlr: Floor = {
            ...srcFlr,
            id: newFlrId,
            buildingId: newBldgId,
            propertyCode: code,
          };
          newFlrs.push(newFlr);

          const sourceRooms = rawCollections.rooms.filter((r) => r.floorId === srcFlr.id);
          sourceRooms.forEach((srcRm) => {
            const newRmId = `rm-${code.toLowerCase()}-${srcRm.roomNumber}`;
            const newRm: Room = {
              ...srcRm,
              id: newRmId,
              buildingId: newBldgId,
              floorId: newFlrId,
              propertyCode: code,
              updatedAt: new Date().toISOString(),
            };
            newRms.push(newRm);

            const sourceBeds = rawCollections.beds.filter((bd) => bd.roomId === srcRm.id);
            sourceBeds.forEach((srcBd, bdIdx) => {
              const newBdId = `bed-${newRmId}-${bdIdx + 1}`;
              const newBd: Bed = {
                ...srcBd,
                id: newBdId,
                roomId: newRmId,
                propertyCode: code,
              };
              newBds.push(newBd);
            });
          });
        });
      });
    }

    const adminEmail = newTenant.initialAdminEmail || `admin.${code.toLowerCase()}@haharu.com`;
    const adminUser: UserProfile = {
      id: `usr-admin-${code.toLowerCase()}`,
      email: adminEmail,
      password: newTenant.initialAdminPassword || 'Admin2026!',
      name: `${code} Property Admin`,
      role: 'Admin' as UserRole,
      propertyCode: code,
      employeeId: `${code}-ADM-01`,
      department: 'Housing & Property Management',
      createdAt: new Date().toISOString(),
    };

    updateRaw((prev) => ({
      ...prev,
      tenants: [...prev.tenants.filter((t) => t.propertyCode !== code), createdWorkspace],
      buildings: [...prev.buildings, ...newBldgs],
      floors: [...prev.floors, ...newFlrs],
      rooms: [...prev.rooms, ...newRms],
      beds: [...prev.beds, ...newBds],
      users: [...prev.users, adminUser],
    }));

    await writeLog(
      'SETTING_CHANGE',
      'New Tenant Database Provisioned',
      `Tenant Workspace [${code}] (${newTenant.propertyName}) was created with ${newTenant.templateMode.toUpperCase()} database mode.`
    );
  };

  const updateTenantStatus = async (
    propertyCode: string,
    status: 'ACTIVE' | 'SUSPENDED' | 'MAINTENANCE'
  ) => {
    const code = propertyCode.toUpperCase();

    updateRaw((prev) => ({
      ...prev,
      tenants: prev.tenants.map((t) =>
        t.propertyCode === code ? { ...t, status, updatedAt: new Date().toISOString() } : t
      ),
    }));

    await writeLog(
      'SETTING_CHANGE',
      'Tenant Status Updated',
      `Tenant [${code}] database status changed to ${status}.`
    );
  };

  const updateTenantWorkspace = async (
    propertyCode: string,
    updates: Partial<Omit<TenantWorkspace, 'id' | 'createdAt'>>
  ) => {
    const code = propertyCode.toUpperCase();

    updateRaw((prev) => ({
      ...prev,
      tenants: prev.tenants.map((t) =>
        t.propertyCode === code ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t
      ),
    }));

    await writeLog(
      'SETTING_CHANGE',
      'Tenant Workspace Updated',
      `Tenant workspace [${code}] configuration was updated.`
    );
  };

  const deleteTenantWorkspace = async (propertyCode: string): Promise<boolean> => {
    const code = propertyCode.toUpperCase();

    updateRaw((prev) => ({
      ...prev,
      tenants: prev.tenants.filter((t) => (t.propertyCode || '').toUpperCase() !== code),
      buildings: prev.buildings.filter((b) => (b.propertyCode || 'VFAR').toUpperCase() !== code),
      floors: prev.floors.filter((f) => (f.propertyCode || 'VFAR').toUpperCase() !== code),
      rooms: prev.rooms.filter((r) => (r.propertyCode || 'VFAR').toUpperCase() !== code),
      beds: prev.beds.filter((bd) => (bd.propertyCode || 'VFAR').toUpperCase() !== code),
      maintenanceRequests: prev.maintenanceRequests.filter(
        (m) => (m.propertyCode || 'VFAR').toUpperCase() !== code
      ),
      foodWasteLogs: prev.foodWasteLogs.filter(
        (w) => (w.propertyCode || 'VFAR').toUpperCase() !== code
      ),
      users: prev.users.filter(
        (u) => u.role === 'Global Admin' || (u.propertyCode || 'VFAR').toUpperCase() !== code
      ),
    }));

    if ((activeTenantCode || '').toUpperCase() === code) {
      const remaining = rawCollections.tenants.filter((t) => (t.propertyCode || '').toUpperCase() !== code);
      const nextCode = remaining.length > 0 ? remaining[0].propertyCode : 'ALL';
      setActiveTenantCode(nextCode);
    }

    await writeLog(
      'SETTING_CHANGE',
      'Tenant Database Workspace Deleted',
      `Tenant [${code}] database workspace and all associated records were permanently deleted.`
    );

    return true;
  };

  return (
    <PropertyContext.Provider
      value={{
        data,
        isLoading,
        activeTab,
        setActiveTab,
        isMobileMenuOpen,
        setIsMobileMenuOpen,
        toggleMobileMenu,

        addBuilding,
        updateBuilding,
        deleteBuilding,

        addFloor,
        updateFloor,
        deleteFloor,

        addRoomType,
        updateRoomType,
        deleteRoomType,

        addStatusCategory,
        updateStatusCategory,
        deleteStatusCategory,

        addRoom,
        updateRoom,
        deleteRoom,

        assignBed,
        checkoutBed,
        updateBedStatus,

        addMaintenanceRequest,
        updateMaintenanceRequest,
        completeMaintenanceRequest,
        deleteMaintenanceRequest,

        addFoodWasteLog,
        updateFoodWasteLog,
        deleteFoodWasteLog,

        addUser,
        updateUser,
        deleteUser,

        activeTenantCode,
        setActiveTenantCode,
        createTenantWorkspace,
        updateTenantStatus,
        updateTenantWorkspace,
        deleteTenantWorkspace,

        writeLog,
        resetToDefaults,
        saveDataToServer,
      }}
    >
      {children}
    </PropertyContext.Provider>
  );
};

export const useProperty = () => {
  const context = useContext(PropertyContext);
  if (!context) {
    throw new Error('useProperty must be used within a PropertyProvider');
  }
  return context;
};
