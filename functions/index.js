const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
admin.initializeApp();

const db = admin.firestore();

/**
 * Cloud Function: Automatically update dispatch status when driver assignments change
 * Triggers: When any document in 'dispatches' collection is updated
 */
exports.updateDispatchStatusOnDriverChange = functions.firestore
  .document('dispatches/{dispatchId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    const dispatchId = context.params.dispatchId;
    
    console.log(`🔄 Dispatch ${dispatchId} updated, checking for driver assignment changes...`);
    
    // Check if driverAssignments field changed
    const beforeAssignments = before.driverAssignments || {};
    const afterAssignments = after.driverAssignments || {};
    
    const assignmentChanged = JSON.stringify(beforeAssignments) !== JSON.stringify(afterAssignments);
    
    if (assignmentChanged) {
      console.log(`📊 Driver assignments changed for dispatch ${dispatchId}`);
      
      // Calculate new overall status based on individual driver statuses
      const assignmentStatuses = Object.values(afterAssignments).map(assignment => assignment.status);
      console.log(`📊 Assignment statuses:`, assignmentStatuses);
      
      let newOverallStatus;
      
      if (assignmentStatuses.length === 0) {
        newOverallStatus = after.status; // Keep current status if no assignments
      } else if (assignmentStatuses.every(status => status === 'completed')) {
        newOverallStatus = 'completed';
      } else if (assignmentStatuses.some(status => status === 'in-progress')) {
        newOverallStatus = 'in-progress';
      } else if (assignmentStatuses.every(status => status === 'assigned')) {
        newOverallStatus = 'assigned';
      } else {
        newOverallStatus = 'assigned'; // Default fallback
      }
      
      console.log(`📊 Current status: ${after.status}, Calculated status: ${newOverallStatus}`);
      
      // Update dispatch status if it changed
      if (after.status !== newOverallStatus) {
        console.log(`✅ Updating dispatch ${dispatchId} status from ${after.status} to ${newOverallStatus}`);
        
        await db.collection('dispatches').doc(dispatchId).update({
          status: newOverallStatus,
          'currentStatus.status': newOverallStatus,
          'currentStatus.updatedAt': admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          [`statusChangedAt.${newOverallStatus}`]: admin.firestore.FieldValue.serverTimestamp()
        });
        
        // Update assignments collection records
        await updateAssignmentRecords(dispatchId, newOverallStatus, after);
        
        // Send status change notifications
        await sendStatusChangeNotifications(dispatchId, newOverallStatus, after);
        
        
        // Send completion notifications if status became completed
        if (newOverallStatus === 'completed') {
          await sendCompletionNotifications(dispatchId, after);
        }
        
        console.log(`🎉 Successfully updated dispatch ${dispatchId} to ${newOverallStatus}`);
      } else {
        console.log(`⚡ No status change needed for dispatch ${dispatchId}`);
      }
    } else {
      console.log(`📝 No driver assignment changes detected for dispatch ${dispatchId}`);
    }
  });

/**
 * Update assignment records in the assignments collection
 */
