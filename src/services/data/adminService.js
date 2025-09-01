import { 
  collection, 
  getDocs, 
  getDoc, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updatePassword,
  updateProfile,
  db 
} from './firebase-imports.js';
import { uploadImage, deleteImage } from './imageService.js';

// Check if email exists in any role
export const checkEmailExists = async (email) => {
  try {
    const roles = ['admins', 'customers', 'drivers'];
    const results = {};
    
    for (const role of roles) {
      let q;
      if (role === 'drivers') {
        // For drivers, check by email field
        q = query(collection(db, role), where('email', '==', email));
      } else if (role === 'admins') {
        // For admins, check by email field
        q = query(collection(db, role), where('email', '==', email));
      } else {
        // For customers, check by email field
        q = query(collection(db, role), where('email', '==', email));
      }
      
      const querySnapshot = await getDocs(q);
      results[role] = !querySnapshot.empty;
    }
    
    return results;
  } catch (error) {
    console.error('Error checking email existence:', error);
    return { admins: false, customers: false, drivers: false };
  }
};

// Create a new administrator with role-based email handling
export const createAdminWithRoleCheck = async (adminData) => {
  try {
    // Check if email already exists
    const emailExists = await checkEmailExists(adminData.email);
    
    if (emailExists.admins) {
      throw new Error('An administrator with this email already exists.');
    }
    
    // Allow creation even if email exists in other roles
    if (emailExists.customers || emailExists.drivers) {
      console.log(`Email ${adminData.email} exists in other roles, but allowing admin creation`);
    }
    
    return await createAdmin(adminData);
  } catch (error) {
    console.error('Error creating admin with role check:', error);
    throw error;
  }
};

