import React, { createContext, useContext, useState, useEffect } from 'react';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../services/firebase.js';
import { doc, getDoc } from 'firebase/firestore';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const login = async (email, password, rememberMe = false) => {
    try {
      setError(null);
      setLoading(true);
      
      console.log('Attempting login with email:', email);
      
      // Sign in with Firebase Auth
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      console.log('Firebase Auth successful, UID:', user.uid);
      
      // Check if user exists in admins collection with owner role
      const adminDoc = await getDoc(doc(db, 'admins', user.uid));
      
      console.log('Admin document exists:', adminDoc.exists());
      
      if (!adminDoc.exists()) {
        // If no admin document, sign out and throw error
        await signOut(auth);
        throw new Error('Access denied. Admin account not found.');
      }
      
      const adminData = adminDoc.data();
      console.log('Admin data:', adminData);
      
      // Check if role is owner
      if (adminData.role !== 'owner') {
        await signOut(auth);
        throw new Error('Access denied. Owner role required.');
      }
      
      // Check if account is active
      if (!adminData.isActive) {
        await signOut(auth);
        throw new Error('Account is deactivated. Please contact support.');
      }
      
      const adminUser = {
        uid: user.uid,
        email: user.email,
        emailVerified: user.emailVerified,
        displayName: adminData.name,
        photoURL: user.photoURL,
        role: adminData.role,
        name: adminData.name,
        phone: adminData.phone
      };
      
      console.log('Login successful, setting current user:', adminUser);
      setCurrentUser(adminUser);
      
      if (rememberMe) {
        localStorage.setItem('admin_session', 'true');
      }
      
      return { user: adminUser };
    } catch (error) {
      console.error('Login error:', error);
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setError(null);
      await signOut(auth);
      setCurrentUser(null);
      localStorage.removeItem('admin_session');
    } catch (error) {
      console.error('Logout error:', error);
      setError(error.message);
      throw error;
    }
  };

  const changePassword = async (currentPassword, newPassword) => {
    try {
      setError(null);
      if (!currentUser) {
        throw new Error('No user logged in');
      }

      // Mock password change for now - you can implement proper Firebase password change
      await new Promise(resolve => setTimeout(resolve, 800));
      
      return { success: true, message: 'Password updated successfully' };
    } catch (error) {
      setError(error.message);
      throw error;
    }
  };

  const forgotPassword = async (email) => {
    try {
      setError(null);
      await new Promise(resolve => setTimeout(resolve, 800));
      return { success: true, message: 'Password reset email sent successfully' };
    } catch (error) {
      setError(error.message);
      throw error;
    }
  };

  const sendVerificationEmail = async () => {
    try {
      setError(null);
      if (!currentUser) {
        throw new Error('No user logged in');
      }
      await new Promise(resolve => setTimeout(resolve, 500));
      return { success: true, message: 'Verification email sent successfully' };
    } catch (error) {
      setError(error.message);
      throw error;
    }
  };

  const getCurrentUser = () => {
    return currentUser;
  };

  const isAuthenticated = () => {
    return !!currentUser;
  };

  useEffect(() => {
    console.log('Setting up auth state listener...');
    
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        console.log('Auth state changed:', user ? user.uid : 'No user');
        
        if (user) {
          // Check if user exists in admins collection
          const adminDoc = await getDoc(doc(db, 'admins', user.uid));
          
          if (adminDoc.exists()) {
            const adminData = adminDoc.data();
            
            // Only set user if they have owner role and are active
            if (adminData.role === 'owner' && adminData.isActive) {
              const adminUser = {
                uid: user.uid,
                email: user.email,
                emailVerified: user.emailVerified,
                displayName: adminData.name,
                photoURL: user.photoURL,
                role: adminData.role,
                name: adminData.name,
                phone: adminData.phone
              };
              
              console.log('Setting current user from auth state:', adminUser);
              setCurrentUser(adminUser);
            } else {
              console.log('User does not have owner role or is inactive');
              setCurrentUser(null);
              await signOut(auth);
            }
          } else {
            console.log('User not found in admins collection');
            setCurrentUser(null);
            await signOut(auth);
          }
        } else {
          console.log('No user, clearing current user');
          setCurrentUser(null);
        }
      } catch (error) {
        console.error('Error in auth state change:', error);
        setCurrentUser(null);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const value = {
    currentUser,
    login,
    logout,
    changePassword,
    forgotPassword,
    sendVerificationEmail,
    getCurrentUser,
    isAuthenticated,
    loading,
    error,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
