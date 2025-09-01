import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { uploadDispatchImage } from '../services/data/dispatchImageService';
import Button from '../components/ui/Button';

const DispatchImageUploader = ({ dispatchId, driverId, onUpload }) => {
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [description, setDescription] = useState('');
  const [previewUrl, setPreviewUrl] = useState(null);

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = (e) => setPreviewUrl(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    
    setUploading(true);
    try {
      const uploadResult = await uploadDispatchImage(
        dispatchId,
        driverId,
        selectedFile,
        description
      );
      
      // Reset form
      setSelectedFile(null);
      setDescription('');
      setPreviewUrl(null);
      
      // Notify parent component
      if (onUpload) {
        onUpload(uploadResult);
      }
      
      alert('Image uploaded successfully!');
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Failed to upload image. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleCancel = () => {
    setSelectedFile(null);
    setDescription('');
    setPreviewUrl(null);
  };

  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200">
      <h4 className="font-medium text-gray-900 mb-4 flex items-center">
        <FontAwesomeIcon icon={['fas', 'camera']} className="mr-2 text-blue-500" />
        Upload Trip Image
      </h4>
      
      {!selectedFile ? (
        <div className="space-y-4">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <input
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
              id="image-upload"
            />
            <label
              htmlFor="image-upload"
              className="cursor-pointer"
            >
              <FontAwesomeIcon 
                icon={['fas', 'cloud-upload-alt']} 
                className="h-12 w-12 text-gray-400 mb-4" 
              />
              <p className="text-gray-500">
                Click to select an image or drag and drop
              </p>
              <p className="text-xs text-gray-400 mt-2">
                PNG, JPG, GIF up to 10MB
              </p>
            </label>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Image Preview */}
          <div className="relative">
            <img
              src={previewUrl}
              alt="Preview"
              className="w-full max-h-64 object-cover rounded-lg"
            />
            <button
              onClick={handleCancel}
              className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
            >
              <FontAwesomeIcon icon={['fas', 'times']} className="h-3 w-3" />
            </button>
          </div>
          
          {/* Description Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows="3"
              placeholder="Add a description for this image..."
            />
          </div>
          
          {/* Upload Buttons */}
          <div className="flex space-x-3">
            <Button
              onClick={handleUpload}
              disabled={uploading}
              className="flex-1"
            >
              {uploading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Uploading...
                </>
              ) : (
                <>
                  <FontAwesomeIcon icon={['fas', 'upload']} className="mr-2" />
                  Upload Image
                </>
              )}
            </Button>
            <Button
              onClick={handleCancel}
              variant="secondary"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DispatchImageUploader;
