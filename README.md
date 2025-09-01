# Captain Truck Admin Dashboard - Mock Version

This is the Captain Truck Admin Dashboard with all Firebase dependencies removed and replaced with mock data for development and testing purposes.

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn

### Installation
```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

## 🔑 Mock Authentication

The app now uses mock authentication. You can log in with:
- **Email**: Any email containing "admin" (e.g., `admin@captaintruck.com`)
- **Password**: Any password with 6+ characters (e.g., `password123`)

## 📊 Mock Data

The application comes pre-loaded with sample data including:
- **Users**: 2 sample customers
- **Drivers**: 2 sample drivers
- **Trucks**: 2 sample trucks
- **Trips**: 3 sample trips with different statuses

## 🔧 Features Working with Mock Data

### ✅ Fully Functional Pages:
- **Dashboard** - Shows statistics and overview
- **Users** - Customer management with mock data
- **Drivers** - Driver management (basic structure)
- **Trucks** - Truck fleet management (basic structure)
- **Trips** - Complete trip management with assignment system
- **Login** - Mock authentication system

### ✅ Working Features:
- Authentication and route protection
- Real-time UI updates (simulated)
- Trip status management
- User status management
- Search and filtering
- Responsive design
- Mock API calls with loading states

## 🔄 Connecting to Real Backend

To connect to your actual backend API:

### 1. Replace Mock Data Service
Edit `src/services/dataService.js`:
- Replace mock functions with actual API calls
- Update endpoints to match your backend
- Handle authentication tokens
- Implement real-time subscriptions if needed

### 2. Update Authentication
Edit `src/contexts/AuthContext.jsx`:
- Replace mock authentication with your auth system
- Implement proper token handling
- Add role-based access control

### 3. Environment Configuration
Create `.env` file:
```env
VITE_API_BASE_URL=your-api-url
VITE_AUTH_ENDPOINT=your-auth-endpoint
# Add other environment variables
```

## 📁 Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── common/         # Layout components (Header, Sidebar, etc.)
│   ├── modals/         # Modal components
│   └── ui/             # Basic UI components (Button, Card, etc.)
├── contexts/           # React contexts (Auth, etc.)
├── pages/              # Page components
├── services/           # API services and data handling
├── utils/              # Utility functions and constants
└── assets/             # Static assets
```

## 🎨 UI Components

The dashboard includes a complete set of UI components:
- **Cards** - For data display
- **Buttons** - Various styles and states
- **Inputs** - Form inputs with validation
- **Badges** - Status indicators
- **Modals** - Popup dialogs
- **Tables** - Data tables with sorting/filtering

## 📱 Pages Overview

### Dashboard
- Overview statistics
- Quick action cards
- Real-time data display

### Users Management
- Customer list with search/filter
- User details modal
- Status management (active/blocked)
- Delete functionality with confirmation

### Trips Management
- Complete trip lifecycle management
- Multi-driver/truck assignment system
- Trip details with timeline
- Status updates (pending → assigned → in-progress → completed)
- Assignment editing capabilities

### Drivers Management
- Driver profiles and status tracking
- Availability management
- Assignment history

### Trucks Management
- Fleet vehicle tracking
- Maintenance status
- Availability for assignments

## 🔒 Security Notes

**Important**: This mock version is for development only:
- No real authentication
- Data is stored in memory (resets on refresh)
- No data persistence
- No API security measures

Make sure to implement proper security when connecting to your real backend.

## 🛠️ Customization

### Adding New Pages
1. Create component in `src/pages/`
2. Add route in `src/App.jsx`
3. Add navigation item in `src/components/common/Sidebar.jsx`
4. Update constants in `src/utils/constants.js`

### Styling
- Uses TailwindCSS for styling
- Custom color scheme in `src/utils/constants.js`
- Responsive design patterns throughout

### Mock Data
- Edit `src/services/dataService.js` to modify sample data
- Add/remove mock entries as needed
- Simulate different scenarios for testing

## 🚀 Production Deployment

When ready for production:
1. Replace all mock services with real API calls
2. Implement proper authentication
3. Add environment variable management
4. Set up proper error handling and logging
5. Add API rate limiting and security measures

## 📞 Support

This mockup provides a complete, functional admin dashboard that you can use immediately for:
- UI/UX testing
- Frontend development
- Client demonstrations
- Backend API design reference

Ready to integrate with your actual backend systems!
