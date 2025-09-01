import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { format, isToday, isSameDay, addDays, subDays } from 'date-fns';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Input from '../components/ui/Input';
import { 
  subscribeToDrivers, 
  subscribeToTrucks,
  subscribeToDispatches
} from '../services/data';
import { 
  getTodaysAssignments,
  getAssignmentsForDate,
  getAssignmentsByDateRange,
  getActiveDriverAssignmentsForDate,
  getActiveTruckAssignmentsForDate
} from '../services/data/scheduleService';

const SchedulePage = () => {
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [drivers, setDrivers] = useState([]);
  const [trucks, setTrucks] = useState([]);
  const [dispatches, setDispatches] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [todaysAssignments, setTodaysAssignments] = useState([]);
  const [weekStatuses, setWeekStatuses] = useState({}); // Cache status data

  useEffect(() => {
    let unsubscribeDrivers, unsubscribeTrucks, unsubscribeDispatches;
    let loadedCount = 0;
    const totalSources = 3;

    const checkLoading = () => {
      loadedCount++;
      if (loadedCount >= totalSources) {
        setLoading(false);
        loadAssignments();
      }
    };

    unsubscribeDrivers = subscribeToDrivers((driversData) => {
      setDrivers(driversData);
      checkLoading();
    });

    unsubscribeTrucks = subscribeToTrucks((trucksData) => {
      setTrucks(trucksData);
      checkLoading();
    });

    unsubscribeDispatches = subscribeToDispatches((dispatchesData) => {
      setDispatches(dispatchesData);
      checkLoading();
    });

    return () => {
      unsubscribeDrivers?.();
      unsubscribeTrucks?.();
      unsubscribeDispatches?.();
    };
  }, []);

  // Load assignments for the current date range
  useEffect(() => {
    if (drivers.length > 0 && trucks.length > 0) {
      calculateWeekStatuses();
    }
  }, [drivers, trucks, selectedDate]);

  const calculateWeekStatuses = async () => {
    const weekDates = getWeekDates(subDays(selectedDate, selectedDate.getDay()));
    const statusData = {};
    
    // Calculate driver statuses for the week
    for (const driver of drivers) {
      statusData[`driver_${driver.id}`] = {};
      for (const date of weekDates) {
        const status = await getDriverStatusForDate(driver, date);
        statusData[`driver_${driver.id}`][format(date, 'yyyy-MM-dd')] = status;
      }
    }
    
    // Calculate truck statuses for the week
    for (const truck of trucks) {
      statusData[`truck_${truck.id}`] = {};
      for (const date of weekDates) {
        const status = await getTruckStatusForDate(truck, date);
        statusData[`truck_${truck.id}`][format(date, 'yyyy-MM-dd')] = status;
      }
    }
    
    setWeekStatuses(statusData);
  };

  // Helper function to get cached status
  const getCachedStatus = (type, id, date) => {
    const key = `${type}_${id}`;
    const dateKey = format(date, 'yyyy-MM-dd');
    return weekStatuses[key]?.[dateKey] || (type === 'driver' ? 'available' : 'operational');
  };

  // Load assignments function
  const loadAssignments = async () => {
    try {
      // Load today's assignments
      const todayAssignments = await getTodaysAssignments();
      console.log('📅 Today assignments loaded:', todayAssignments);
      setTodaysAssignments(todayAssignments);

      // Load assignments for the current week
      const weekStart = subDays(selectedDate, selectedDate.getDay());
      const weekEnd = addDays(weekStart, 6);
      const weekAssignments = await getAssignmentsByDateRange(
        format(weekStart, 'yyyy-MM-dd'),
        format(weekEnd, 'yyyy-MM-dd')
      );
      console.log('📅 Week assignments loaded:', {
        weekStart: format(weekStart, 'yyyy-MM-dd'),
        weekEnd: format(weekEnd, 'yyyy-MM-dd'),
        assignments: weekAssignments
      });
      setAssignments(weekAssignments);
    } catch (error) {
      console.error('Error loading assignments:', error);
    }
  };

  // Reload assignments when selected date changes
  useEffect(() => {
    if (!loading) {
      loadAssignments();
    }
  }, [selectedDate, loading]);

  // Get assignments for a specific date
  const getAssignmentsForSpecificDate = (date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const filteredAssignments = assignments.filter(assignment => assignment.assignedDate === dateStr);
    
    console.log(`🔍 getAssignmentsForSpecificDate(${dateStr}):`, {
      totalAssignments: assignments.length,
      filteredAssignments: filteredAssignments.length,
      assignments: filteredAssignments.map(a => ({
        id: a.id,
        driverId: a.driverId,
        assignedDate: a.assignedDate,
        dispatchId: a.dispatchId,
        dispatchDetails: a.dispatchDetails
      }))
    });
    
    return filteredAssignments;
  };

  // Get driver status for a specific date
  const getDriverStatusForDate = async (driver, date) => {
    if (driver.status === 'unavailable') return 'unavailable';
    
    try {
      const activeAssignments = await getActiveDriverAssignmentsForDate(driver.id, date);
      
      if (activeAssignments.length > 0) {
        // Check if any assignment is in progress
        const inProgressAssignment = activeAssignments.find(a => a.status === 'in-progress');
        if (inProgressAssignment) return 'on-trip';
        
        return isToday(date) ? 'on-trip' : 'assigned';
      }
      
      return 'available';
    } catch (error) {
      console.error('Error getting driver status for date:', error);
      return 'available'; // Default to available if error
    }
  };

  // Get truck status for a specific date
  const getTruckStatusForDate = async (truck, date) => {
    if (truck.status === 'inactive') return 'inactive';
    
    try {
      const activeAssignments = await getActiveTruckAssignmentsForDate(truck.id, date);
      
      if (activeAssignments.length > 0) {
        // Check if any assignment is in progress
        const inProgressAssignment = activeAssignments.find(a => a.status === 'in-progress');
        if (inProgressAssignment) return 'on-trip';
        
        return 'assigned';
      }
      
      return 'operational';
    } catch (error) {
      console.error('Error getting truck status for date:', error);
      return 'operational'; // Default to operational if error
    }
  };

  const getWeekDates = (startDate) => {
    const dates = [];
    for (let i = 0; i < 7; i++) {
      dates.push(addDays(startDate, i));
    }
    return dates;
  };

  const weekDates = getWeekDates(subDays(selectedDate, selectedDate.getDay()));

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
          <div className="flex items-center gap-3">
            <FontAwesomeIcon icon={['fas', 'calendar-alt']} className="text-3xl text-blue-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Schedules & Assignments</h1>
              <p className="mt-1 text-gray-600">Manage driver and truck assignments by date</p>
            </div>
          </div>
        </div>
        <div className="mt-4 md:mt-0 flex space-x-3">
          <Button variant="secondary" icon={['fas', 'calendar']} onClick={() => setSelectedDate(new Date())}>
            Today
          </Button>
          <Button variant="secondary" icon={['fas', 'refresh']} onClick={loadAssignments}>
            Refresh
          </Button>
        </div>
      </div>

      {/* Date Navigation */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <div className="flex items-center justify-between p-2">
          <Button 
            variant="ghost" 
            icon={['fas', 'chevron-left']} 
            onClick={() => setSelectedDate(subDays(selectedDate, 7))}
            className="hover:bg-blue-100"
          />
          <div className="flex items-center space-x-4">
            <FontAwesomeIcon icon={['fas', 'calendar-week']} className="text-blue-600" />
            <h3 className="text-lg font-semibold text-blue-800">
              Week of {format(weekDates[0], 'MMM dd')} - {format(weekDates[6], 'MMM dd, yyyy')}
            </h3>
          </div>
          <Button 
            variant="ghost" 
            icon={['fas', 'chevron-right']} 
            onClick={() => setSelectedDate(addDays(selectedDate, 7))}
            className="hover:bg-blue-100"
          />
        </div>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 hover:shadow-lg transition-shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="p-3 bg-blue-500 rounded-full">
                <FontAwesomeIcon icon={['fas', 'users']} className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-blue-700">Available Drivers</p>
              <p className="text-3xl font-bold text-blue-900">
                {drivers.filter(d => d.status === 'available').length}
              </p>
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 hover:shadow-lg transition-shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="p-3 bg-green-500 rounded-full">
                <FontAwesomeIcon icon={['fas', 'truck']} className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-green-700">Operational Trucks</p>
              <p className="text-3xl font-bold text-green-900">
                {trucks.filter(t => t.status && t.status.toLowerCase() === 'operational').length}
              </p>
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 hover:shadow-lg transition-shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="p-3 bg-purple-500 rounded-full">
                <FontAwesomeIcon icon={['fas', 'route']} className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-purple-700">On Trip Today</p>
              <p className="text-3xl font-bold text-purple-900">
                {drivers.filter(d => d.status === 'on-trip').length}
              </p>
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200 hover:shadow-lg transition-shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="p-3 bg-orange-500 rounded-full">
                <FontAwesomeIcon icon={['fas', 'calendar-check']} className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-orange-700">Today's Assignments</p>
              <p className="text-3xl font-bold text-orange-900">
                {todaysAssignments.length}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Schedule Grid */}
      <Card className="shadow-lg">
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-4 border-b">
          <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
            <FontAwesomeIcon icon={['fas', 'calendar-alt']} className="text-blue-600" />
            Weekly Schedule Overview
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b-2 border-gray-200 bg-gray-50">
                <th className="text-left p-4 font-semibold text-gray-900">Resource</th>
                {weekDates.map((date, index) => (
                  <th key={index} className={`text-center p-4 font-semibold transition-colors ${
                    isToday(date) ? 'bg-blue-100 text-blue-900 border-b-4 border-blue-500' : 'text-gray-900 hover:bg-gray-100'
                  }`}>
                    <div className="font-bold">{format(date, 'EEE')}</div>
                    <div className="text-sm font-normal">{format(date, 'MMM dd')}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Drivers Section */}
              <tr>
                <td colSpan={8} className="p-4 bg-gradient-to-r from-blue-100 to-blue-50 border-l-4 border-blue-500">
                  <div className="flex items-center gap-2">
                    <FontAwesomeIcon icon={['fas', 'users']} className="text-blue-600" />
                    <span className="font-bold text-blue-800 text-lg">Drivers</span>
                  </div>
                </td>
              </tr>
              {drivers.map((driver) => (
                <tr key={driver.id} className="border-b hover:bg-gradient-to-r hover:from-blue-50 hover:to-transparent transition-colors">
                  <td className="p-4">
                    <div className="flex items-center space-x-3">
                      <div className="relative">
                        <div className="h-12 w-12 rounded-full overflow-hidden border-2 border-white shadow-lg bg-gradient-to-br from-blue-100 to-blue-200">
                          <img
                            src={driver.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(driver.name || 'Driver')}&background=2563eb&color=ffffff&size=48`}
                            alt={driver.name}
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(driver.name || 'Driver')}&background=2563eb&color=ffffff&size=48`;
                            }}
                          />
                        </div>
                        <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white shadow-sm ${
                          driver.status === 'available' ? 'bg-green-400' : 
                          driver.status === 'operational' ? 'bg-green-400' :
                          driver.status === 'on-trip' ? 'bg-blue-400' : 'bg-red-400'
                        }`}></div>
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">{driver.name}</div>
                        <div className="text-xs text-gray-500 mb-1">{driver.licenseType || 'License'}</div>
                        <Badge 
                          status={driver.status}
                          customColors={{
                            'available': 'green',
                            'operational': 'green',
                            'unavailable': 'red',
                            'on-trip': 'blue'
                          }}
                        />
                      </div>
                    </div>
                  </td>
                  {weekDates.map((date, dateIndex) => {
                    const status = getCachedStatus('driver', driver.id, date);
                    const dayAssignments = getAssignmentsForSpecificDate(date);
                    const driverAssignment = dayAssignments.find(a => a.driverId === driver.id);
                    
                    return (
                      <td key={dateIndex} className={`p-2 text-center transition-colors ${
                        isToday(date) ? 'bg-gradient-to-b from-blue-50 to-blue-100' : 'hover:bg-gray-50'
                      }`}>
                        {driverAssignment ? (
                          <div className="bg-gradient-to-br from-blue-100 to-blue-200 border-2 border-blue-300 rounded-lg p-3 text-xs shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-center justify-center mb-2">
                              <FontAwesomeIcon icon={['fas', 'truck']} className="text-blue-600 mr-1" />
                              <span className="font-bold text-blue-900 text-sm">
                                #{driverAssignment.dispatchDetails?.dispatchId || driverAssignment.dispatchId}
                              </span>
                            </div>
                            <div className="text-blue-800 mb-1 truncate font-medium">
                              📍 {driverAssignment.dispatchDetails?.sourceLocation?.address || 
                                   driverAssignment.dispatchDetails?.sourceLocation || 
                                   'Pickup'}
                            </div>
                            <div className="text-blue-700 text-xs mb-2 truncate">
                              🎯 {driverAssignment.dispatchDetails?.destinationLocation?.address || 
                                   driverAssignment.dispatchDetails?.destinationLocation || 
                                   'Destination'}
                            </div>
                            <Badge 
                              status={isToday(date) ? 'on-trip' : 'assigned'}
                              customColors={{
                                'on-trip': 'blue',
                                'assigned': 'yellow'
                              }}
                            />
                          </div>
                        ) : (
                          <div className={`p-3 rounded-lg border-2 transition-colors ${
                            status === 'unavailable' ? 'bg-gradient-to-br from-red-50 to-red-100 border-red-200 hover:from-red-100 hover:to-red-150' :
                            'bg-gradient-to-br from-green-50 to-green-100 border-green-200 hover:from-green-100 hover:to-green-150'
                          }`}>
                            <div className="flex items-center justify-center mb-1">
                              <FontAwesomeIcon 
                                icon={['fas', status === 'unavailable' ? 'times-circle' : 'check-circle']} 
                                className={`${status === 'unavailable' ? 'text-red-500' : 'text-green-500'} mr-1`} 
                              />
                            </div>
                            <Badge 
                              status={status}
                              customColors={{
                                'available': 'green',
                                'unavailable': 'red'
                              }}
                            />
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
              
              {/* Trucks Section */}
              <tr>
                <td colSpan={8} className="p-4 bg-gradient-to-r from-green-100 to-green-50 border-l-4 border-green-500">
                  <div className="flex items-center gap-2">
                    <FontAwesomeIcon icon={['fas', 'truck']} className="text-green-600" />
                    <span className="font-bold text-green-800 text-lg">Trucks</span>
                  </div>
                </td>
              </tr>
              {trucks.map((truck) => (
                <tr key={truck.id} className="border-b hover:bg-gradient-to-r hover:from-green-50 hover:to-transparent transition-colors">
                  <td className="p-4">
                    <div className="flex items-center space-x-3">
                      <div className="relative">
                        {truck.truckImage ? (
                          <div className="h-12 w-12 rounded-lg overflow-hidden border-2 border-white shadow-lg bg-gradient-to-br from-gray-100 to-gray-200">
                            <img 
                              src={truck.truckImage} 
                              alt={truck.plateNumber || 'Truck'}
                              className="h-full w-full object-cover"
                              onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'flex';
                              }}
                            />
                            <div className="h-full w-full bg-gradient-to-br from-green-400 to-green-600 rounded-lg flex items-center justify-center shadow-md" style={{display: 'none'}}>
                              <FontAwesomeIcon icon={['fas', 'truck']} className="h-6 w-6 text-white" />
                            </div>
                          </div>
                        ) : (
                          <div className="h-12 w-12 bg-gradient-to-br from-green-400 to-green-600 rounded-lg flex items-center justify-center shadow-lg border-2 border-white">
                            <FontAwesomeIcon icon={['fas', 'truck']} className="h-6 w-6 text-white" />
                          </div>
                        )}
                        <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white shadow-sm ${
                          truck.status && truck.status.toLowerCase() === 'operational' ? 'bg-green-400' : 
                          truck.status && truck.status.toLowerCase() === 'assigned' ? 'bg-blue-400' : 'bg-red-400'
                        }`}></div>
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">
                          {truck.plateNumber || truck.truckId || `Truck ${truck.id?.slice(-4)}`}
                        </div>
                        <div className="text-xs text-gray-500 mb-1">
                          {truck.make && truck.model ? `${truck.make} ${truck.model}` : 'Truck'} • {truck.capacity || 0}kg
                        </div>
                        <Badge 
                          status={truck.status}
                          customColors={{
                            'operational': 'green',
                            'inactive': 'red',
                            'assigned': 'blue'
                          }}
                        />
                      </div>
                    </div>
                  </td>
                  {weekDates.map((date, dateIndex) => {
                    const status = getCachedStatus('truck', truck.id, date);
                    const dayAssignments = getAssignmentsForSpecificDate(date);
                    const truckAssignment = dayAssignments.find(a => a.truckId === truck.id);
                    
                    return (
                      <td key={dateIndex} className={`p-2 text-center transition-colors ${
                        isToday(date) ? 'bg-gradient-to-b from-green-50 to-green-100' : 'hover:bg-gray-50'
                      }`}>
                        {truckAssignment ? (
                          <div className="bg-gradient-to-br from-green-100 to-green-200 border-2 border-green-300 rounded-lg p-3 text-xs shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-center justify-center mb-2">
                              <FontAwesomeIcon icon={['fas', 'shipping-fast']} className="text-green-600 mr-1" />
                              <span className="font-bold text-green-900 text-sm">
                                #{truckAssignment.dispatchDetails?.dispatchId || truckAssignment.dispatchId}
                              </span>
                            </div>
                            <div className="text-green-800 mb-1 truncate font-medium">
                              📍 {truckAssignment.dispatchDetails?.sourceLocation?.address || 
                                   truckAssignment.dispatchDetails?.sourceLocation || 
                                   'Pickup'}
                            </div>
                            <div className="text-green-700 text-xs mb-2 truncate">
                              🎯 {truckAssignment.dispatchDetails?.destinationLocation?.address || 
                                   truckAssignment.dispatchDetails?.destinationLocation || 
                                   'Destination'}
                            </div>
                            <Badge 
                              status="assigned"
                              customColors={{ 'assigned': 'green' }}
                            />
                          </div>
                        ) : (
                          <div className={`p-3 rounded-lg border-2 transition-colors ${
                            status === 'inactive' ? 'bg-gradient-to-br from-red-50 to-red-100 border-red-200 hover:from-red-100 hover:to-red-150' :
                            'bg-gradient-to-br from-green-50 to-green-100 border-green-200 hover:from-green-100 hover:to-green-150'
                          }`}>
                            <div className="flex items-center justify-center mb-1">
                              <FontAwesomeIcon 
                                icon={['fas', status === 'inactive' ? 'ban' : 'check-circle']} 
                                className={`${status === 'inactive' ? 'text-red-500' : 'text-green-500'} mr-1`} 
                              />
                            </div>
                            <Badge 
                              status={status}
                              customColors={{
                                'operational': 'green',
                                'inactive': 'red'
                              }}
                            />
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default SchedulePage;
