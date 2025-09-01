import { 
  doc, 
  updateDoc, 
  getDoc,
  collection,
  getDocs,
  query,
  where 
} from 'firebase/firestore';
import { db } from '../firebase';
import { 
  addDriverNotification, 
  addCustomerNotification,
  addNotification 
} from './notificationService';

// Update individual driver assignment status
export const updateDriverAssignmentStatus = async (dispatchId, driverId, newStatus, additionalData = {}) => {
  try {
    const dispatchRef = doc(db, 'dispatches', dispatchId);
    const dispatchSnap = await getDoc(dispatchRef);
    
    if (!dispatchSnap.exists()) {
      throw new Error('Dispatch not found');
    }
    
    const dispatch = dispatchSnap.data();
    const driverAssignments = dispatch.driverAssignments || {};
    
    if (!driverAssignments[driverId]) {
      throw new Error('Driver assignment not found');
    }
    
    // Update individual driver status
    const updatedAssignment = {
      ...driverAssignments[driverId],
      status: newStatus,
      updatedAt: new Date(),
      ...additionalData
    };
    
    // Add timestamp based on status
    if (newStatus === 'in-progress' && !updatedAssignment.startedAt) {
      updatedAssignment.startedAt = new Date();
    } else if (newStatus === 'completed' && !updatedAssignment.completedAt) {
      updatedAssignment.completedAt = new Date();
    }
    
    // Update the specific driver assignment
    await updateDoc(dispatchRef, {
      [`driverAssignments.${driverId}`]: updatedAssignment,
      updatedAt: new Date()
    });
    
    // Calculate and update overall dispatch status
    await updateOverallDispatchStatus(dispatchId);
    
    // Send notifications (including admin context if provided)
    await sendStatusChangeNotifications(dispatchId, driverId, newStatus, dispatch, additionalData);
    
    return { success: true, updatedAssignment };
  } catch (error) {
    console.error('Error updating driver assignment status:', error);
    throw error;
  }
};

// Calculate and update overall dispatch status based on all driver assignments
export const updateOverallDispatchStatus = async (dispatchId) => {
  try {
    const dispatchRef = doc(db, 'dispatches', dispatchId);
    const dispatchSnap = await getDoc(dispatchRef);
    
    if (!dispatchSnap.exists()) {
      throw new Error('Dispatch not found');
    }
    
    const dispatch = dispatchSnap.data();
    const driverAssignments = dispatch.driverAssignments || {};
    const assignmentStatuses = Object.values(driverAssignments).map(assignment => assignment.status);
    
    console.log(`📊 Assignment statuses for dispatch ${dispatchId}:`, assignmentStatuses);
    console.log(`📊 Current dispatch status: ${dispatch.status}`);
    
    let newOverallStatus;
    
    // Determine overall status based on individual driver statuses
    if (assignmentStatuses.length === 0) {
      newOverallStatus = dispatch.status; // Keep current status if no assignments
    } else if (assignmentStatuses.every(status => status === 'completed')) {
      newOverallStatus = 'completed';
    } else if (assignmentStatuses.some(status => status === 'in-progress')) {
      newOverallStatus = 'in-progress';
    } else if (assignmentStatuses.every(status => status === 'assigned')) {
      newOverallStatus = 'assigned';
    } else {
      newOverallStatus = 'assigned'; // Default fallback
    }
    
    console.log(`📊 Calculated new overall status: ${newOverallStatus}`);
    
    // Only update if status actually changed
    if (dispatch.status !== newOverallStatus) {
      await updateDoc(dispatchRef, {
        status: newOverallStatus,
        'currentStatus.status': newOverallStatus,
        'currentStatus.updatedAt': new Date(),
        updatedAt: new Date(),
        [`statusChangedAt.${newOverallStatus}`]: new Date()
      });
      
      console.log(`✅ Updated dispatch ${dispatchId} status from ${dispatch.status} to ${newOverallStatus}`);
      
      // Update assignments collection records as well
      await updateAssignmentRecordsStatus(dispatchId, newOverallStatus);
      
      // Send overall status change notifications
      await sendOverallStatusChangeNotifications(dispatchId, newOverallStatus, dispatch);
    }
    
    return newOverallStatus;
  } catch (error) {
    console.error('Error updating overall dispatch status:', error);
    throw error;
  }
};

