// Color Palette
export const COLORS = {
  primary: '#2563eb',        // Blue-600
  primaryLight: '#3b82f6',   // Blue-500
  secondary: '#64748b',      // Slate-500
  success: '#10b981',        // Emerald-500
  warning: '#f59e0b',        // Amber-500
  danger: '#ef4444',         // Red-500
  background: '#f8fafc',     // Slate-50
  cardBackground: '#ffffff',
  textPrimary: '#1e293b',    // Slate-800
  textSecondary: '#64748b',  // Slate-500
  border: '#e2e8f0',         // Slate-200
};

// Status Colors
export const STATUS_COLORS = {
  active: '#10b981',         // Green (legacy)
  available: '#10b981',      // Green
  operational: '#10b981',    // Green
  assigned: '#3b82f6',       // Blue (changed from purple)
  'on-trip': '#f59e0b',      // Yellow/Orange
  'not-available': '#ef4444', // Red
  unavailable: '#f59e0b',    // Yellow/Orange
  maintenance: '#ef4444',    // Red
  inactive: '#ef4444',       // Red
  pending: '#f97316',        // Orange (changed from yellow)
  inProgress: '#8b5cf6',     // Purple (changed from blue)
  'in-progress': '#8b5cf6',  // Purple for consistency
  completed: '#10b981',      // Green
  blocked: '#ef4444',        // Red
  cancelled: '#ef4444',      // Red
};

// Trip Status
export const TRIP_STATUS = {
  PENDING: 'pending',
  ASSIGNED: 'assigned',
  IN_PROGRESS: 'in-progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
};

// Driver Status
export const DRIVER_STATUS = {
  AVAILABLE: 'available',
  ASSIGNED: 'assigned',
  ON_TRIP: 'on-trip',
  INACTIVE: 'inactive',
};

// Truck Status
export const TRUCK_STATUS = {
  OPERATIONAL: 'operational',
  ASSIGNED: 'assigned',
  ON_TRIP: 'on-trip',
  MAINTENANCE: 'maintenance',
};

// User Roles
export const USER_ROLES = {
  ADMIN: 'admin',
  CUSTOMER: 'customer',
  DRIVER: 'driver',
};

// Truck Types
export const TRUCK_TYPES = {
  SMALL: 'Small Truck',
  MEDIUM: 'Medium Truck',
  LARGE: 'Large Truck',
};

// Notification Audiences
export const NOTIFICATION_AUDIENCES = {
  ALL_USERS: 'all-users',
  ALL_CUSTOMERS: 'customers',
  ALL_DRIVERS: 'drivers',
  SPECIFIC_USER: 'specific-user',
};

// Pagination
export const ITEMS_PER_PAGE = 10;

// Date Formats
export const DATE_FORMATS = {
  DISPLAY: 'MMM dd, yyyy',
  DISPLAY_TIME: 'MMM dd, yyyy hh:mm a',
  ISO: 'yyyy-MM-dd',
};

// Routes
export const ROUTES = {
  LOGIN: '/login',
  DASHBOARD: '/',
  USERS: '/users',
  DRIVERS: '/drivers',
  TRUCKS: '/trucks',
  REQUESTS: '/requests',
  TRIPS: '/trips',
  SCHEDULE: '/schedule',
  NOTIFICATIONS: '/notifications',
  REPORTS: '/reports',
  FEEDBACK: '/feedback',
  SETTINGS: '/settings',
};
