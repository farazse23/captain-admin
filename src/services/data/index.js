// Main data service exports - organized by feature
export * from './imageService.js';
export * from './notificationService.js';
export * from './userService.js';
export * from './driverService.js';
export * from './scheduleService.js';
export * from './dispatchImageService.js';
export * from './driverAssignmentService.js';
export { 
  createAdmin, 
  createAdminWithRoleCheck, 
  checkEmailExists, 
  getAdmins, 
  getAdminById, 
  getAdminByUID, 
  updateAdmin, 
  deleteAdmin, 
  adminLogin, 
  adminLogout, 
  sendAdminPasswordReset, 
  updateAdminPassword, 
  subscribeToAdmins 
} from './adminService.js';

// Import remaining functions from original file that need to be moved to separate services
import { 
  getDocs, 
  getDoc, 
  doc, 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  updateDoc, 
  deleteDoc, 
  writeBatch, 
  addDoc,
  getAuth,
  deleteAuthUser,
  createUserWithEmailAndPassword,
  signOut,
  db 
} from './firebase-imports.js';

// Export Firebase utilities
export { db, doc, updateDoc } from './firebase-imports.js';
import { uploadImage, deleteImage } from './imageService.js';

// Utility function for base64 to file conversion
const base64ToFile = (base64String, filename) => {
  const arr = base64String.split(',');
  const mime = arr[0].match(/:(.*?);/)[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while(n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, {type: mime});
};

// Trucks API
export const createTruck = async (truckData) => {
  try {
    let truckImageUrl = '';
    
    // Generate unique ID for file names
    const truckId = `truck_${Date.now()}`;
    
    // Handle truck image upload
    if (truckData.truckImage && truckData.truckImage.startsWith('data:')) {
      const truckFile = base64ToFile(truckData.truckImage, 'truck.jpg');
      truckImageUrl = await uploadImage(truckFile, `trucks/${truckId}`, 'truck');
    }
    
    const docRef = await addDoc(collection(db, 'trucks'), {
      ...truckData,
      truckId,
      truckImage: truckImageUrl || truckData.truckImage || '',
      status: truckData.status || 'operational', // Use provided status or default to operational
      assignedDriver: null,
      createdAt: new Date()
    });
    
    return { 
      id: docRef.id, 
      ...truckData,
      truckId,
      truckImage: truckImageUrl || truckData.truckImage || ''
    };
  } catch (error) {
    console.error('Error creating truck:', error);
    throw error;
  }
};

export const getTrucks = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, 'trucks'));
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error fetching trucks:', error);
    return [];
  }
};

export const updateTruck = async (truckId, truckData) => {
  try {
    const truckRef = doc(db, 'trucks', truckId);
    await updateDoc(truckRef, {
      ...truckData,
      updatedAt: new Date()
    });
    return true;
  } catch (error) {
    console.error('Error updating truck:', error);
    throw error;
  }
};

export const deleteTruck = async (truckId) => {
  try {
    // Get truck data first
    const truckDoc = await getDoc(doc(db, 'trucks', truckId));
    if (!truckDoc.exists()) {
      throw new Error('Truck not found');
    }
    
    const truckData = truckDoc.data();
    const batch = writeBatch(db);
    
    // Delete truck images from Storage if they exist
    if (truckData.images && truckData.images.length > 0) {
      for (const imageUrl of truckData.images) {
        try {
          await deleteImage(imageUrl);
        } catch (error) {
          console.warn('Could not delete truck image:', error);
        }
      }
    }
    
    // Update related trip documents - set truck info to "unknown"
    const tripsQuery = query(collection(db, 'trips'), where('truckId', '==', truckData.truckId || truckId));
    const tripsSnapshot = await getDocs(tripsQuery);
    
    tripsSnapshot.docs.forEach(tripDoc => {
      batch.update(tripDoc.ref, {
        truckId: 'unknown',
        truckNumber: 'Unknown Truck',
        plateNumber: 'N/A'
      });
    });
    
    // Update related dispatch documents
    const dispatchQuery = query(collection(db, 'dispatches'), where('truckId', '==', truckData.truckId || truckId));
    const dispatchSnapshot = await getDocs(dispatchQuery);
    
    dispatchSnapshot.docs.forEach(dispatchDoc => {
      batch.update(dispatchDoc.ref, {
        truckId: 'unknown',
        truckNumber: 'Unknown Truck',
        plateNumber: 'N/A'
      });
    });
    
    // Delete the truck document
    batch.delete(doc(db, 'trucks', truckId));
    
    // Commit all changes
    await batch.commit();
    
    return true;
  } catch (error) {
    console.error('Error deleting truck:', error);
    throw error;
  }
};

// Real-time truck listener
export const subscribeToTrucks = (callback) => {
  try {
    const q = query(collection(db, 'trucks'), orderBy('truckNumber'));
    return onSnapshot(q, (snapshot) => {
      const trucks = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      callback(trucks);
    });
  } catch (error) {
    console.error('Error subscribing to trucks:', error);
    return () => {};
  }
};

