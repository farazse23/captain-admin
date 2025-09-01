import { collection, getDocs, deleteDoc, doc, query, where, orderBy, onSnapshot, addDoc, updateDoc, db, getDoc } from './firebase-imports.js';
import { format } from 'date-fns';

// Helper function to check if assignment is still active (not completed/cancelled/orphaned)
export const isAssignmentActive = async (assignment) => {
  try {
    // Skip completed or cancelled assignments
    if (assignment.status === 'completed' || assignment.status === 'cancelled') {
      return false;
    }
    
    // Check if the dispatch still exists and is not completed/cancelled
    if (assignment.dispatchId) {
      const dispatchRef = doc(db, 'dispatches', assignment.dispatchId);
      const dispatchDoc = await getDoc(dispatchRef);
      
      if (!dispatchDoc.exists()) {
        // Dispatch was deleted - assignment is orphaned, clean it up
        await cleanupOrphanedAssignment(assignment.id);
        return false;
      }
      
      const dispatch = dispatchDoc.data();
      if (dispatch.status === 'completed' || dispatch.status === 'cancelled') {
        // Dispatch is completed/cancelled - update assignment status
        await updateAssignment(assignment.id, { 
          status: dispatch.status === 'completed' ? 'completed' : 'cancelled'
        });
        return false;
      }
    }
    
    return true; // Assignment is still active
  } catch (error) {
    console.error('Error checking assignment active status:', error);
    return true; // Default to active if error occurs
  }
};

// Clean up orphaned assignments
export const cleanupOrphanedAssignment = async (assignmentId) => {
  try {
    await deleteDoc(doc(db, 'assignments', assignmentId));
    console.log(`Cleaned up orphaned assignment: ${assignmentId}`);
  } catch (error) {
    console.error('Error cleaning up orphaned assignment:', error);
  }
};

// Update all assignments when dispatch status changes
export const updateAssignmentStatusesByDispatch = async (dispatchId, newStatus) => {
  try {
    const assignmentsQuery = query(
      collection(db, 'assignments'),
      where('dispatchId', '==', dispatchId)
    );
    
    const snapshot = await getDocs(assignmentsQuery);
    const updatePromises = [];
    
    snapshot.forEach((doc) => {
      const assignmentRef = doc.ref;
      let assignmentStatus;
      
      // Map dispatch status to assignment status
      switch (newStatus) {
        case 'completed':
          assignmentStatus = 'completed';
          break;
        case 'cancelled':
          assignmentStatus = 'cancelled';
          break;
        case 'in-progress':
          // Don't override individual driver statuses when dispatch is in progress
          // Let drivers manage their own status
          return;
        default:
          assignmentStatus = newStatus;
      }
      
      updatePromises.push(
        updateDoc(assignmentRef, {
          status: assignmentStatus,
          updatedAt: new Date()
        })
      );
    });
    
    await Promise.all(updatePromises);
    console.log(`Updated ${updatePromises.length} assignments for dispatch ${dispatchId} to ${newStatus}`);
  } catch (error) {
    console.error('Error updating assignment statuses:', error);
    throw error;
  }
};

// Get enhanced driver assignments for date (excludes inactive ones)
export const getActiveDriverAssignmentsForDate = async (driverId, date) => {
  try {
    const dateString = format(new Date(date), 'yyyy-MM-dd');
    const querySnapshot = await getDocs(
      query(
        collection(db, 'assignments'),
        where('driverId', '==', driverId),
        where('assignedDate', '==', dateString)
      )
    );
    
    const activeAssignments = [];
    
    for (const doc of querySnapshot.docs) {
      const assignment = { id: doc.id, ...doc.data() };
      const isActive = await isAssignmentActive(assignment);
      
      if (isActive) {
        activeAssignments.push(assignment);
      }
    }
    
    return activeAssignments;
  } catch (error) {
    console.error('Error fetching active driver assignments for date:', error);
    return [];
  }
};

// Get enhanced truck assignments for date (excludes inactive ones)
export const getActiveTruckAssignmentsForDate = async (truckId, date) => {
  try {
    const dateString = format(new Date(date), 'yyyy-MM-dd');
    const querySnapshot = await getDocs(
      query(
        collection(db, 'assignments'),
        where('truckId', '==', truckId),
        where('assignedDate', '==', dateString)
      )
    );
    
    const activeAssignments = [];
    
    for (const doc of querySnapshot.docs) {
      const assignment = { id: doc.id, ...doc.data() };
      const isActive = await isAssignmentActive(assignment);
      
      if (isActive) {
        activeAssignments.push(assignment);
      }
    }
    
    return activeAssignments;
  } catch (error) {
    console.error('Error fetching active truck assignments for date:', error);
    return [];
  }
};
export const getSchedules = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, 'schedules'));
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error fetching schedules:', error);
    return [];
  }
};