// Generate admin ID
const generateAdminId = () => {
  return `admin_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Create a new administrator
export const createAdmin = async (adminData) => {
  try {
    console.log('Creating admin with data:', adminData);
    const auth = getAuth();
    const currentAdmin = auth.currentUser;
    const currentAdminEmail = currentAdmin?.email;

    // Generate temporary password
    const tempPassword = `Temp${Math.random().toString(36).slice(-8)}!`;
    const adminId = generateAdminId();

    let profileImageUrl = '';

    // Handle profile image upload
    if (adminData.profileImage && adminData.profileImage instanceof File) {
      const imagePath = `admin/${adminId}/profile.jpg`;
      profileImageUrl = await uploadImage(adminData.profileImage, imagePath);
    }

    // Create Firebase Auth user
    const userCredential = await createUserWithEmailAndPassword(auth, adminData.email, tempPassword);
    const user = userCredential.user;

    // Update user profile with display name
    await updateProfile(user, {
      displayName: adminData.name
    });

    // Create admin document in Firestore BEFORE signing back in
    const adminDoc = {
      adminId: user.uid, // Use Firebase UID as adminId
      createAt: new Date(),
      email: adminData.email,
      name: adminData.name,
      permissions: ['manage_all'], // Default permission
      phone: adminData.phone || '',
      profileImage: profileImageUrl,
      role: 'owner',
      status: 'active'
    };

    await addDoc(collection(db, 'admins'), adminDoc);

    // Now sign back in as current admin if one exists
    if (currentAdmin && currentAdminEmail) {
      try {
        await signOut(auth);
        // Note: In production, this should be handled with Firebase Admin SDK
        // to avoid signing out the current admin
        console.log('Admin created successfully, but current admin was signed out');
      } catch (signInError) {
        console.warn('Could not sign back in as current admin:', signInError);
      }
    }

    console.log('Admin created successfully:', {
      email: adminData.email,
      tempPassword: tempPassword,
      uid: user.uid
    });

    return {
      success: true,
      adminId: user.uid,
      email: adminData.email,
      tempPassword: tempPassword,
      message: 'Admin created successfully. Please save the temporary password.',
      requireReauth: !!currentAdmin // Indicate that re-auth is needed
    };

  } catch (error) {
    console.error('Error creating admin:', error);
    
    // Provide more specific error messages
    if (error.code === 'auth/email-already-in-use') {
      throw new Error('Email address is already registered. Please use a different email.');
    } else if (error.code === 'auth/invalid-email') {
      throw new Error('Invalid email address format.');
    } else if (error.code === 'auth/weak-password') {
      throw new Error('Generated password is too weak. Please try again.');
    }
    
    throw new Error(`Failed to create admin: ${error.message}`);
  }
};

// Get all administrators
export const getAdmins = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, 'admins'));
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error fetching admins:', error);
    return [];
  }
};

// Get admin by ID
export const getAdminById = async (adminId) => {
  try {
    const adminDoc = await getDoc(doc(db, 'admins', adminId));
    if (adminDoc.exists()) {
      return {
        id: adminDoc.id,
        ...adminDoc.data()
      };
    }
    return null;
  } catch (error) {
    console.error('Error fetching admin:', error);
    return null;
  }
};

// Get admin by Firebase UID
export const getAdminByUID = async (uid) => {
  try {
    const q = query(collection(db, 'admins'), where('adminId', '==', uid));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const adminDoc = querySnapshot.docs[0];
      return {
        id: adminDoc.id,
        ...adminDoc.data()
      };
    }
    return null;
  } catch (error) {
    console.error('Error fetching admin by UID:', error);
    return null;
  }
};

// Update admin information
export const updateAdmin = async (adminId, updateData) => {
  try {
    let profileImageUrl = updateData.profileImage;

    // Handle profile image upload if it's a file
    if (updateData.profileImage && updateData.profileImage instanceof File) {
      const admin = await getAdminById(adminId);
      
      // Delete old image if it exists
      if (admin?.profileImage) {
        try {
          await deleteImage(admin.profileImage);
        } catch (error) {
          console.warn('Could not delete old profile image:', error);
        }
      }

      // Upload new image
      const imagePath = `admin/${admin?.adminId || adminId}/profile.jpg`;
      profileImageUrl = await uploadImage(updateData.profileImage, imagePath);
    }

    // Update Firestore document
    const adminRef = doc(db, 'admins', adminId);
    await updateDoc(adminRef, {
      ...updateData,
      profileImage: profileImageUrl,
      updatedAt: new Date()
    });

    // Update Firebase Auth profile if name changed
    if (updateData.name) {
      const auth = getAuth();
      const currentUser = auth.currentUser;
      if (currentUser) {
        await updateProfile(currentUser, {
          displayName: updateData.name
        });
      }
    }

    return true;
  } catch (error) {
    console.error('Error updating admin:', error);
    throw error;
  }
};

// Delete administrator
export const deleteAdmin = async (adminId) => {
  try {
    // Get admin data first
    const adminDoc = await getDoc(doc(db, 'admins', adminId));
    if (!adminDoc.exists()) {
      throw new Error('Admin not found');
    }

    const adminData = adminDoc.data();

    // Delete profile image if it exists
    if (adminData.profileImage) {
      try {
        await deleteImage(adminData.profileImage);
      } catch (error) {
        console.warn('Could not delete profile image:', error);
      }
    }

    // Delete Firestore document
    await deleteDoc(doc(db, 'admins', adminId));

    // Note: Firebase Auth user deletion should be handled on the backend
    // with Firebase Admin SDK for security reasons
    
    return true;
  } catch (error) {
    console.error('Error deleting admin:', error);
    throw error;
  }
};

// Admin authentication functions
export const adminLogin = async (email, password) => {
  try {
    const auth = getAuth();
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Check if user is an admin
    const adminData = await getAdminByUID(user.uid);
    if (!adminData) {
      await signOut(auth);
      throw new Error('Access denied. Admin account not found.');
    }

    if (adminData.status !== 'active') {
      await signOut(auth);
      throw new Error('Account is not active. Please contact system administrator.');
    }

    return {
      success: true,
      user: user,
      adminData: adminData
    };
  } catch (error) {
    console.error('Admin login error:', error);
    throw error;
  }
};

export const adminLogout = async () => {
  try {
    const auth = getAuth();
    await signOut(auth);
    return { success: true };
  } catch (error) {
    console.error('Admin logout error:', error);
    throw error;
  }
};

// Password management
export const sendAdminPasswordReset = async (email) => {
  try {
    const auth = getAuth();
    await sendPasswordResetEmail(auth, email);
    return { 
      success: true, 
      message: 'Password reset email sent successfully.' 
    };
  } catch (error) {
    console.error('Password reset error:', error);
    throw error;
  }
};

export const updateAdminPassword = async (currentPassword, newPassword) => {
  try {
    const auth = getAuth();
    const user = auth.currentUser;
    
    if (!user) {
      throw new Error('No authenticated user found.');
    }

    // Re-authenticate user first
    await signInWithEmailAndPassword(auth, user.email, currentPassword);
    
    // Update password
    await updatePassword(user, newPassword);

    return { 
      success: true, 
      message: 'Password updated successfully.' 
    };
  } catch (error) {
    console.error('Password update error:', error);
    throw error;
  }
};

// Subscribe to admin changes
export const subscribeToAdmins = (callback) => {
  try {
    const q = query(collection(db, 'admins'), orderBy('createAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const admins = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      callback(admins);
    });
  } catch (error) {
    console.error('Error subscribing to admins:', error);
    return () => {};
  }
};
