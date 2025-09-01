import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  orderBy,
  doc,
  deleteDoc 
} from 'firebase/firestore';
import { 
  ref, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject 
} from 'firebase/storage';
import { db, storage } from '../firebase';

// Upload image to Firebase Storage
export const uploadDispatchImage = async (dispatchId, driverId, imageFile, description = '') => {
  try {
    const timestamp = Date.now();
    const fileName = `${timestamp}_${imageFile.name}`;
    const storageRef = ref(storage, `dispatches/${dispatchId}/${driverId}/${fileName}`);
    
    // Upload file
    const snapshot = await uploadBytes(storageRef, imageFile);
    const downloadURL = await getDownloadURL(snapshot.ref);
    
    // Save reference in Firestore
    const imageDoc = await addDoc(collection(db, 'dispatch_image'), {
      dispatchId,
      driverId,
      imageUrl: downloadURL,
      fileName,
      description,
      uploadedAt: new Date(),
      storagePath: `dispatches/${dispatchId}/${driverId}/${fileName}`
    });
    
    return {
      id: imageDoc.id,
      imageUrl: downloadURL,
      uploadedAt: new Date()
    };
  } catch (error) {
    console.error('Error uploading dispatch image:', error);
    throw error;
  }
};

// Get all images for a specific dispatch (Admin view)
export const getDispatchImages = async (dispatchId) => {
  try {
    console.log(`🖼️ Fetching images for dispatch: ${dispatchId}`);
    console.log(`🖼️ Query collection: dispatch_image`);
    console.log(`🖼️ Query where dispatchId ==`, dispatchId);
    
    const q = query(
      collection(db, 'dispatch_image'),
      where('dispatchId', '==', dispatchId)
      // Temporarily removing orderBy to see if it causes issues
      // orderBy('uploadedAt', 'desc')
    );
    
    console.log(`🖼️ Executing query...`);
    const querySnapshot = await getDocs(q);
    console.log(`🖼️ Query executed, found ${querySnapshot.size} documents`);
    
    const images = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      console.log(`🖼️ Found image document:`, doc.id, data);
      images.push({
        id: doc.id,
        ...data
      });
    });
    
    console.log(`🖼️ Total images processed: ${images.length}`);
    return images;
  } catch (error) {
    console.error('Error fetching dispatch images:', error);
    throw error;
  }
};

// Get images for a specific dispatch and driver (Driver view)
export const getDriverDispatchImages = async (dispatchId, driverId) => {
  try {
    const q = query(
      collection(db, 'dispatch_image'),
      where('dispatchId', '==', dispatchId),
      where('driverId', '==', driverId),
      orderBy('uploadedAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    const images = [];
    
    querySnapshot.forEach((doc) => {
      images.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return images;
  } catch (error) {
    console.error('Error fetching driver dispatch images:', error);
    throw error;
  }
};

// Delete dispatch image
export const deleteDispatchImage = async (imageId, storagePath) => {
  try {
    // Delete from Firestore
    await deleteDoc(doc(db, 'dispatch_image', imageId));
    
    // Delete from Storage
    if (storagePath) {
      const storageRef = ref(storage, storagePath);
      await deleteObject(storageRef);
    }
    
    return true;
  } catch (error) {
    console.error('Error deleting dispatch image:', error);
    throw error;
  }
};

// Group images by driver for admin view
export const groupImagesByDriver = (images, drivers) => {
  const groupedImages = {};
  
  images.forEach(image => {
    if (!groupedImages[image.driverId]) {
      const driver = drivers.find(d => d.id === image.driverId);
      groupedImages[image.driverId] = {
        driver: driver || { id: image.driverId, name: 'Unknown Driver' },
        images: []
      };
    }
    groupedImages[image.driverId].images.push(image);
  });
  
  return Object.values(groupedImages);
};