// Update assignment records in assignments collection to match dispatch status
const updateAssignmentRecordsStatus = async (dispatchId, newStatus) => {
  try {
    // Query assignments for this dispatch
    const assignmentsQuery = query(
      collection(db, 'assignments'),
      where('dispatchId', '==', dispatchId)
    );
    
    const assignmentsSnap = await getDocs(assignmentsQuery);
    
    // Update all assignment records
    const updatePromises = assignmentsSnap.docs.map(assignmentDoc => 
      updateDoc(assignmentDoc.ref, {
        status: newStatus,
        updatedAt: new Date()
      })
    );
    
    await Promise.all(updatePromises);
    console.log(`✅ Updated ${assignmentsSnap.docs.length} assignment records to status: ${newStatus}`);
  } catch (error) {
    console.error('Error updating assignment records:', error);
  }
};

// Send notifications when individual driver status changes
const sendStatusChangeNotifications = async (dispatchId, driverId, newStatus, dispatch, additionalData = {}) => {
  try {
    // Get driver details
    const driverRef = doc(db, 'drivers', driverId);
    const driverSnap = await getDoc(driverRef);
    const driver = driverSnap.exists() ? driverSnap.data() : { name: 'Unknown Driver' };
    
    const { adminInitiated, adminName } = additionalData;
    const adminSuffix = adminInitiated && adminName ? ` by ${adminName}` : '';
    
    // Notification messages based on status
    const statusMessages = {
      'in-progress': {
        customer: `Driver ${driver.name} has started your trip for dispatch #${dispatch.dispatchId || dispatchId}${adminSuffix}.`,
        driver: adminInitiated ? 
          `Your trip for dispatch #${dispatch.dispatchId || dispatchId} has been started by administrator${adminName ? ` ${adminName}` : ''}.` :
          `You have started the trip for dispatch #${dispatch.dispatchId || dispatchId}.`,
        other_drivers: `Driver ${driver.name} has started their part of dispatch #${dispatch.dispatchId || dispatchId}${adminSuffix}.`
      },
      'completed': {
        customer: `Driver ${driver.name} has completed their part of dispatch #${dispatch.dispatchId || dispatchId}${adminSuffix}.`,
        driver: adminInitiated ?
          `Your trip for dispatch #${dispatch.dispatchId || dispatchId} has been completed by administrator${adminName ? ` ${adminName}` : ''}.` :
          `You have completed the trip for dispatch #${dispatch.dispatchId || dispatchId}.`,
        other_drivers: `Driver ${driver.name} has completed their part of dispatch #${dispatch.dispatchId || dispatchId}${adminSuffix}.`
      }
    };
    
    if (!statusMessages[newStatus]) return;
    
    // Send notification to customer
    if (dispatch.customerId) {
      await addCustomerNotification(dispatch.customerId, {
        type: adminInitiated ? `driver_${newStatus}_by_admin` : `driver_${newStatus}`,
        title: newStatus === 'in-progress' ? 'Trip Started' : 'Trip Update',
        message: statusMessages[newStatus].customer,
        dispatchId: dispatchId,
        driverId: driverId,
        priority: adminInitiated ? 'high' : 'normal'
      });
    }
    
    // Send notification to the driver who changed status
    await addDriverNotification(driverId, {
      type: adminInitiated ? `trip_${newStatus}_by_admin` : `trip_${newStatus}`,
      title: adminInitiated ? 
        `Trip ${newStatus === 'in-progress' ? 'Started' : 'Completed'} by Admin` :
        newStatus === 'in-progress' ? 'Trip Started' : 'Trip Completed',
      message: statusMessages[newStatus].driver,
      dispatchId: dispatchId,
      priority: adminInitiated ? 'high' : 'normal'
    });
    
    // Send notifications to other assigned drivers
    const driverAssignments = dispatch.driverAssignments || {};
    for (const otherDriverId of Object.keys(driverAssignments)) {
      if (otherDriverId !== driverId) {
        await addDriverNotification(otherDriverId, {
          type: adminInitiated ? `colleague_${newStatus}_by_admin` : `colleague_${newStatus}`,
          title: adminInitiated ? 'Admin Team Update' : 'Team Update',
          message: statusMessages[newStatus].other_drivers,
          dispatchId: dispatchId,
          priority: adminInitiated ? 'normal' : 'low'
        });
      }
    }

    // Send global notification to admins
    await addNotification({
      type: `driver_status_update`,
      title: `Driver Status Update`,
      message: `Driver ${driver.name} has ${newStatus === 'in-progress' ? 'started' : newStatus} their trip for dispatch #${dispatch.dispatchId || dispatchId}.`,
      dispatchId: dispatchId,
      driverId: driverId,
      priority: 'normal'
    });
  } catch (error) {
    console.error('Error sending status change notifications:', error);
  }
};

