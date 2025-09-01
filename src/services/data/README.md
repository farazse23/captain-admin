# Data Services Architecture

This folder contains the organized Firebase data services, broken down into logical modules for better maintainability.

## Structure

### Core Files
- `firebase-imports.js` - Common Firebase imports used across all services
- `index.js` - Main export file that combines all services

### Service Modules

#### `imageService.js`
- Image upload/delete functionality
- Dispatch image management
- Base64 conversion utilities

#### `notificationService.js`
- Notification creation and management
- Customer/driver notification systems
- Bulk notification sending
- Status change notifications

#### `userService.js` 
- User/customer CRUD operations
- User data management
- User deletion with cleanup

#### `driverService.js`
- Driver CRUD operations
- Driver data management
- Real-time driver subscriptions
- Driver deletion with cleanup

## Usage

All services are available through direct imports from the data index file:

```javascript
import { getUsers, getDrivers, uploadImage, sendNotification } from '../services/data';
```

## Benefits

1. **Better Organization** - Related functions are grouped together
2. **Easier Maintenance** - Smaller files are easier to read and modify
3. **Improved Performance** - Only load what you need
4. **Better Testing** - Individual modules can be tested separately
5. **Reduced Complexity** - No more 2000+ line single file

## Migration

The refactoring maintains full backward compatibility. All existing imports and function calls continue to work without changes.
