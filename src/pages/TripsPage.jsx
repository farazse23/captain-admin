import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { format } from 'date-fns';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Badge from '../components/ui/Badge';
import DispatchImagesGallery from '../components/DispatchImagesGallery';
import { getDispatches, getCustomers, getDrivers, getTrucks, subscribeToDispatches, subscribeToCustomers, subscribeToDrivers, subscribeToTrucks, getDispatchImages } from '../services/data';

const TripsPage = () => {
  const [loading, setLoading] = useState(true);
  const [trips, setTrips] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [trucks, setTrucks] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [tripImages, setTripImages] = useState({});
  
  // Modal state
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState(null);

  useEffect(() => {
    // Set up real-time listeners
    const unsubscribeDispatches = subscribeToDispatches((dispatchesData) => {
      console.log('Sample dispatch data:', dispatchesData[0]); // Debug log
      setTrips(dispatchesData);
      setLoading(false);
    });
    
    const unsubscribeCustomers = subscribeToCustomers((customersData) => {
      setCustomers(customersData);
    });
    
    const unsubscribeDrivers = subscribeToDrivers((driversData) => {
      setDrivers(driversData);
    });
    
    const unsubscribeTrucks = subscribeToTrucks((trucksData) => {
      setTrucks(trucksData);
    });

    return () => {
      unsubscribeDispatches();
      unsubscribeCustomers();
      unsubscribeDrivers();
      unsubscribeTrucks();
    };
  }, []);

  const getCustomerDetails = (customerId) => {
    return customers.find(c => c.id === customerId) || { 
      name: 'Unknown Customer', 
      email: 'N/A',
      phone: 'N/A',
      address: 'N/A'
    };
  };

  const getDriverDetails = (driverId) => {
    return drivers.find(d => d.id === driverId) || { 
      name: 'Unknown Driver',
      email: 'N/A', 
      phone: 'N/A',
      licenseNumber: 'N/A'
    };
  };

  const getTruckDetails = (truckId) => {
    return trucks.find(t => t.id === truckId) || {
      truckNumber: 'Unknown',
      type: 'N/A',
      capacity: 'N/A',
      status: 'N/A'
    };
  };

  const getCustomerName = (customerId) => {
    const customer = customers.find(c => c.id === customerId);
    return customer ? customer.name : 'Unknown Customer';
  };

  const getDriverName = (driverId) => {
    const driver = drivers.find(d => d.id === driverId);
    return driver ? driver.name : 'Unassigned';
  };

  const openDetailsModal = async (trip) => {
    setSelectedTrip(trip);
    setShowDetailsModal(true);
    
    // Load trip images
    try {
      const images = await getDispatchImages(trip.id);
      setTripImages(prev => ({
        ...prev,
        [trip.id]: images
      }));
    } catch (error) {
      console.error('Error loading trip images:', error);
    }
  };

  const closeDetailsModal = () => {
    setShowDetailsModal(false);
    setSelectedTrip(null);
  };

  const getStatusBadge = (status) => {
    console.log('Status badge for:', status); // Debug log
    const statusConfig = {
      'pending': { color: '#f59e0b', text: 'Pending' },
      'accepted': { color: '#3b82f6', text: 'Accepted' },
      'approved': { color: '#3b82f6', text: 'Approved' },
      'assigned': { color: '#6366f1', text: 'Assigned' },
      'in-progress': { color: '#8b5cf6', text: 'In Progress' },
      'completed': { color: '#10b981', text: 'Completed' },
      'cancelled': { color: '#ef4444', text: 'Cancelled' },
      'rejected': { color: '#ef4444', text: 'Rejected' }
    };

    const config = statusConfig[status] || { color: '#6b7280', text: status };
    return (
      <Badge 
        status={status}
        customColors={{
          pending: '#f59e0b',
          accepted: '#3b82f6',
          approved: '#3b82f6',
          assigned: '#6366f1',
          'in-progress': '#8b5cf6',
          completed: '#10b981',
          cancelled: '#ef4444',
          rejected: '#ef4444'
        }}
      >
        {config.text}
      </Badge>
    );
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    
    try {
      // Handle Firebase Timestamp
      if (timestamp.toDate && typeof timestamp.toDate === 'function') {
        return format(timestamp.toDate(), 'MMM dd, yyyy HH:mm');
      }
      // Handle regular Date or timestamp
      return format(new Date(timestamp), 'MMM dd, yyyy HH:mm');
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid Date';
    }
  };

  const filteredTrips = trips.filter(trip => {
    const matchesSearch = 
      trip.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getCustomerName(trip.customerId).toLowerCase().includes(searchTerm.toLowerCase()) ||
      (trip.sourceLocation?.address && trip.sourceLocation.address.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (trip.destinationLocation?.address && trip.destinationLocation.address.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === 'all' || trip.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Calculate trip statistics
  const getTripStats = () => {
    const rejectedTrips = trips.filter(trip => trip.status === 'rejected').length;
    const cancelledTrips = trips.filter(trip => trip.status === 'cancelled').length;
    const completedTrips = trips.filter(trip => trip.status === 'completed').length;
    const totalTrips = trips.length;
    
    return {
      rejected: rejectedTrips,
      cancelled: cancelledTrips,
      completed: completedTrips,
      total: totalTrips,
      rejectedPercentage: totalTrips > 0 ? Math.round((rejectedTrips / totalTrips) * 100) : 0,
      cancelledPercentage: totalTrips > 0 ? Math.round((cancelledTrips / totalTrips) * 100) : 0,
      completedPercentage: totalTrips > 0 ? Math.round((completedTrips / totalTrips) * 100) : 0
    };
  };

  const tripStats = getTripStats();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <FontAwesomeIcon icon={['fas', 'spinner']} spin className="text-4xl text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">All Trips</h1>
          <p className="text-gray-600">View and manage all dispatch trips</p>
        </div>
      </div>

      {/* Trip Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Rejected Trips Card */}
        <div className="bg-gradient-to-br from-red-50 to-red-100 border border-red-200 rounded-xl p-6 hover:shadow-lg transition-shadow duration-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center mb-2">
                <FontAwesomeIcon 
                  icon={['fas', 'times-circle']} 
                  className="h-8 w-8 text-red-600 mr-3" 
                />
                <h3 className="text-lg font-semibold text-red-900">Rejected Trips</h3>
              </div>
              <div className="space-y-1">
                <p className="text-3xl font-bold text-red-700">{tripStats.rejected}</p>
                <p className="text-sm text-red-600">
                  {tripStats.rejectedPercentage}% of total trips
                </p>
              </div>
            </div>
            <div className="bg-red-200 rounded-full p-3">
              <FontAwesomeIcon icon={['fas', 'ban']} className="h-6 w-6 text-red-700" />
            </div>
          </div>
        </div>

        {/* Cancelled Trips Card */}
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 rounded-xl p-6 hover:shadow-lg transition-shadow duration-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center mb-2">
                <FontAwesomeIcon 
                  icon={['fas', 'exclamation-triangle']} 
                  className="h-8 w-8 text-orange-600 mr-3" 
                />
                <h3 className="text-lg font-semibold text-orange-900">Cancelled Trips</h3>
              </div>
              <div className="space-y-1">
                <p className="text-3xl font-bold text-orange-700">{tripStats.cancelled}</p>
                <p className="text-sm text-orange-600">
                  {tripStats.cancelledPercentage}% of total trips
                </p>
              </div>
            </div>
            <div className="bg-orange-200 rounded-full p-3">
              <FontAwesomeIcon icon={['fas', 'calendar-times']} className="h-6 w-6 text-orange-700" />
            </div>
          </div>
        </div>

        {/* Completed Trips Card */}
        <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-xl p-6 hover:shadow-lg transition-shadow duration-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center mb-2">
                <FontAwesomeIcon 
                  icon={['fas', 'check-circle']} 
                  className="h-8 w-8 text-green-600 mr-3" 
                />
                <h3 className="text-lg font-semibold text-green-900">Completed Trips</h3>
              </div>
              <div className="space-y-1">
                <p className="text-3xl font-bold text-green-700">{tripStats.completed}</p>
                <p className="text-sm text-green-600">
                  {tripStats.completedPercentage}% of total trips
                </p>
              </div>
            </div>
            <div className="bg-green-200 rounded-full p-3">
              <FontAwesomeIcon icon={['fas', 'trophy']} className="h-6 w-6 text-green-700" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
            <Input
              placeholder="Search by trip ID, customer, or location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              icon={['fas', 'search']}
            />
          </div>
          <div className="sm:w-48">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="accepted">Accepted</option>
              <option value="approved">Approved</option>
              <option value="assigned">Assigned</option>
              <option value="in-progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Trip ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Route
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredTrips.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                    <FontAwesomeIcon icon={['fas', 'route']} className="text-4xl mb-4" />
                    <p>No trips found</p>
                  </td>
                </tr>
              ) : (
                filteredTrips.map((trip) => (
                  <tr key={trip.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {trip.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {getCustomerName(trip.customerId)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div className="max-w-xs">
                        <p className="font-medium flex items-center">
                          <FontAwesomeIcon icon={['fas', 'map-marker-alt']} className="mr-1 text-green-500" />
                          {trip.sourceLocation?.address || trip.sourceLocation || 'N/A'}
                        </p>
                        <p className="text-gray-500 flex items-center mt-1">
                          <FontAwesomeIcon icon={['fas', 'flag-checkered']} className="mr-1 text-red-500" />
                          {trip.destinationLocation?.address || trip.destinationLocation || 'N/A'}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(trip.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(trip.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <Button
                        size="small"
                        variant="ghost"
                        onClick={() => openDetailsModal(trip)}
                      >
                        View Details
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Trip Details Modal */}
      {showDetailsModal && selectedTrip && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-900">
                Trip Details - #{selectedTrip.id}
              </h3>
              <button
                onClick={closeDetailsModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <FontAwesomeIcon icon={['fas', 'times']} className="w-6 h-6" />
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Customer Information */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-md font-semibold text-gray-800 mb-4 flex items-center">
                  <FontAwesomeIcon icon={['fas', 'user']} className="mr-2 text-blue-500" />
                  Customer Information
                </h4>
                {(() => {
                  const customer = getCustomerDetails(selectedTrip.customerId);
                  return (
                    <div className="space-y-2 text-sm">
                      <p><strong>Customer ID:</strong> {selectedTrip.customerId}</p>
                      <p><strong>Name:</strong> {customer.name}</p>
                      <p><strong>Email:</strong> {customer.email}</p>
                      <p><strong>Phone:</strong> {customer.phone}</p>
                      <p><strong>Address:</strong> {customer.address}</p>
                    </div>
                  );
                })()}
              </div>

              {/* Trip Information */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-md font-semibold text-gray-800 mb-4 flex items-center">
                  <FontAwesomeIcon icon={['fas', 'route']} className="mr-2 text-green-500" />
                  Trip Information
                </h4>
                <div className="space-y-2 text-sm">
                  <p><strong>Trip ID:</strong> #{selectedTrip.id}</p>
                  <p><strong>Status:</strong> 
                    <span className="ml-2">
                      {getStatusBadge(selectedTrip.status)}
                    </span>
                  </p>
                  <p><strong>Created:</strong> {formatDate(selectedTrip.createdAt)}</p>
                  {selectedTrip.pickupDateTime && (
                    <p><strong>Pickup Date:</strong> {formatDate(selectedTrip.pickupDateTime)}</p>
                  )}
                </div>
              </div>

              {/* Route Information */}
              <div className="bg-gray-50 p-4 rounded-lg lg:col-span-2">
                <h4 className="text-md font-semibold text-gray-800 mb-4 flex items-center">
                  <FontAwesomeIcon icon={['fas', 'map-marker-alt']} className="mr-2 text-red-500" />
                  Route Information
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="font-semibold text-gray-700 mb-2">Pickup Location:</p>
                    <p>{selectedTrip.sourceLocation?.address || selectedTrip.sourceLocation || selectedTrip.pickupLocation || 'N/A'}</p>
                    {selectedTrip.sourceLocation?.coordinates && (
                      <p className="text-gray-500 text-xs">
                        Lat: {selectedTrip.sourceLocation.coordinates.lat}, 
                        Lng: {selectedTrip.sourceLocation.coordinates.lng}
                      </p>
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-700 mb-2">Dropoff Location:</p>
                    <p>{selectedTrip.destinationLocation?.address || selectedTrip.destinationLocation || selectedTrip.dropoffLocation || 'N/A'}</p>
                    {selectedTrip.destinationLocation?.coordinates && (
                      <p className="text-gray-500 text-xs">
                        Lat: {selectedTrip.destinationLocation.coordinates.lat}, 
                        Lng: {selectedTrip.destinationLocation.coordinates.lng}
                      </p>
                    )}
                  </div>
                </div>
                {selectedTrip.distance && (
                  <div className="mt-4 bg-blue-50 border border-blue-200 rounded p-3">
                    <p className="font-semibold text-blue-700 flex items-center">
                      <FontAwesomeIcon icon={['fas', 'route']} className="mr-2" />
                      Distance: <span className="text-blue-800 font-bold ml-2">{selectedTrip.distance}</span>
                    </p>
                  </div>
                )}
              </div>

              {/* Truck Requirements */}
              {selectedTrip.trucksRequired && selectedTrip.trucksRequired.length > 0 && (
                <div className="bg-gray-50 p-4 rounded-lg lg:col-span-2">
                  <h4 className="text-md font-semibold text-gray-800 mb-4 flex items-center">
                    <FontAwesomeIcon icon={['fas', 'truck']} className="mr-2 text-orange-500" />
                    Truck Requirements
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    {selectedTrip.trucksRequired.map((requirement, index) => (
                      <div key={index} className="bg-white p-3 rounded border">
                        <p><strong>Type:</strong> {requirement.truckType}</p>
                        <p><strong>Count:</strong> {requirement.count}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Assignment Details */}
              {selectedTrip.driverAssignments && Object.keys(selectedTrip.driverAssignments).length > 0 && (
                <div className="bg-gray-50 p-4 rounded-lg lg:col-span-2">
                  <h4 className="text-md font-semibold text-gray-800 mb-4 flex items-center">
                    <FontAwesomeIcon icon={['fas', 'users']} className="mr-2 text-purple-500" />
                    Driver & Truck Assignment Details
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.values(selectedTrip.driverAssignments).map((assignment, index) => {
                      const driver = getDriverDetails(assignment.driverId);
                      const truck = getTruckDetails(assignment.truckId);
                      return (
                        <div key={assignment.driverId} className="bg-white p-4 rounded border">
                          <div className="flex items-center justify-between mb-3">
                            <h5 className="font-semibold text-gray-700">Assignment #{index + 1}</h5>
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              assignment.status === 'assigned' ? 'bg-blue-100 text-blue-800' :
                              assignment.status === 'in-progress' ? 'bg-purple-100 text-purple-800' :
                              assignment.status === 'completed' ? 'bg-green-100 text-green-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {assignment.status === 'in-progress' ? 'In Progress' : 
                               assignment.status.charAt(0).toUpperCase() + assignment.status.slice(1)}
                            </span>
                          </div>
                          
                          {/* Driver Details */}
                          <div className="mb-3">
                            <p className="font-medium text-gray-600 mb-1">Driver Information:</p>
                            <div className="pl-3 text-sm space-y-1">
                              <p><strong>Name:</strong> {driver.name}</p>
                              <p><strong>Email:</strong> {driver.email}</p>
                              <p><strong>Phone:</strong> {driver.phone}</p>
                              <p><strong>License:</strong> {driver.licenseNumber}</p>
                            </div>
                          </div>

                          {/* Truck Details */}
                          <div className="mb-3">
                            <p className="font-medium text-gray-600 mb-1">Truck Information:</p>
                            <div className="pl-3 text-sm space-y-1">
                              <p><strong>Truck Number:</strong> {truck.truckNumber}</p>
                              <p><strong>Type:</strong> {truck.type}</p>
                              <p><strong>Capacity:</strong> {truck.capacity}</p>
                              <p><strong>Status:</strong> {truck.status}</p>
                            </div>
                          </div>

                          {/* Assignment Timing */}
                          <div className="mb-3">
                            <p className="font-medium text-gray-600 mb-1">Assignment Timeline:</p>
                            <div className="pl-3 text-sm space-y-1">
                              <p><strong>Assigned:</strong> {assignment.assignedAt ? formatDate(assignment.assignedAt) : 'N/A'}</p>
                              {assignment.startedAt && (
                                <p><strong>Started:</strong> {formatDate(assignment.startedAt)}</p>
                              )}
                              {assignment.completedAt && (
                                <p><strong>Completed:</strong> {formatDate(assignment.completedAt)}</p>
                              )}
                            </div>
                          </div>

                          {assignment.notes && (
                            <div>
                              <p className="font-medium text-gray-600 mb-1">Notes:</p>
                              <p className="text-sm text-gray-700 italic">"{assignment.notes}"</p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Trip Images Section */}
              <div className="bg-gray-50 p-4 rounded-lg lg:col-span-2">
                <h4 className="text-md font-semibold text-gray-800 mb-4 flex items-center">
                  <FontAwesomeIcon icon={['fas', 'camera']} className="mr-2 text-green-500" />
                  Trip Images
                </h4>
                <DispatchImagesGallery dispatchId={selectedTrip.dispatchId || selectedTrip.id} />
              </div>
            </div>

            <div className="flex justify-end mt-6 pt-4 border-t">
              <Button
                onClick={closeDetailsModal}
                variant="secondary"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TripsPage;