export interface User {
  sl: number;
  name: string;
  pin: string;
  role: string;
  campus: string;
  status: string;
  password?: string;
  customPermissions?: string[];
}

export interface WorkflowEntry {
  sl: number;
  date: string;
  workHistory: string;
}

export interface FlatWorkflowRecord {
  rowSl: number;
  timestamp: string;
  name: string;
  pin: string;
  campus: string;
  responsibility: string;
  monthKey: string;
  entrySl: number;
  date: string;
  workHistory: string;
}

export interface RolePermissions {
  [roleName: string]: string[];
}

export interface Device {
  type: string;
  config: string;
  serial: string;
  quantity: string;
  condition: string;
  buyingDate: string;
  purchaseName: string;
  collectedDate: string;
}

export interface DeviceRecord {
  sl: number;
  userName: string;
  userPin: string;
  campusName: string;
  officialNumber: string;
  device1: Device;
  device2: Device;
  device3: Device;
  device4: Device;
  device5: Device;
  device6: Device;
  device7: Device;
  device8: Device;
  remark: string;
  sendToPiLabsDate: string;
  receivedFromPiLabsDate: string;
  roomNumber: string;
}

export interface ReportData {
  totalWorkflows: number;
  totalUsers: number;
  totalCampuses: number;
  userWise: Array<{ name: string; entriesCount: number }>;
  campusWise: Array<{ campus: string; entriesCount: number }>;
  monthWise: Array<{ month: string; entriesCount: number }>;
}
