import { 
  collection, 
  addDoc, 
  getDocs, 
  getDoc, 
  doc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  writeBatch,
  getAuth,
  deleteAuthUser,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
  db 
} from './firebase-imports.js';
import { setDoc } from 'firebase/firestore';
import { deleteImage } from './imageService.js';

// Users/Customers API
export const getUsers = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, 'customers'));
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error fetching users:', error);
    return [];
  }
};

// Alias for getUsers - same data, different name for clarity
export const getCustomers = async () => {
  return await getUsers();
};

export const getUserById = async (userId) => {
  try {
    const userDoc = await getDoc(doc(db, 'customers', userId));
    if (userDoc.exists()) {
      return {
        id: userDoc.id,
        ...userDoc.data()
      };
    }
    return null;
  } catch (error) {
    console.error('Error fetching user:', error);
    return null;
  }
};

export const createUser = async (userData) => {
  try {
    const docRef = await addDoc(collection(db, 'customers'), {
      ...userData,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
};

export const updateUser = async (userId, userData) => {
  try {
    console.log(`Updating user ${userId} with data:`, userData);
    const userRef = doc(db, 'customers', userId);
    await updateDoc(userRef, {
      ...userData,
      updatedAt: new Date()
    });
    console.log(`User ${userId} updated successfully`);
    return true;
  } catch (error) {
    console.error('Error updating user:', error);
    throw error;
  }
};

export const deleteUser = async (userId) => {
  try {
    // Get user data first
    const userDoc = await getDoc(doc(db, 'customers', userId));
    if (!userDoc.exists()) {
      throw new Error('User not found');
    }
    
    const userData = userDoc.data();
    const batch = writeBatch(db);
    
    // Delete user's profile image from Storage if exists
    if (userData.profileImage) {
      try {
        await deleteImage(userData.profileImage);
      } catch (error) {
        console.warn('Could not delete user profile image:', error);
      }
    }
    
    // Delete Firebase Auth user if uid exists
    if (userData.uid) {
      try {
        const auth = getAuth();
        await deleteAuthUser(userData.uid);
      } catch (error) {
        console.warn('Could not delete Firebase Auth user:', error);
      }
    }
    
    // Update related trip documents - set customer info to "removed"
    const tripsQuery = query(collection(db, 'trips'), where('customerId', '==', userData.customerId || userId));
    const tripsSnapshot = await getDocs(tripsQuery);
    
    tripsSnapshot.docs.forEach(tripDoc => {
      batch.update(tripDoc.ref, {
        customerId: 'removed',
        customerName: 'Removed User',
        customerPhone: 'N/A',
        customerEmail: 'N/A'
      });
    });
    
    // Update related dispatch documents  
    const dispatchQuery = query(collection(db, 'dispatches'), where('customerId', '==', userData.customerId || userId));
    const dispatchSnapshot = await getDocs(dispatchQuery);
    
    dispatchSnapshot.docs.forEach(dispatchDoc => {
      batch.update(dispatchDoc.ref, {
        customerId: 'removed',
        customerName: 'Removed User',
        customerPhone: 'N/A',
        customerEmail: 'N/A'
      });
    });
    
    // Delete all notifications in the customer's notifications subcollection
    const notificationsQuery = collection(db, 'customers', userId, 'notifications');
    const notificationsSnapshot = await getDocs(notificationsQuery);
    
    notificationsSnapshot.docs.forEach(notificationDoc => {
      batch.delete(notificationDoc.ref);
    });
    
    // Delete the user document
    batch.delete(doc(db, 'customers', userId));
    
    // Commit all changes
    await batch.commit();
    
    return true;
  } catch (error) {
    console.error('Error deleting user:', error);
    throw error;
  }
};

// Real-time listener for customers/users
export const subscribeToCustomers = (callback) => {
  try {
    const q = query(collection(db, 'customers'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const users = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      callback(users);
    });
  } catch (error) {
    console.error('Error subscribing to customers:', error);
    return () => {};
  }
};

// Check if user exists across different role collections
export const checkUserByEmailAcrossRoles = async (email) => {
  try {
    // Check in admins collection
    const adminQuery = query(collection(db, 'admins'), where('email', '==', email));
    const adminSnapshot = await getDocs(adminQuery);
    
    if (!adminSnapshot.empty) {
      const adminDoc = adminSnapshot.docs[0];
      return {
        id: adminDoc.id,
        role: 'owner', // Admin role is always owner
        ...adminDoc.data()
      };
    }

    // Check in customers collection
    const customerQuery = query(collection(db, 'customers'), where('email', '==', email));
    const customerSnapshot = await getDocs(customerQuery);
    
    if (!customerSnapshot.empty) {
      const customerDoc = customerSnapshot.docs[0];
      return {
        id: customerDoc.id,
        role: 'customer',
        ...customerDoc.data()
      };
    }

    return null; // User doesn't exist in any collection
  } catch (error) {
    console.error('Error checking user across roles:', error);
    throw error;
  }
};

// Create admin user - role is always "owner"
export const createAdminUser = async (userData) => {
  try {
    const { email, password, name, phone } = userData;
    
    // Check if user already exists with same email but different role
    const existingUser = await checkUserByEmailAcrossRoles(email);
    
    if (existingUser && existingUser.role === 'owner') {
      throw new Error('Owner with this email already exists');
    }
    
    // Create Firebase Auth user
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Create admin document - admin role should always be "owner"
    const adminData = {
      uid: user.uid,
      email: email,
      name: name,
      phone: phone || '',
      role: 'owner', // Always set admin role as "owner"
      createdAt: new Date().toISOString(),
      isActive: true
    };

    await setDoc(doc(db, 'admins', user.uid), adminData);

    console.log('Admin user created successfully with owner role:', user.uid);
    return { success: true, uid: user.uid };
  } catch (error) {
    console.error('Error creating admin user:', error);
    throw error;
  }
};
