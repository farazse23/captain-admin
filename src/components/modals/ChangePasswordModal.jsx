import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useAuth } from '../../contexts/FirebaseAuthContext';
import Button from '../ui/Button';
import Input from '../ui/Input';

const ChangePasswordModal = ({ isOpen, onClose }) => {
  const { changePassword } = useAuth();
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError(''); // Clear error when user types
  };

  const validateForm = () => {
    if (!formData.currentPassword) {
      setError('Current password is required');
      return false;
    }
    if (!formData.newPassword) {
      setError('New password is required');
      return false;
    }
    if (formData.newPassword.length < 6) {
      setError('New password must be at least 6 characters');
      return false;
    }
    if (formData.newPassword !== formData.confirmPassword) {
      setError('New passwords do not match');
      return false;
    }
    if (formData.currentPassword === formData.newPassword) {
      setError('New password must be different from current password');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      await changePassword(formData.currentPassword, formData.newPassword);
      setSuccess(true);
      setFormData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      
      // Auto close after success
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 2000);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
    setError('');
    setSuccess(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
              <FontAwesomeIcon icon="lock" className="text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Change Password</h3>
              <p className="text-sm text-gray-500">Update your account password</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={loading}
          >
            <FontAwesomeIcon icon="times" className="text-xl" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {success ? (
            <div className="text-center py-8">
              <FontAwesomeIcon
                icon="check-circle"
                className="text-5xl text-green-600 mb-4"
              />
              <h4 className="text-lg font-medium text-gray-900 mb-2">Password Updated!</h4>
              <p className="text-sm text-gray-600">Your password has been successfully changed.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-md p-4">
                  <div className="flex">
                    <FontAwesomeIcon
                      icon="exclamation-circle"
                      className="text-red-400 mr-2 mt-0.5"
                    />
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                </div>
              )}

              <Input
                label="Current Password"
                type="password"
                name="currentPassword"
                value={formData.currentPassword}
                onChange={handleInputChange}
                placeholder="Enter your current password"
                icon="lock"
                required
                disabled={loading}
              />

              <Input
                label="New Password"
                type="password"
                name="newPassword"
                value={formData.newPassword}
                onChange={handleInputChange}
                placeholder="Enter your new password"
                icon="key"
                required
                disabled={loading}
                minLength={6}
              />

              <Input
                label="Confirm New Password"
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                placeholder="Confirm your new password"
                icon="key"
                required
                disabled={loading}
                minLength={6}
              />

              {/* Password Requirements */}
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                <h5 className="text-sm font-medium text-blue-900 mb-2">Password Requirements:</h5>
                <ul className="text-xs text-blue-700 space-y-1">
                  <li className="flex items-center">
                    <FontAwesomeIcon 
                      icon={formData.newPassword.length >= 6 ? "check" : "times"} 
                      className={`mr-2 ${formData.newPassword.length >= 6 ? "text-green-600" : "text-red-600"}`} 
                    />
                    At least 6 characters
                  </li>
                  <li className="flex items-center">
                    <FontAwesomeIcon 
                      icon={formData.newPassword !== formData.currentPassword && formData.newPassword ? "check" : "times"} 
                      className={`mr-2 ${formData.newPassword !== formData.currentPassword && formData.newPassword ? "text-green-600" : "text-red-600"}`} 
                    />
                    Different from current password
                  </li>
                  <li className="flex items-center">
                    <FontAwesomeIcon 
                      icon={formData.newPassword === formData.confirmPassword && formData.confirmPassword ? "check" : "times"} 
                      className={`mr-2 ${formData.newPassword === formData.confirmPassword && formData.confirmPassword ? "text-green-600" : "text-red-600"}`} 
                    />
                    Passwords match
                  </li>
                </ul>
              </div>

              {/* Actions */}
              <div className="flex space-x-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={handleClose}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  className="flex-1"
                  loading={loading}
                  disabled={loading}
                >
                  {loading ? 'Updating...' : 'Update Password'}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChangePasswordModal;