// Send notifications when overall dispatch status changes
const sendOverallStatusChangeNotifications = async (dispatchId, newOverallStatus, dispatch) => {
  try {
    const statusMessages = {
      'in-progress': {
        customer: `Your dispatch #${dispatch.dispatchId || dispatchId} is now in progress. One or more drivers have started the trip.`,
        title: 'Dispatch In Progress'
      },
      'completed': {
        customer: `Your dispatch #${dispatch.dispatchId || dispatchId} has been completed successfully. All drivers have finished their trips.`,
        title: 'Dispatch Completed'
      }
    };
    
    if (!statusMessages[newOverallStatus]) return;
    
    // Send notification to customer about overall status change
    if (dispatch.customerId) {
      await addCustomerNotification(dispatch.customerId, {
        type: `dispatch_${newOverallStatus}`,
        title: statusMessages[newOverallStatus].title,
        message: statusMessages[newOverallStatus].customer,
        dispatchId: dispatchId,
        priority: newOverallStatus === 'completed' ? 'high' : 'normal'
      });
      
      console.log(`📧 Customer notification sent for dispatch ${dispatchId} completion`);
    }
    
    // Send notifications to ALL assigned drivers about overall status change
    if (dispatch.driverAssignments) {
      const driverIds = Object.keys(dispatch.driverAssignments);
      console.log(`📧 Sending ${newOverallStatus} notifications to ${driverIds.length} drivers`);
      
      for (const driverId of driverIds) {
        try {
          let notificationMessage = '';
          let notificationTitle = '';
          
          if (newOverallStatus === 'completed') {
            notificationTitle = 'Dispatch Completed';
            notificationMessage = `Dispatch #${dispatch.dispatchId || dispatchId} has been completed successfully. All team members have finished their trips.`;
          } else if (newOverallStatus === 'in-progress') {
            notificationTitle = 'Dispatch In Progress';
            notificationMessage = `Dispatch #${dispatch.dispatchId || dispatchId} is now in progress. One or more team members have started their trips.`;
          }
          
          if (notificationMessage) {
            await addDriverNotification(driverId, {
              type: `dispatch_${newOverallStatus}`,
              title: notificationTitle,
              message: notificationMessage,
              dispatchId: dispatchId,
              priority: newOverallStatus === 'completed' ? 'high' : 'normal'
            });
            
            console.log(`📧 Driver ${driverId} notification sent for dispatch ${dispatchId}`);
          }
        } catch (error) {
          console.error(`❌ Error sending notification to driver ${driverId}:`, error);
        }
      }
    }

    // Send global notification to admins about overall status change
    await addNotification({
      type: `dispatch_status_update`,
      title: `Dispatch Status Updated`,
      message: `Dispatch #${dispatch.dispatchId || dispatchId} status changed to ${newOverallStatus}. ${newOverallStatus === 'completed' ? 'All drivers have completed their trips.' : 'Trip is now in progress.'}`,
      dispatchId: dispatchId,
      priority: newOverallStatus === 'completed' ? 'high' : 'normal'
    });
    
    console.log(`🔔 Admin notification sent for dispatch ${dispatchId} status change to ${newOverallStatus}`);
  } catch (error) {
    console.error('Error sending overall status change notifications:', error);
  }
};