export const getSchedulesByDate = async (date) => {
  try {
    const dateString = format(new Date(date), 'yyyy-MM-dd');
    const querySnapshot = await getDocs(
      query(collection(db, 'assignments'), where('assignedDate', '==', dateString))
    );
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error fetching schedules by date:', error);
    return [];
  }
};

export const getSchedulesByDateRange = async (startDate, endDate) => {
  try {
    const startDateString = format(new Date(startDate), 'yyyy-MM-dd');
    const endDateString = format(new Date(endDate), 'yyyy-MM-dd');
    
    const querySnapshot = await getDocs(
      query(
        collection(db, 'assignments'),
        where('assignedDate', '>=', startDateString),
        where('assignedDate', '<=', endDateString)
      )
    );
    const results = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Sort on client side to avoid composite index requirement
    return results.sort((a, b) => new Date(a.assignedDate) - new Date(b.assignedDate));
  } catch (error) {
    console.error('Error fetching schedules by date range:', error);
    return [];
  }
};

// Alias for getSchedulesByDateRange to match the import in SchedulePage
export const getAssignmentsByDateRange = async (startDate, endDate) => {
  return getSchedulesByDateRange(startDate, endDate);
};

// Get today's assignments
export const getTodaysAssignments = async () => {
  const today = format(new Date(), 'yyyy-MM-dd');
  return getSchedulesByDate(today);
};

// Get assignments for a specific date
export const getAssignmentsForDate = async (date) => {
  return getSchedulesByDate(date);
};

// Get driver assignments for a specific date
export const getDriverAssignmentsForDate = async (driverId, date) => {
  try {
    const dateString = format(new Date(date), 'yyyy-MM-dd');
    const querySnapshot = await getDocs(
      query(
        collection(db, 'assignments'),
        where('driverId', '==', driverId),
        where('assignedDate', '==', dateString)
      )
    );
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error fetching driver assignments for date:', error);
    return [];
  }
};

// Get truck assignments for a specific date
export const getTruckAssignmentsForDate = async (truckId, date) => {
  try {
    const dateString = format(new Date(date), 'yyyy-MM-dd');
    const querySnapshot = await getDocs(
      query(
        collection(db, 'assignments'),
        where('truckId', '==', truckId),
        where('assignedDate', '==', dateString)
      )
    );
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error fetching truck assignments for date:', error);
    return [];
  }
};