async function updateAssignmentRecords(dispatchId, newStatus, dispatch) {
  try {
    console.log(`🔄 Updating assignment records for dispatch ${dispatchId} to status ${newStatus}`);
    
    // Query assignments for this dispatch
    const assignmentQuery = await db.collection('assignments')
      .where('dispatchId', '==', dispatch.dispatchId || dispatchId)
      .get();
    
    const batch = db.batch();
    
    assignmentQuery.docs.forEach((assignmentDoc) => {
      batch.update(assignmentDoc.ref, {
        status: newStatus,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    });
    
    if (!assignmentQuery.empty) {
      await batch.commit();
      console.log(`✅ Updated ${assignmentQuery.docs.length} assignment records`);
    } else {
      console.log(`📝 No assignment records found for dispatch ${dispatchId}`);
    }
  } catch (error) {
    console.error(`❌ Error updating assignment records:`, error);
  }
}

/**
 * Send notifications for status changes
 */
async function sendStatusChangeNotifications(dispatchId, newStatus, dispatch) {
  try {
    console.log(`📲 Sending notifications for dispatch ${dispatchId} status change to ${newStatus}`);
    
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
    
    if (!statusMessages[newStatus]) {
      console.log(`📝 No notifications configured for status: ${newStatus}`);
      return;
    }
    
    // Send notification to customer's subcollection
    if (dispatch.customerId) {
      try {
        // Find the customer document
        const customersQuery = await db.collection('customers').get();
        let customerDoc = null;
        
        for (const doc of customersQuery.docs) {
          const data = doc.data();
          if (data.customerId === dispatch.customerId || doc.id === dispatch.customerId) {
            customerDoc = doc;
            break;
          }
        }
        
        if (customerDoc) {
          // Add to customer's notifications subcollection
          await db.collection('customers').doc(customerDoc.id).collection('notifications').add({
            type: `dispatch_${newStatus}`,
            title: statusMessages[newStatus].title,
            message: statusMessages[newStatus].customer,
            dispatchId: dispatchId,
            priority: newStatus === 'completed' ? 'high' : 'normal',
            read: false,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
          });
          
          console.log(`📧 Customer notification sent to ${customerDoc.id} for dispatch ${dispatchId}`);
        } else {
          console.log(`⚠️ Customer ${dispatch.customerId} not found for dispatch ${dispatchId}`);
        }
      } catch (error) {
        console.error(`❌ Error sending customer notification:`, error);
      }
    }
    
    // Send notifications to drivers (for completion and other status changes)
    if (dispatch.driverAssignments) {
      const driverIds = Object.keys(dispatch.driverAssignments);
      console.log(`📧 Sending notifications to ${driverIds.length} drivers for dispatch ${dispatchId}`);
      
      for (const driverId of driverIds) {
        try {
          let notificationMessage = '';
          let notificationTitle = '';
          
          if (newStatus === 'completed') {
            notificationTitle = 'Dispatch Completed';
            notificationMessage = `Dispatch #${dispatch.dispatchId || dispatchId} has been completed successfully. All team members have finished their trips.`;
          } else if (newStatus === 'in-progress') {
            notificationTitle = 'Dispatch In Progress';
            notificationMessage = `Dispatch #${dispatch.dispatchId || dispatchId} is now in progress. One or more team members have started their trips.`;
          }
          
          if (notificationMessage) {
            // Add to driver's notifications subcollection
            await db.collection('drivers').doc(driverId).collection('notifications').add({
              type: `dispatch_${newStatus}`,
              title: notificationTitle,
              message: notificationMessage,
              dispatchId: dispatchId,
              priority: 'normal',
              read: false,
              timestamp: admin.firestore.FieldValue.serverTimestamp()
            });
            
            console.log(`📧 Driver notification sent to ${driverId} for dispatch ${dispatchId}`);
          }
        } catch (error) {
          console.error(`❌ Error sending notification to driver ${driverId}:`, error);
        }
      }
    }
    
    // Send global admin notification to main collection
    await db.collection('notifications').add({
      type: 'dispatch_status_update',
      title: 'Dispatch Status Updated',
      message: `Dispatch #${dispatch.dispatchId || dispatchId} status changed to ${newStatus}. ${newStatus === 'completed' ? 'All drivers have completed their trips.' : 'Trip is now in progress.'}`,
      dispatchId: dispatchId,
      priority: newStatus === 'completed' ? 'high' : 'normal',
      read: false,
      isGlobal: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log(`🔔 Global admin notification sent for dispatch ${dispatchId}`);
    
  } catch (error) {
    console.error(`❌ Error sending notifications:`, error);
  }
}

/**
 * Cloud Function: Handle individual driver status updates
 * This can be called directly from the mobile app for immediate processing
 */
exports.updateDriverStatus = functions.https.onCall(async (data, context) => {
  try {
    const { dispatchId, driverId, newStatus } = data;
    
    // Verify authentication (optional but recommended)
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    
    console.log(`📱 Mobile app request: Update driver ${driverId} in dispatch ${dispatchId} to ${newStatus}`);
    
    // Get dispatch document
    const dispatchRef = db.collection('dispatches').doc(dispatchId);
    const dispatchDoc = await dispatchRef.get();
    
    if (!dispatchDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Dispatch not found');
    }
    
    const dispatch = dispatchDoc.data();
    const driverAssignments = dispatch.driverAssignments || {};
    
    if (!driverAssignments[driverId]) {
      throw new functions.https.HttpsError('not-found', 'Driver assignment not found');
    }
    
    // Update driver assignment status
    const updatedAssignment = {
      ...driverAssignments[driverId],
      status: newStatus,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    if (newStatus === 'in-progress' && !updatedAssignment.startedAt) {
      updatedAssignment.startedAt = admin.firestore.FieldValue.serverTimestamp();
    } else if (newStatus === 'completed' && !updatedAssignment.completedAt) {
      updatedAssignment.completedAt = admin.firestore.FieldValue.serverTimestamp();
    }
    
    // Update the dispatch document
    await dispatchRef.update({
      [`driverAssignments.${driverId}`]: updatedAssignment,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log(`✅ Driver ${driverId} status updated to ${newStatus} in dispatch ${dispatchId}`);
    
    // The onUpdate trigger will automatically handle overall status calculation
    return { 
      success: true, 
      message: `Driver status updated to ${newStatus}`,
      updatedAssignment 
    };
    
  } catch (error) {
    console.error(`❌ Error updating driver status:`, error);
    throw error;
  }
});

/**
 * Cloud Function: Scheduled task to sync any missed status updates
 * Runs every 5 minutes to ensure consistency
 */
exports.scheduledStatusSync = functions.pubsub.schedule('every 5 minutes')
  .onRun(async (context) => {
    console.log('🕒 Running scheduled status sync...');
    
    try {
      // Get all dispatches with active assignments
      const dispatchQuery = await db.collection('dispatches')
        .where('status', 'in', ['assigned', 'in-progress'])
        .get();
      
      let syncCount = 0;
      
      for (const dispatchDoc of dispatchQuery.docs) {
        const dispatch = dispatchDoc.data();
        const dispatchId = dispatchDoc.id;
        
        if (dispatch.driverAssignments && Object.keys(dispatch.driverAssignments).length > 0) {
          const assignmentStatuses = Object.values(dispatch.driverAssignments).map(a => a.status);
          
          let expectedStatus;
          if (assignmentStatuses.every(status => status === 'completed')) {
            expectedStatus = 'completed';
          } else if (assignmentStatuses.some(status => status === 'in-progress')) {
            expectedStatus = 'in-progress';
          } else if (assignmentStatuses.every(status => status === 'assigned')) {
            expectedStatus = 'assigned';
          }
          
          // If status doesn't match expectation, fix it
          if (expectedStatus && dispatch.status !== expectedStatus) {
            console.log(`🔧 Fixing status mismatch for dispatch ${dispatchId}: ${dispatch.status} -> ${expectedStatus}`);
            
            await db.collection('dispatches').doc(dispatchId).update({
              status: expectedStatus,
              'currentStatus.status': expectedStatus,
              'currentStatus.updatedAt': admin.firestore.FieldValue.serverTimestamp(),
              updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            
            await updateAssignmentRecords(dispatchId, expectedStatus, dispatch);
            syncCount++;
          }
        }
      }
      
      console.log(`✅ Scheduled sync completed. Fixed ${syncCount} status mismatches.`);
      
    } catch (error) {
    console.error('❌ Scheduled sync failed:', error);
  }
});

// Send completion notifications to all relevant parties
async function sendCompletionNotifications(dispatchId, dispatchData) {
  console.log(`📧 Sending completion notifications for dispatch ${dispatchId}`);
  
  try {
    // Get all assigned drivers
    const driverAssignments = dispatchData.driverAssignments || {};
    const driverIds = Object.keys(driverAssignments);
    
    console.log(`Found ${driverIds.length} drivers assigned to dispatch ${dispatchId}`);
    
    // Send notifications to all assigned drivers
    for (const driverId of driverIds) {
      try {
        // Send to drivers subcollection
        await db.collection('drivers')
          .doc(driverId)
          .collection('notifications')
          .add({
            type: 'dispatch_completed',
            title: 'Dispatch Completed Successfully',
            message: `Dispatch #${dispatchData.dispatchId || dispatchId} has been completed successfully. All team members have finished their trips.`,
            dispatchId: dispatchId,
            priority: 'high',
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            read: false
          });
        
        console.log(`✅ Completion notification sent to driver ${driverId}`);
      } catch (error) {
        console.error(`❌ Failed to send notification to driver ${driverId}:`, error);
      }
    }
    
    // Send notification to customer
    if (dispatchData.customerId) {
      try {
        // Find customer document by customerId
        const customersQuery = await db.collection('customers').get();
        let customerDocId = null;
        
        for (const doc of customersQuery.docs) {
          const data = doc.data();
          if (data.customerId === dispatchData.customerId || doc.id === dispatchData.customerId) {
            customerDocId = doc.id;
            break;
          }
        }
        
        if (customerDocId) {
          // Send to customers subcollection
          await db.collection('customers')
            .doc(customerDocId)
            .collection('notifications')
            .add({
              type: 'dispatch_completed',
              title: 'Your Dispatch is Complete!',
              message: `Your dispatch #${dispatchData.dispatchId || dispatchId} has been completed successfully. All drivers have finished their trips.`,
              dispatchId: dispatchId,
              priority: 'high',
              timestamp: admin.firestore.FieldValue.serverTimestamp(),
              read: false
            });
          
          console.log(`✅ Completion notification sent to customer ${customerDocId}`);
        } else {
          console.log(`⚠️ Customer ${dispatchData.customerId} not found`);
        }
      } catch (error) {
        console.error(`❌ Failed to send notification to customer:`, error);
      }
    }
    
    // Send notification to admins (global notifications collection)
    await db.collection('notifications').add({
      type: 'dispatch_completed',
      title: 'Dispatch Completed',
      message: `Dispatch #${dispatchData.dispatchId || dispatchId} has been completed. All ${driverIds.length} drivers have finished their trips.`,
      dispatchId: dispatchId,
      priority: 'normal',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      read: false
    });
    
    console.log(`✅ Admin notification sent for dispatch ${dispatchId} completion`);
    
  } catch (error) {
    console.error(`❌ Error sending completion notifications:`, error);
  }
}