// Trips/Dispatches API
export const getTrips = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, 'dispatches'));
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error fetching trips:', error);
    return [];
  }
};

// Alias for backward compatibility
export const getDispatches = getTrips;

export const getTripById = async (tripId) => {
  try {
    const tripDoc = await getDoc(doc(db, 'dispatches', tripId));
    if (tripDoc.exists()) {
      return {
        id: tripDoc.id,
        ...tripDoc.data()
      };
    }
    return null;
  } catch (error) {
    console.error('Error fetching trip:', error);
    return null;
  }
};

export const updateTrip = async (tripId, tripData) => {
  try {
    const tripRef = doc(db, 'dispatches', tripId);
    await updateDoc(tripRef, {
      ...tripData,
      updatedAt: new Date()
    });
    return true;
  } catch (error) {
    console.error('Error updating trip:', error);
    throw error;
  }
};

// Real-time trips listener
export const subscribeToTrips = (callback) => {
  try {
    const q = query(collection(db, 'dispatches'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const trips = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      callback(trips);
    });
  } catch (error) {
    console.error('Error subscribing to trips:', error);
    return () => {};
  }
};

// Alias for backward compatibility
export const subscribeToDispatches = subscribeToTrips;

// Requests API
export const getRequests = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, 'requests'));
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error fetching requests:', error);
    return [];
  }
};

export const subscribeToRequests = (callback) => {
  try {
    const q = query(collection(db, 'requests'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const requests = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      callback(requests);
    });
  } catch (error) {
    console.error('Error subscribing to requests:', error);
    return () => {};
  }
};

export const subscribeToPendingRequests = (callback) => {
  try {
    const q = query(
      collection(db, 'requests'),
      where('status', '==', 'pending')
    );
    return onSnapshot(q, (snapshot) => {
      const requests = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Sort on client side to avoid composite index requirement
      requests.sort((a, b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
        return dateB.getTime() - dateA.getTime(); // desc order
      });
      
      callback(requests);
    });
  } catch (error) {
    console.error('Error subscribing to pending requests:', error);
    return () => {};
  }
};

// Dashboard stats calculation
const calculateDashboardStats = async () => {
  try {
    // Get all collections
    const [driversSnapshot, trucksSnapshot, tripsSnapshot, usersSnapshot] = await Promise.all([
      getDocs(collection(db, 'drivers')),
      getDocs(collection(db, 'trucks')),
      getDocs(collection(db, 'dispatches')),
      getDocs(collection(db, 'customers'))
    ]);

    const drivers = driversSnapshot.docs.map(doc => doc.data());
    const trucks = trucksSnapshot.docs.map(doc => doc.data());
    const trips = tripsSnapshot.docs.map(doc => doc.data());
    const users = usersSnapshot.docs.map(doc => doc.data());

    // Calculate stats
    const activeDrivers = drivers.filter(driver => driver.status === 'active').length;
    const availableTrucks = trucks.filter(truck => truck.status === 'operational').length;
    const completedTrips = trips.filter(trip => trip.status === 'completed').length;
    const pendingTrips = trips.filter(trip => trip.status === 'pending' || trip.status === 'assigned').length;

    // Recent activity (last 7 days)
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const recentTrips = trips.filter(trip => {
      const tripDate = trip.createdAt?.toDate ? trip.createdAt.toDate() : new Date(trip.createdAt);
      return tripDate >= weekAgo;
    }).length;

    return {
      totalDrivers: drivers.length,
      activeDrivers,
      totalTrucks: trucks.length,
      availableTrucks,
      totalTrips: trips.length,
      completedTrips,
      pendingTrips,
      totalUsers: users.length,
      recentTrips
    };
  } catch (error) {
    console.error('Error calculating dashboard stats:', error);
    return {
      totalDrivers: 0,
      activeDrivers: 0,
      totalTrucks: 0,
      availableTrucks: 0,
      totalTrips: 0,
      completedTrips: 0,
      pendingTrips: 0,
      totalUsers: 0,
      recentTrips: 0
    };
  }
};

// Dashboard API
export const getDashboardStats = calculateDashboardStats;

// Settings API
export const getSettings = async () => {
  try {
    const settingsDoc = await getDoc(doc(db, 'settings', 'general'));
    if (settingsDoc.exists()) {
      return settingsDoc.data();
    }
    return {};
  } catch (error) {
    console.error('Error fetching settings:', error);
    return {};
  }
};

export const updateSettings = async (settings) => {
  try {
    const settingsRef = doc(db, 'settings', 'general');
    await updateDoc(settingsRef, {
      ...settings,
      updatedAt: new Date()
    });
    return true;
  } catch (error) {
    console.error('Error updating settings:', error);
    throw error;
  }
};

// Customer Functions
export const getCustomers = async () => {
  return await getUsers();
};

export const subscribeToCustomers = (callback) => {
  try {
    const q = query(collection(db, 'customers'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (querySnapshot) => {
      const customers = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt || new Date().toISOString()
      }));
      callback(customers);
    });
  } catch (error) {
    console.error('Error subscribing to customers:', error);
    return () => {};
  }
};

