import { ref, uploadBytes, getDownloadURL, deleteObject, collection, doc, addDoc, getDocs, query, where, orderBy, db, storage } from './firebase-imports.js';

// Image upload utility functions
export const uploadImage = async (file, folder, fileName) => {
  try {
    const timestamp = Date.now();
    const uniqueFileName = fileName ? `${fileName}_${timestamp}` : `${file.name}_${timestamp}`;
    const imageRef = ref(storage, `${folder}/${uniqueFileName}`);
    
    const snapshot = await uploadBytes(imageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);
    
    return downloadURL;
  } catch (error) {
    console.error('Error uploading image:', error);
    throw error;
  }
};

export const deleteImage = async (imageUrl) => {
  try {
    const imageRef = ref(storage, imageUrl);
    await deleteObject(imageRef);
    return true;
  } catch (error) {
    console.error('Error deleting image:', error);
    throw error;
  }
};

// Convert base64 to file (for handling pasted images or data URLs)
export const base64ToFile = (base64Data, fileName = 'image.png') => {
  const arr = base64Data.split(',');
  const mime = arr[0].match(/:(.*?);/)[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], fileName, { type: mime });
};

// Save dispatch image information to dispatch_images collection
export const saveDispatchImage = async (dispatchId, driverId, imageType, imageUrl, notes = '', additionalData = {}) => {
  try {
    const imageData = {
      dispatchId,
      driverId,
      imageType, // 'pickup', 'delivery', 'inconvenience', etc.
      imageUrl,
      notes,
      timestamp: new Date(),
      ...additionalData
    };
    
    await addDoc(collection(db, 'dispatch_images'), imageData);
    return true;
  } catch (error) {
    console.error('Error saving dispatch image:', error);
    throw error;
  }
};

// Get dispatch images for a specific trip
export const getDispatchImages = async (dispatchId) => {
  try {
    const q = query(
      collection(db, 'dispatch_images'),
      where('dispatchId', '==', dispatchId),
      orderBy('timestamp', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error fetching dispatch images:', error);
    return [];
  }
};

// Upload trip inconvenience image
export const uploadTripImage = async (file, dispatchId, driverId, imageType, notes = '') => {
  try {
    // Upload image to Firebase Storage in dispatches folder
    const imageUrl = await uploadImage(file, `dispatches/${dispatchId}`, `${imageType}_${Date.now()}`);
    
    // Save image metadata to dispatch_images collection
    await saveDispatchImage(dispatchId, driverId, imageType, imageUrl, notes);
    
    return imageUrl;
  } catch (error) {
    console.error('Error uploading trip image:', error);
    throw error;
  }
};