// Get assignments for a specific date
export const getAssignmentsByDate = async (date) => {
  try {
    const dateString = format(new Date(date), 'yyyy-MM-dd');
    
    const q = query(
      collection(db, 'assignments'),
      where('assignedDate', '==', dateString),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error fetching assignments by date:', error);
    return [];
  }
};

// Check if driver and truck are available for a specific date (Enhanced)
export const checkAvailability = async (driverId, truckId, date) => {
  try {
    const dateString = format(new Date(date), 'yyyy-MM-dd');
    
    // Check driver availability - exclude completed, cancelled, and orphaned assignments
    const driverQuery = query(
      collection(db, 'assignments'),
      where('driverId', '==', driverId),
      where('assignedDate', '==', dateString)
    );
    
    const driverSnapshot = await getDocs(driverQuery);
    let driverBusyAssignments = [];
    
    for (const assignmentDoc of driverSnapshot.docs) {
      const assignment = { id: assignmentDoc.id, ...assignmentDoc.data() };
      
      // Skip if assignment is completed, cancelled, or dispatch doesn't exist
      const isValidAssignment = await isAssignmentActive(assignment);
      if (isValidAssignment) {
        driverBusyAssignments.push(assignment);
      }
    }
    
    // Check truck availability - exclude completed, cancelled, and orphaned assignments  
    const truckQuery = query(
      collection(db, 'assignments'),
      where('truckId', '==', truckId),
      where('assignedDate', '==', dateString)
    );
    
    const truckSnapshot = await getDocs(truckQuery);
    let truckBusyAssignments = [];
    
    for (const assignmentDoc of truckSnapshot.docs) {
      const assignment = { id: assignmentDoc.id, ...assignmentDoc.data() };
      
      // Skip if assignment is completed, cancelled, or dispatch doesn't exist
      const isValidAssignment = await isAssignmentActive(assignment);
      if (isValidAssignment) {
        truckBusyAssignments.push(assignment);
      }
    }
    
    const isDriverAvailable = driverBusyAssignments.length === 0;
    const isTruckAvailable = truckBusyAssignments.length === 0;
    
    return {
      available: isDriverAvailable && isTruckAvailable,
      driverBusy: !isDriverAvailable,
      truckBusy: !isTruckAvailable,
      driverAvailable: isDriverAvailable,
      truckAvailable: isTruckAvailable,
      bothAvailable: isDriverAvailable && isTruckAvailable,
      driverAssignment: !isDriverAvailable ? driverSnapshot.docs[0]?.data() : null,
      truckAssignment: !isTruckAvailable ? truckSnapshot.docs[0]?.data() : null
    };
  } catch (error) {
    console.error('Error checking availability:', error);
    return {
      available: false,
      driverBusy: true,
      truckBusy: true,
      driverAvailable: false,
      truckAvailable: false,
      bothAvailable: false,
      error: error.message
    };
  }
};

// Create assignment record
export const createAssignment = async (assignmentData) => {
  try {
    console.log('🔍 createAssignment called with:', assignmentData);
    
    // Handle assignedDate properly - don't double-format if it's already a string
    let assignedDate;
    if (typeof assignmentData.assignedDate === 'string' && assignmentData.assignedDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
      // Already in yyyy-MM-dd format
      assignedDate = assignmentData.assignedDate;
    } else {
      // Convert to yyyy-MM-dd format
      assignedDate = format(new Date(assignmentData.assignedDate), 'yyyy-MM-dd');
    }
    
    const assignment = {
      ...assignmentData,
      assignedDate: assignedDate,
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'assigned'
    };
    
    console.log('✅ Creating assignment with assignedDate:', assignedDate);
    console.log('✅ Full assignment object:', assignment);
    
    const docRef = await addDoc(collection(db, 'assignments'), assignment);
    const result = {
      id: docRef.id,
      ...assignment
    };
    
    console.log('✅ Assignment created successfully:', result);
    return result;
  } catch (error) {
    console.error('Error creating assignment:', error);
    throw error;
  }
};

// Update assignment
export const updateAssignment = async (assignmentId, updateData) => {
  try {
    const assignmentRef = doc(db, 'assignments', assignmentId);
    await updateDoc(assignmentRef, {
      ...updateData,
      updatedAt: new Date()
    });
    return true;
  } catch (error) {
    console.error('Error updating assignment:', error);
    throw error;
  }
};

export const deleteSchedule = async (scheduleId) => {
  try {
    await deleteDoc(doc(db, 'assignments', scheduleId));
    return true;
  } catch (error) {
    console.error('Error deleting schedule:', error);
    throw error;
  }
};

// Get available drivers for a specific date (not assigned and status is available/operational)
export const getAvailableDriversForDate = async (drivers, date) => {
  try {
    const dateString = format(new Date(date), 'yyyy-MM-dd');
    
    const availableDrivers = [];
    
    for (const driver of drivers) {
      const activeAssignments = await getActiveDriverAssignmentsForDate(driver.id, date);
      const isAvailable = activeAssignments.length === 0;
      
      if (isAvailable && ['available', 'operational', 'active'].includes(driver.status?.toLowerCase())) {
        availableDrivers.push(driver);
      }
    }
    
    return availableDrivers;
  } catch (error) {
    console.error('Error getting available drivers:', error);
    return [];
  }
};

// Get available trucks for a specific date and truck type
export const getAvailableTrucksForDate = async (trucks, date, requiredTruckType = null) => {
  try {
    const dateString = format(new Date(date), 'yyyy-MM-dd');
    console.log('Getting available trucks for date:', dateString, 'required type:', requiredTruckType);
    console.log('Total trucks passed:', trucks.length);
    
    const availableTrucks = [];
    
    for (const truck of trucks) {
      const activeAssignments = await getActiveTruckAssignmentsForDate(truck.id, date);
      const isAvailable = activeAssignments.length === 0;
      const isOperational = truck.status && truck.status.toLowerCase() === 'operational';
      
      console.log(`Truck ${truck.plateNumber}: assigned=${!isAvailable}, status=${truck.status}, operational=${isOperational}`);
      
      if (isAvailable && isOperational) {
        // Filter by truck type if specified (case insensitive)
        if (requiredTruckType) {
          if (truck.truckType && truck.truckType.toLowerCase() === requiredTruckType.toLowerCase()) {
            availableTrucks.push(truck);
          }
        } else {
          availableTrucks.push(truck);
        }
      }
    }
    
    console.log('Final available trucks:', availableTrucks.length);
    return availableTrucks;
  } catch (error) {
    console.error('Error getting available trucks:', error);
    return [];
  }
};

// Generic subscription function
export const subscribeToCollection = (collectionName, callback) => {
  try {
    const q = query(collection(db, collectionName), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      callback(data);
    });
  } catch (error) {
    console.error(`Error subscribing to ${collectionName}:`, error);
    return () => {};
  }
};

// Real-time listener for assignments
export const subscribeToAssignments = (callback) => {
  try {
    const q = query(collection(db, 'assignments'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const assignments = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      callback(assignments);
    });
  } catch (error) {
    console.error('Error subscribing to assignments:', error);
    return () => {};
  }
};

// Get all trips from all users (alias for getTrips)
export const getAllTripsFromAllUsers = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, 'dispatches'));
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error fetching all trips:', error);
    return [];
  }
};