// Dispatch Management Functions
export const acceptDispatchRequest = async (dispatchId, adminId) => {
  try {
    const dispatchRef = doc(db, 'dispatches', dispatchId);
    const now = new Date();
    
    await updateDoc(dispatchRef, {
      status: 'accepted',
      currentStatus: {
        status: 'accepted',
        updatedAt: now
      },
      acceptedBy: adminId,
      acceptedAt: now.toISOString(),
      updatedAt: now
    });

    return { success: true };
  } catch (error) {
    console.error('Error accepting dispatch request:', error);
    throw error;
  }
};

export const rejectDispatchRequest = async (dispatchId, adminId, reason) => {
  try {
    const dispatchRef = doc(db, 'dispatches', dispatchId);
    const now = new Date();
    
    await updateDoc(dispatchRef, {
      status: 'rejected',
      currentStatus: {
        status: 'rejected',
        updatedAt: now
      },
      rejectedBy: adminId,
      rejectedAt: now.toISOString(),
      rejectionReason: reason,
      updatedAt: now
    });

    return { success: true };
  } catch (error) {
    console.error('Error rejecting dispatch request:', error);
    throw error;
  }
};

export const assignDispatch = async (dispatchId, assignments, adminId) => {
  try {
    const dispatchRef = doc(db, 'dispatches', dispatchId);
    const now = new Date();

    // Update dispatch with assignments
    await updateDoc(dispatchRef, {
      status: 'assigned',
      currentStatus: {
        status: 'assigned',
        updatedAt: now
      },
      assignments: assignments,
      assignedBy: adminId,
      assignedAt: now.toISOString(),
      updatedAt: now.toISOString()
    });

    return { success: true };
  } catch (error) {
    console.error('Error assigning dispatch:', error);
    throw error;
  }
};

export const startDispatchTrip = async (dispatchId, adminId) => {
  try {
    const dispatchRef = doc(db, 'dispatches', dispatchId);
    const now = new Date();

    await updateDoc(dispatchRef, {
      status: 'in-progress',
      currentStatus: {
        status: 'in-progress',
        updatedAt: now
      },
      startedBy: adminId,
      startedAt: now.toISOString(),
      updatedAt: now.toISOString()
    });

    return { success: true };
  } catch (error) {
    console.error('Error starting dispatch trip:', error);
    throw error;
  }
};

export const completeDispatchTrip = async (dispatchId, adminId) => {
  try {
    const dispatchRef = doc(db, 'dispatches', dispatchId);
    const now = new Date();

    await updateDoc(dispatchRef, {
      status: 'completed',
      currentStatus: {
        status: 'completed',
        updatedAt: now
      },
      completedBy: adminId,
      completedAt: now.toISOString(),
      updatedAt: now.toISOString()
    });

    return { success: true };
  } catch (error) {
    console.error('Error completing dispatch trip:', error);
    throw error;
  }
};

export const getDispatchImages = async (dispatchId) => {
  try {
    const q = query(
      collection(db, 'dispatch_images'), 
      where('dispatchId', '==', dispatchId)
    );
    const querySnapshot = await getDocs(q);
    const results = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Sort on client side to avoid composite index requirement
    results.sort((a, b) => {
      const dateA = a.uploadedAt?.toDate ? a.uploadedAt.toDate() : new Date(a.uploadedAt || 0);
      const dateB = b.uploadedAt?.toDate ? b.uploadedAt.toDate() : new Date(b.uploadedAt || 0);
      return dateB.getTime() - dateA.getTime(); // desc order
    });
    
    return results;
  } catch (error) {
    console.error('Error fetching dispatch images:', error);
    return [];
  }
};

export const notifyNewRequest = async (dispatchId, tripDetails) => {
  try {
    // Get the trip source and destination from tripDetails
    const sourceAddress = tripDetails.sourceLocation?.address || 'Unknown Source';
    const destinationAddress = tripDetails.destinationLocation?.address || 'Unknown Destination';
    const customerName = tripDetails.customerName || 'Unknown Customer';
    
    // Send notification (using available notification service)
    await sendNotification({
      type: 'new_request',
      title: `New Trip Request`,
      message: `New trip request from ${customerName}: ${sourceAddress} → ${destinationAddress}`,
      dispatchId,
      tripId: dispatchId,
      tripDetails: {
        customerId: tripDetails.customerId,
        customerName,
        sourceLocation: tripDetails.sourceLocation,
        destinationLocation: tripDetails.destinationLocation,
        requestedTime: tripDetails.requestedTime,
        status: tripDetails.status || 'pending'
      },
      priority: 'high',
      adminOnly: true
    });

    return { success: true };
  } catch (error) {
    console.error('Error notifying new request:', error);
    throw error;
  }
};

export const updateDispatchStatus = async (dispatchId, status, additionalData = {}) => {
  try {
    const dispatchRef = doc(db, 'dispatches', dispatchId);
    
    // Update dispatch status
    await updateDoc(dispatchRef, {
      status,
      updatedAt: new Date(),
      ...additionalData
    });

    return true;
  } catch (error) {
    console.error('Error updating dispatch status:', error);
    throw error;
  }
};
