import { collection, doc, addDoc, getDocs, query, where, orderBy, onSnapshot, updateDoc, deleteDoc, db } from './firebase-imports.js';
import { getCustomers } from './userService.js';
import { getDrivers } from './driverService.js';

// Get all notifications
export const getNotifications = async () => {
  try {
    const q = query(collection(db, 'notifications'), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt
    }));
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return [];
  }
};

// Mark notification as read
export const markNotificationAsRead = async (notificationId) => {
  try {
    const notificationRef = doc(db, 'notifications', notificationId);
    await updateDoc(notificationRef, { isRead: true });
    return true;
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
};

// Delete notification
export const deleteNotification = async (notificationId) => {
  try {
    const notificationRef = doc(db, 'notifications', notificationId);
    await deleteDoc(notificationRef);
    return true;
  } catch (error) {
    console.error('Error deleting notification:', error);
    throw error;
  }
};

// Subscribe to notifications for real-time updates
export const subscribeToNotifications = (callback) => {
  try {
    const q = query(collection(db, 'notifications'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (querySnapshot) => {
      const notifications = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      callback(notifications);
    });
  } catch (error) {
    console.error('Error subscribing to notifications:', error);
    return () => {};
  }
};

// Add notification to notifications collection
export const addNotification = async (notification) => {
  try {
    await addDoc(collection(db, 'notifications'), notification);
    return true;
  } catch (error) {
    console.error('Error adding notification:', error);
    throw error;
  }
};

// Helper function to find customer document ID by customerId field
export const findCustomerDocumentId = async (customerId) => {
  try {
    // If it's already a short ID like cust_001, use it directly
    if (customerId.length <= 10 && customerId.includes('cust_')) {
      return customerId;
    }
    
    // Search for customer by customerId field
    const querySnapshot = await getDocs(collection(db, 'customers'));
    for (const doc of querySnapshot.docs) {
      const data = doc.data();
      if (data.customerId === customerId) {
        return doc.id;
      }
    }
    return null;
  } catch (error) {
    console.error('Error finding customer document ID:', error);
    return null;
  }
};

// Helper function to find driver document ID by driverId field
export const findDriverDocumentId = async (driverId) => {
  try {
    // If it's already a short ID like drv_001, use it directly
    if (driverId.length <= 10 && driverId.includes('drv_')) {
      return driverId;
    }
    
    // Search for driver by driverId field
    const querySnapshot = await getDocs(collection(db, 'drivers'));
    for (const doc of querySnapshot.docs) {
      const data = doc.data();
      if (data.driverId === driverId) {
        return doc.id;
      }
    }
    return null;
  } catch (error) {
    console.error('Error finding driver document ID:', error);
    return null;
  }
};

// Add notification to customer's subcollection
export const addCustomerNotification = async (customerId, notification) => {
  try {
    // If this looks like a document ID (long string), use it directly
    // Otherwise, try to find the document ID by customerId field
    let customerDocId;
    if (customerId.length > 15) {
      // This is likely a document ID, use it directly
      customerDocId = customerId;
    } else {
      // This might be a customerId field, search for it
      customerDocId = await findCustomerDocumentId(customerId);
    }
    
    if (!customerDocId) {
      console.error('Customer not found:', customerId);
      return false;
    }
    
    console.log('Adding notification to customer document ID:', customerDocId);
    const customerRef = doc(db, 'customers', customerDocId);
    const notificationsRef = collection(customerRef, 'notifications');
    
    await addDoc(notificationsRef, {
      ...notification,
      timestamp: new Date(),
      read: false
    });
    return true;
  } catch (error) {
    console.error('Error adding customer notification:', error);
    throw error;
  }
};

// Add notification to driver's subcollection
export const addDriverNotification = async (driverDocumentId, notification) => {
  try {
    console.log('Adding notification to driver document ID:', driverDocumentId);
    
    // Use the document ID directly to create the path: drivers/{documentId}/notifications
    const driverRef = doc(db, 'drivers', driverDocumentId);
    const notificationsRef = collection(driverRef, 'notifications');
    
    await addDoc(notificationsRef, {
      ...notification,
      timestamp: new Date(),
      read: false
    });
    
    console.log('Successfully added notification to drivers/' + driverDocumentId + '/notifications');
    return true;
  } catch (error) {
    console.error('Error adding driver notification:', error);
    throw error;
  }
};

// Send notification to multiple users (customers or drivers)
export const sendBulkNotifications = async (userType, userIds, notification) => {
  const results = [];
  
  for (const userId of userIds) {
    try {
      if (userType === 'customers') {
        await addCustomerNotification(userId, notification);
      } else if (userType === 'drivers') {
        await addDriverNotification(userId, notification);
      }
      results.push({ userId, success: true });
    } catch (error) {
      console.error(`Error sending notification to ${userId}:`, error);
      results.push({ userId, success: false, error: error.message });
    }
  }
  
  return results;
};

// Get customer notifications from subcollection
export const getCustomerNotifications = async (customerId) => {
  try {
    const customerDocId = await findCustomerDocumentId(customerId);
    if (!customerDocId) return [];
    
    const customerRef = doc(db, 'customers', customerDocId);
    const notificationsRef = collection(customerRef, 'notifications');
    const q = query(notificationsRef, orderBy('timestamp', 'desc'));
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error fetching customer notifications:', error);
    return [];
  }
};

// Get driver notifications from subcollection
export const getDriverNotifications = async (driverId) => {
  try {
    const driverDocId = await findDriverDocumentId(driverId);
    if (!driverDocId) return [];
    
    const driverRef = doc(db, 'drivers', driverDocId);
    const notificationsRef = collection(driverRef, 'notifications');
    const q = query(notificationsRef, orderBy('timestamp', 'desc'));
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error fetching driver notifications:', error);
    return [];
  }
};

// Test notification function (for debugging)
export const testNotificationCreation = async () => {
  try {
    const testNotification = {
      title: 'Test Notification',
      message: 'This is a test notification created at ' + new Date().toISOString(),
      type: 'info',
      timestamp: new Date(),
      read: false
    };
    
    // Add to main notifications collection
    await addNotification(testNotification);
    console.log('Test notification created successfully');
    return true;
  } catch (error) {
    console.error('Error creating test notification:', error);
    return false;
  }
};

// Notify about dispatch status change
export const notifyDispatchStatusChange = async (dispatchId, newStatus, tripDetails) => {
  try {
    const notification = {
      title: `Trip Status Updated`,
      message: `Your trip from ${tripDetails.pickup || 'pickup location'} to ${tripDetails.dropoff || 'destination'} is now ${newStatus.toUpperCase()}`,
      type: newStatus === 'completed' ? 'success' : newStatus === 'cancelled' ? 'error' : 'info',
      dispatchId,
      relatedData: {
        tripId: dispatchId,
        status: newStatus,
        pickup: tripDetails.pickup,
        dropoff: tripDetails.dropoff
      },
      timestamp: new Date()
    };

    // Notify customer if available
    if (tripDetails.customerId) {
      await addCustomerNotification(tripDetails.customerId, {
        ...notification,
        title: `Trip ${newStatus.charAt(0).toUpperCase() + newStatus.slice(1)}`
      });
    }

    // Notify driver if available  
    if (tripDetails.driverId) {
      await addDriverNotification(tripDetails.driverId, {
        ...notification,
        title: `Trip Assignment ${newStatus.charAt(0).toUpperCase() + newStatus.slice(1)}`
      });
    }

    // Also add to main notifications for admin
    await addNotification(notification);

    return true;
  } catch (error) {
    console.error('Error sending dispatch status notification:', error);
    return false;
  }
};

// Notify about image uploads for trip inconvenience
export const notifyImageUpload = async (dispatchId, driverId, imageType, tripDetails, notes = '') => {
  try {
    const notification = {
      title: `Trip Image Uploaded`,
      message: `Driver uploaded ${imageType} image for trip from ${tripDetails.pickup || 'pickup'} to ${tripDetails.dropoff || 'destination'}${notes ? '. Notes: ' + notes : ''}`,
      type: 'info',
      dispatchId,
      relatedData: {
        tripId: dispatchId,
        driverId,
        imageType,
        notes,
        pickup: tripDetails.pickup,
        dropoff: tripDetails.dropoff
      },
      timestamp: new Date()
    };

    // Notify customer
    if (tripDetails.customerId) {
      await addCustomerNotification(tripDetails.customerId, {
        ...notification,
        title: `Trip Update - ${imageType.charAt(0).toUpperCase() + imageType.slice(1)} Image`
      });
    }

    // Add to main notifications for admin
    await addNotification(notification);

    return true;
  } catch (error) {
    console.error('Error sending image upload notification:', error);
    return false;
  }
};

// Notify about new trip requests
export const notifyNewRequest = async (dispatchId, tripDetails) => {
  try {
    const notification = {
      title: 'New Trip Request',
      message: `New trip request from ${tripDetails.pickup || 'pickup location'} to ${tripDetails.dropoff || 'destination'}`,
      type: 'info',
      dispatchId,
      relatedData: {
        tripId: dispatchId,
        pickup: tripDetails.pickup,
        dropoff: tripDetails.dropoff,
        customerId: tripDetails.customerId,
        requestedTime: tripDetails.pickupTime
      },
      timestamp: new Date()
    };

    // Add to main notifications for admin dashboard
    await addNotification(notification);

    return true;
  } catch (error) {
    console.error('Error sending new request notification:', error);
    return false;
  }
};

// Enhanced notification sending for different audiences
export const sendNotification = async (notificationData) => {
  try {
    const { audience, recipientId, ...baseNotification } = notificationData;
    
    // Determine where to send the notification based on audience
    switch (audience) {
      case 'all-customers':
        // Send to global notifications collection for admins
        await addDoc(collection(db, 'notifications'), {
          ...baseNotification,
          audience,
          recipientId: 'admin',
          createdAt: new Date(),
          isRead: false
        });
        
        // Get all customers using the service function
        const allCustomers = await getCustomers();
        console.log('Sending notification to all customers:', allCustomers.length, 'customers found');
        console.log('Customer IDs:', allCustomers.map(c => ({ id: c.id, customerId: c.customerId, name: c.name })));
        
        // Send to each customer's subcollection with individual error handling
        const customerNotificationResults = [];
        for (const customer of allCustomers) {
          try {
            console.log(`Attempting to send notification to customer: ${customer.name} (ID: ${customer.id})`);
            await addCustomerNotification(customer.id, {
              type: 'admin_announcement',
              title: baseNotification.title,
              message: baseNotification.message,
              priority: baseNotification.priority || 'normal',
              senderId: baseNotification.senderId,
              senderName: baseNotification.senderName
            });
            customerNotificationResults.push({ customerId: customer.id, success: true });
            console.log(`✓ Successfully sent notification to customer: ${customer.name}`);
          } catch (error) {
            console.error(`✗ Failed to send notification to customer ${customer.name} (${customer.id}):`, error);
            customerNotificationResults.push({ customerId: customer.id, success: false, error: error.message });
          }
        }
        
        console.log('Customer notification results:', customerNotificationResults);
        console.log('Successfully processed notifications for all customers');
        break;
        
      case 'all-drivers':
        // Send to global notifications collection for admins
        await addDoc(collection(db, 'notifications'), {
          ...baseNotification,
          audience,
          recipientId: 'admin',
          createdAt: new Date(),
          isRead: false
        });
        
        // Get all drivers using the service function
        const allDrivers = await getDrivers();
        console.log('Sending notification to all drivers:', allDrivers.length, 'drivers found');
        console.log('Driver IDs:', allDrivers.map(d => ({ id: d.id, driverId: d.driverId, name: d.name })));
        
        // Send to each driver's subcollection with individual error handling
        const driverNotificationResults = [];
        for (const driver of allDrivers) {
          try {
            console.log(`Attempting to send notification to driver: ${driver.name} (ID: ${driver.id})`);
            await addDriverNotification(driver.id, {
              type: 'admin_announcement',
              title: baseNotification.title,
              message: baseNotification.message,
              priority: baseNotification.priority || 'normal',
              senderId: baseNotification.senderId,
              senderName: baseNotification.senderName
            });
            driverNotificationResults.push({ driverId: driver.id, success: true });
            console.log(`✓ Successfully sent notification to driver: ${driver.name}`);
          } catch (error) {
            console.error(`✗ Failed to send notification to driver ${driver.name} (${driver.id}):`, error);
            driverNotificationResults.push({ driverId: driver.id, success: false, error: error.message });
          }
        }
        
        console.log('Driver notification results:', driverNotificationResults);
        console.log('Successfully processed notifications for all drivers');
        break;
        
      case 'specific-driver':
        if (!recipientId) throw new Error('Recipient ID required for specific driver notification');
        
        // Send to global notifications collection for admins
        await addDoc(collection(db, 'notifications'), {
          ...baseNotification,
          audience,
          recipientId,
          createdAt: new Date(),
          isRead: false
        });
        
        // Send to specific driver
        await addDriverNotification(recipientId, {
          type: 'admin_message',
          title: baseNotification.title,
          message: baseNotification.message,
          priority: baseNotification.priority || 'normal',
          senderId: baseNotification.senderId,
          senderName: baseNotification.senderName
        });
        break;
        
      case 'specific-customer':
        if (!recipientId) throw new Error('Recipient ID required for specific customer notification');
        
        // Send to global notifications collection for admins
        await addDoc(collection(db, 'notifications'), {
          ...baseNotification,
          audience,
          recipientId,
          createdAt: new Date(),
          isRead: false
        });
        
        // Send to specific customer
        await addCustomerNotification(recipientId, {
          type: 'admin_message',
          title: baseNotification.title,
          message: baseNotification.message,
          priority: baseNotification.priority || 'normal',
          senderId: baseNotification.senderId,
          senderName: baseNotification.senderName
        });
        break;
        
      default:
        // Default to admin-only notification
        await addDoc(collection(db, 'notifications'), {
          ...baseNotification,
          audience: audience || 'admin-only',
          recipientId: 'admin',
          createdAt: new Date(),
          isRead: false
        });
    }
    
    return true;
  } catch (error) {
    console.error('Error sending notification:', error);
    throw error;
  }
};
