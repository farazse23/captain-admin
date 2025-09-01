import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/FirebaseAuthContext';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Badge from '../components/ui/Badge';
import { getNotifications, markNotificationAsRead, sendNotification, subscribeToNotifications, deleteNotification } from '../services/data';
import { format } from 'date-fns';

const NotificationsPage = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [filteredNotifications, setFilteredNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [audienceFilter, setAudienceFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showComposeModal, setShowComposeModal] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const [newNotification, setNewNotification] = useState({
    title: '',
    message: '',
    audience: 'all-customers',
    recipientId: '',
    priority: 'normal',
    scheduledFor: '',
  });

  const audienceOptions = [
    { value: 'all-customers', label: 'All Customers' },
    { value: 'all-drivers', label: 'All Drivers' },
  ];

  const priorityOptions = [
    { value: 'low', label: 'Low', color: 'gray' },
    { value: 'normal', label: 'Normal', color: 'blue' },
    { value: 'high', label: 'High', color: 'yellow' },
    { value: 'urgent', label: 'Urgent', color: 'red' },
  ];

  useEffect(() => {
    // Set up real-time listener for notifications
    const unsubscribeNotifications = subscribeToNotifications((notificationsData) => {
      setNotifications(notificationsData);
      setLoading(false);
    });

    return () => {
      unsubscribeNotifications();
    };
  }, []);

  useEffect(() => {
    filterNotifications();
  }, [notifications, searchTerm, audienceFilter, statusFilter]);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const notificationsData = await getNotifications();
      setNotifications(notificationsData);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterNotifications = () => {
    let filtered = notifications;

    if (searchTerm) {
      filtered = filtered.filter(notification => 
        notification.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        notification.message?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        notification.audience?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (audienceFilter !== 'all') {
      filtered = filtered.filter(notification => notification.audience === audienceFilter);
    }

    if (statusFilter !== 'all') {
      if (statusFilter === 'read') {
        filtered = filtered.filter(notification => notification.isRead);
      } else if (statusFilter === 'unread') {
        filtered = filtered.filter(notification => !notification.isRead);
      }
    }

    setFilteredNotifications(filtered);
  };

  const handleSendNotification = async (e) => {
    e.preventDefault();
    try {
      await sendNotification({
        ...newNotification,
        isRead: false,
        senderId: currentUser?.uid || null,
        senderName: currentUser?.name || currentUser?.email || '',
      });
      setShowComposeModal(false);
      setNewNotification({
        title: '',
        message: '',
        audience: 'all-customers',
        recipientId: '',
        priority: 'normal',
        scheduledFor: '',
      });
      await loadNotifications();
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  };

  const handleMarkAsRead = async (notificationId) => {
    try {
      await markNotificationAsRead(notificationId);
      await loadNotifications();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleDeleteNotification = async (notificationId) => {
    try {
      if (window.confirm('Are you sure you want to delete this notification?')) {
        await deleteNotification(notificationId);
        await loadNotifications();
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const openDetailsModal = (notification) => {
    setSelectedNotification(notification);
    setShowDetailsModal(true);
    if (!notification.isRead) {
      handleMarkAsRead(notification.id);
    }
  };

  const handleNotificationClick = (notification) => {
    // Mark as read if not already read
    if (!notification.isRead) {
      handleMarkAsRead(notification.id);
    }

    // Navigate based on notification type
    if (notification.type === 'new_request' || notification.type === 'trip_image_uploaded' || notification.type === 'dispatch_status_changed') {
      // Navigate to requests page with trip highlighting
      navigate('/requests', { 
        state: { 
          highlightTrip: notification.dispatchId || notification.tripId,
          fromNotification: true,
          notificationData: notification
        } 
      });
    } else {
      // For other notifications, open details modal
      openDetailsModal(notification);
    }
  };

  const getStatusCount = (status) => {
    if (status === 'read') {
      return notifications.filter(notification => notification.isRead).length;
    } else if (status === 'unread') {
      return notifications.filter(notification => !notification.isRead).length;
    }
    return notifications.length;
  };

  const getPriorityCount = (priority) => {
    return notifications.filter(notification => notification.priority === priority).length;
  };

  const getAudienceLabel = (audience) => {
    if (!audience) return '';
    const option = audienceOptions.find(opt => opt.value === audience);
    return option ? option.label : audience;
  };

  const getNotificationIcon = (notification) => {
    switch (notification.type) {
      case 'new_request':
      case 'dispatch_created':
        return ['fas', 'plus-circle'];
      case 'trip_image_uploaded':
        return ['fas', 'camera'];
      case 'dispatch_status_changed':
      case 'dispatch_accepted':
      case 'dispatch_rejected':
      case 'dispatch_assigned':
      case 'trip_started':
      case 'trip_completed':
        return ['fas', 'route'];
      case 'image_uploaded':
        return ['fas', 'image'];
      default:
        if (notification.tripId || notification.dispatchId) return ['fas', 'route'];
        if (notification.audience?.includes('driver')) return ['fas', 'id-card'];
        if (notification.priority === 'urgent') return ['fas', 'exclamation-triangle'];
        return ['fas', 'bell'];
    }
  };

  const getNotificationDescription = (notification) => {
    if (notification.type === 'new_request' || notification.type === 'trip_image_uploaded' || notification.type === 'dispatch_status_changed') {
      const tripDetails = notification.tripDetails;
      if (tripDetails?.sourceLocation?.address && tripDetails?.destinationLocation?.address) {
        return `${tripDetails.sourceLocation.address} → ${tripDetails.destinationLocation.address}`;
      }
    }
    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <FontAwesomeIcon icon={['fas', 'spinner']} spin className="text-4xl text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Notifications</h1>
          <p className="mt-2 text-gray-600">Manage system notifications and announcements</p>
        </div>
        <div className="mt-4 md:mt-0 flex space-x-3">
          <Button variant="secondary" icon={['fas', 'cog']}>
            Settings
          </Button>
          <Button variant="primary" icon={['fas', 'plus']} onClick={() => setShowComposeModal(true)}>
            Send Notification
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <Card className="bg-blue-50 border-blue-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <FontAwesomeIcon icon={['fas', 'bell']} className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-blue-600">Total</p>
              <p className="text-2xl font-bold text-blue-900">{notifications.length}</p>
            </div>
          </div>
        </Card>

        <Card className="bg-green-50 border-green-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <FontAwesomeIcon icon={['fas', 'check-circle']} className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-green-600">Read</p>
              <p className="text-2xl font-bold text-green-900">{getStatusCount('read')}</p>
            </div>
          </div>
        </Card>

        <Card className="bg-yellow-50 border-yellow-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <FontAwesomeIcon icon={['fas', 'exclamation-circle']} className="h-8 w-8 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-yellow-600">Unread</p>
              <p className="text-2xl font-bold text-yellow-900">{getStatusCount('unread')}</p>
            </div>
          </div>
        </Card>

        <Card className="bg-red-50 border-red-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <FontAwesomeIcon icon={['fas', 'exclamation-triangle']} className="h-8 w-8 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-red-600">Urgent</p>
              <p className="text-2xl font-bold text-red-900">{getPriorityCount('urgent')}</p>
            </div>
          </div>
        </Card>

        <Card className="bg-purple-50 border-purple-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <FontAwesomeIcon icon={['fas', 'users']} className="h-8 w-8 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-purple-600">Broadcast</p>
              <p className="text-2xl font-bold text-purple-900">
                {notifications.filter(n => n.audience?.includes('all')).length}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4">
          <div className="flex-1">
            <Input
              placeholder="Search notifications..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              icon={['fas', 'search']}
            />
          </div>
          <div className="w-full md:w-48">
            <select
              value={audienceFilter}
              onChange={(e) => setAudienceFilter(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Audiences</option>
              {audienceOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
          <div className="w-full md:w-48">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Status</option>
              <option value="read">Read</option>
              <option value="unread">Unread</option>
            </select>
          </div>
          <div className="text-sm text-gray-500">
            Showing {filteredNotifications.length} of {notifications.length} notifications
          </div>
        </div>
      </Card>

      {/* Notifications List */}
      <Card>
        <div className="divide-y divide-gray-200">
          {filteredNotifications.length > 0 ? (
            filteredNotifications.map((notification) => (
              <div 
                key={notification.id} 
                className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${!notification.isRead ? 'bg-blue-50' : ''}`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <FontAwesomeIcon 
                      icon={getNotificationIcon(notification)} 
                      className={`h-6 w-6 ${notification.isRead ? 'text-gray-400' : 'text-blue-600'}`} 
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className={`text-sm font-medium ${notification.isRead ? 'text-gray-900' : 'text-blue-900'}`}>
                        {notification.title}
                        {(notification.dispatchId || notification.tripId) && (
                          <span className="ml-2 text-xs text-blue-600 font-mono">
                            #{notification.dispatchId || notification.tripId}
                          </span>
                        )}
                      </p>
                      <div className="flex items-center space-x-2">
                        <Badge 
                          status={notification.priority} 
                          customColors={{
                            low: 'gray',
                            normal: 'blue',
                            high: 'yellow',
                            urgent: 'red'
                          }}
                        />
                        {!notification.isRead && (
                          <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                        )}
                      </div>
                    </div>
                    <p className={`mt-1 text-sm ${notification.isRead ? 'text-gray-600' : 'text-gray-700'} line-clamp-2`}>
                      {notification.message}
                    </p>
                    {getNotificationDescription(notification) && (
                      <p className="mt-1 text-xs text-green-600 font-medium">
                        <FontAwesomeIcon icon={['fas', 'map-marker-alt']} className="mr-1" />
                        {getNotificationDescription(notification)}
                      </p>
                    )}
                    <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                      <span>
                        {notification.type === 'new_request' && 'New Request'}
                        {notification.type === 'dispatch_created' && 'New Dispatch Request'}
                        {notification.type === 'trip_image_uploaded' && 'Trip Image'}
                        {notification.type === 'dispatch_status_changed' && 'Status Update'}
                        {notification.type === 'dispatch_accepted' && 'Request Accepted'}
                        {notification.type === 'dispatch_rejected' && 'Request Rejected'}
                        {notification.type === 'dispatch_assigned' && 'Driver Assigned'}
                        {notification.type === 'trip_started' && 'Trip Started'}
                        {notification.type === 'trip_completed' && 'Trip Completed'}
                        {!['new_request', 'dispatch_created', 'trip_image_uploaded', 'dispatch_status_changed', 
                           'dispatch_accepted', 'dispatch_rejected', 'dispatch_assigned', 'trip_started', 'trip_completed'].includes(notification.type) && 
                          notification.audience && `To: ${getAudienceLabel(notification.audience)}`}
                      </span>
                      <div className="flex items-center space-x-2">
                        <span>
                          {notification.createdAt && (() => {
                            try {
                              // Handle Firebase Timestamp
                              if (notification.createdAt.toDate && typeof notification.createdAt.toDate === 'function') {
                                return format(notification.createdAt.toDate(), 'MMM dd, HH:mm');
                              }
                              // Handle regular Date or timestamp
                              return format(new Date(notification.createdAt), 'MMM dd, HH:mm');
                            } catch (error) {
                              console.error('Error formatting date:', error);
                              return 'Invalid Date';
                            }
                          })()}
                        </span>
                        <div className="flex items-center space-x-1">
                          {!notification.isRead && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMarkAsRead(notification.id);
                              }}
                              className="p-1 text-blue-600 hover:text-blue-800 transition-colors"
                              title="Mark as read"
                            >
                              <FontAwesomeIcon icon={['fas', 'check']} className="h-3 w-3" />
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteNotification(notification.id);
                            }}
                            className="p-1 text-red-600 hover:text-red-800 transition-colors"
                            title="Delete notification"
                          >
                            <FontAwesomeIcon icon={['fas', 'trash']} className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="p-12 text-center text-gray-500">
              <FontAwesomeIcon icon={['fas', 'bell-slash']} className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p>No notifications found</p>
            </div>
          )}
        </div>
      </Card>

      {/* Compose Notification Modal */}
      {showComposeModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Send Notification</h3>
              <button
                onClick={() => setShowComposeModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <FontAwesomeIcon icon={['fas', 'times']} />
              </button>
            </div>

            <form onSubmit={handleSendNotification} className="space-y-4">
              <Input
                label="Title"
                value={newNotification.title}
                onChange={(e) => setNewNotification({...newNotification, title: e.target.value})}
                placeholder="Notification title..."
                required
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Message</label>
                <textarea
                  value={newNotification.message}
                  onChange={(e) => setNewNotification({...newNotification, message: e.target.value})}
                  rows={4}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Notification message..."
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Audience</label>
                  <select
                    value={newNotification.audience}
                    onChange={(e) => setNewNotification({...newNotification, audience: e.target.value})}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    {audienceOptions.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                  <select
                    value={newNotification.priority}
                    onChange={(e) => setNewNotification({...newNotification, priority: e.target.value})}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    {priorityOptions.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <Input
                label="Schedule For (Optional)"
                type="datetime-local"
                value={newNotification.scheduledFor}
                onChange={(e) => setNewNotification({...newNotification, scheduledFor: e.target.value})}
              />

              <div className="flex justify-end space-x-3 pt-4 border-t">
                <Button variant="secondary" onClick={() => setShowComposeModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary">
                  Send Notification
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Notification Details Modal */}
      {showDetailsModal && selectedNotification && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Notification Details</h3>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <FontAwesomeIcon icon={['fas', 'times']} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <FontAwesomeIcon 
                    icon={getNotificationIcon(selectedNotification)} 
                    className="h-6 w-6 text-blue-600" 
                  />
                  <h4 className="text-xl font-semibold text-gray-900">{selectedNotification.title}</h4>
                </div>
                <Badge 
                  status={selectedNotification.priority} 
                  customColors={{
                    low: 'gray',
                    normal: 'blue',
                    high: 'yellow',
                    urgent: 'red'
                  }}
                />
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-gray-700">{selectedNotification.message}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h5 className="text-sm font-medium text-gray-500 mb-2">Delivery Information</h5>
                  <div className="space-y-1 text-sm">
                    {selectedNotification.audience ? (
                      <p><strong>Audience:</strong> {getAudienceLabel(selectedNotification.audience)}</p>
                    ) : (
                      <p><strong>Type:</strong> {selectedNotification.type?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'System Notification'}</p>
                    )}
                    <p><strong>Status:</strong> {selectedNotification.isRead ? 'Read' : 'Unread'}</p>
                    {selectedNotification.recipientId && (
                      <p><strong>Recipient:</strong> {selectedNotification.recipientId}</p>
                    )}
                    {selectedNotification.customerId && (
                      <p><strong>Customer ID:</strong> {selectedNotification.customerId}</p>
                    )}
                    {selectedNotification.dispatchId && (
                      <p><strong>Dispatch ID:</strong> {selectedNotification.dispatchId}</p>
                    )}
                  </div>
                </div>

                <div>
                  <h5 className="text-sm font-medium text-gray-500 mb-2">Timestamps</h5>
                  <div className="space-y-1 text-sm">
                    <p><strong>Created:</strong> {selectedNotification.createdAt && (() => {
                      try {
                        // Handle Firebase Timestamp
                        if (selectedNotification.createdAt.toDate && typeof selectedNotification.createdAt.toDate === 'function') {
                          return format(selectedNotification.createdAt.toDate(), 'MMM dd, yyyy HH:mm');
                        }
                        // Handle regular Date or timestamp
                        return format(new Date(selectedNotification.createdAt), 'MMM dd, yyyy HH:mm');
                      } catch (error) {
                        console.error('Error formatting date:', error);
                        return 'Invalid Date';
                      }
                    })()}</p>
                    {selectedNotification.scheduledFor && (
                      <p><strong>Scheduled:</strong> {format(new Date(selectedNotification.scheduledFor), 'MMM dd, yyyy HH:mm')}</p>
                    )}
                    {selectedNotification.readAt && (
                      <p><strong>Read:</strong> {format(new Date(selectedNotification.readAt), 'MMM dd, yyyy HH:mm')}</p>
                    )}
                  </div>
                </div>
              </div>

              {selectedNotification.tripId && (
                <div>
                  <h5 className="text-sm font-medium text-gray-500 mb-2">Related Trip</h5>
                  <p className="text-sm">Trip ID: #{selectedNotification.tripId}</p>
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4 border-t">
                <Button variant="secondary" onClick={() => setShowDetailsModal(false)}>
                  Close
                </Button>
                {!selectedNotification.isRead && (
                  <Button
                    variant="primary"
                    onClick={() => {
                      handleMarkAsRead(selectedNotification.id);
                      setShowDetailsModal(false);
                    }}
                  >
                    Mark as Read
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationsPage;
