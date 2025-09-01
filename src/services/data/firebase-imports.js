// Common Firebase imports for all data services
import { 
  collection, 
  doc, 
  addDoc, 
  getDocs, 
  getDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  limit,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { getAuth, deleteUser as deleteAuthUser, createUserWithEmailAndPassword, signOut, signInWithEmailAndPassword, sendPasswordResetEmail, updatePassword, updateProfile } from 'firebase/auth';
import { initializeApp, getApps } from 'firebase/app';
import { db, storage } from '../firebase';

export {
  collection,
  doc,
  addDoc,
  getDocs,
  getDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  limit,
  serverTimestamp,
  writeBatch,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
  getAuth,
  deleteAuthUser,
  createUserWithEmailAndPassword,
  signOut,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  updatePassword,
  updateProfile,
  initializeApp,
  getApps,
  db,
  storage
};