// Admin function to start trip for all drivers (override)
export const adminStartDispatch = async (dispatchId, adminUserId) => {
  try {
    const dispatchRef = doc(db, 'dispatches', dispatchId);
    const dispatchSnap = await getDoc(dispatchRef);
    
    if (!dispatchSnap.exists()) {
      throw new Error('Dispatch not found');
    }
    
    const dispatch = dispatchSnap.data();
    const driverAssignments = dispatch.driverAssignments || {};
    
    // Update all driver assignments to in-progress
    const updatedAssignments = {};
    const startTime = new Date();
    
    for (const [driverId, assignment] of Object.entries(driverAssignments)) {
      updatedAssignments[driverId] = {
        ...assignment,
        status: 'in-progress',
        startedAt: startTime,
        updatedAt: startTime,
        startedBy: 'admin',
        adminOverride: true
      };
    }
    
    // Update dispatch with all drivers started
    await updateDoc(dispatchRef, {
      status: 'in-progress',
      driverAssignments: updatedAssignments,
      adminStartedAt: startTime,
      startedBy: adminUserId,
      updatedAt: startTime
    });
    
    // Send notifications to all drivers and customer
    await sendAdminStartNotifications(dispatchId, dispatch, Object.keys(driverAssignments));
    
    return { success: true, startedDrivers: Object.keys(driverAssignments).length };
  } catch (error) {
    console.error('Error admin starting dispatch:', error);
    throw error;
  }
};

// Send notifications when admin starts dispatch for all drivers
const sendAdminStartNotifications = async (dispatchId, dispatch, driverIds) => {
  try {
    // Send notification to customer
    if (dispatch.customerId) {
      await addCustomerNotification(dispatch.customerId, {
        type: 'dispatch_started',
        title: 'Trip Started',
        message: `Your dispatch #${dispatch.dispatchId || dispatchId} has been started. All ${driverIds.length} drivers are now en route.`,
        dispatchId: dispatchId,
        priority: 'high'
      });
    }
    
    // Send notifications to all assigned drivers
    for (const driverId of driverIds) {
      await addDriverNotification(driverId, {
        type: 'trip_started_admin',
        title: 'Trip Started by Admin',
        message: `Your trip for dispatch #${dispatch.dispatchId || dispatchId} has been started by admin. Please proceed with the delivery.`,
        dispatchId: dispatchId,
        priority: 'high',
        actionRequired: true
      });
    }
  } catch (error) {
    console.error('Error sending admin start notifications:', error);
  }
};

// Get driver assignment details for a specific dispatch
export const getDriverAssignmentStatus = async (dispatchId, driverId) => {
  try {
    const dispatchRef = doc(db, 'dispatches', dispatchId);
    const dispatchSnap = await getDoc(dispatchRef);
    
    if (!dispatchSnap.exists()) {
      throw new Error('Dispatch not found');
    }
    
    const dispatch = dispatchSnap.data();
    const driverAssignments = dispatch.driverAssignments || {};
    
    return {
      assignment: driverAssignments[driverId] || null,
      overallStatus: dispatch.status,
      allAssignments: driverAssignments
    };
  } catch (error) {
    console.error('Error getting driver assignment status:', error);
    throw error;
  }
};
