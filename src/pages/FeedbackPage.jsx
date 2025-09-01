import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { format } from 'date-fns';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Badge from '../components/ui/Badge';
import { getDocs, collection, query, orderBy } from 'firebase/firestore';
import { db } from '../services/firebase';

const FeedbackPage = () => {
  const [loading, setLoading] = useState(true);
  const [feedbacks, setFeedbacks] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState(null);

  useEffect(() => {
    loadFeedbacks();
  }, []);

  const loadFeedbacks = async () => {
    setLoading(true);
    try {
      const feedbackQuery = query(
        collection(db, 'feedbacks'),
        orderBy('timestamp', 'desc')
      );
      const querySnapshot = await getDocs(feedbackQuery);
      const feedbackData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setFeedbacks(feedbackData);
    } catch (error) {
      console.error('Error loading feedbacks:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTypeCount = (type) => {
    return feedbacks.filter(feedback => feedback.type === type).length;
  };

  const openDetailsModal = (feedback) => {
    setSelectedFeedback(feedback);
    setShowDetailsModal(true);
  };

  const getTypeBadge = (type) => {
    const typeColors = {
      'general': 'blue',
      'complaint': 'red', 
      'suggestion': 'yellow',
      'compliment': 'green',
      'service': 'purple'
    };
    
    return (
      <Badge 
        status={type} 
        customColors={{
          [type]: typeColors[type] || 'gray'
        }}
      />
    );
  };

  const filteredFeedbacks = feedbacks.filter(feedback => {
    const matchesSearch = searchTerm === '' || 
      feedback.customerEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      feedback.customerId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      feedback.feedback?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = typeFilter === 'all' || feedback.type === typeFilter;
    
    return matchesSearch && matchesType;
  });

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
          <h1 className="text-3xl font-bold text-gray-900">Customer Feedback</h1>
          <p className="mt-2 text-gray-600">View and manage customer feedback and suggestions</p>
        </div>
        <div className="mt-4 md:mt-0 flex space-x-3">
          <Button variant="secondary" icon={['fas', 'download']}>
            Export Feedback
          </Button>
          <Button variant="secondary" icon={['fas', 'chart-bar']}>
            View Analytics
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-blue-50 border-blue-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <FontAwesomeIcon icon={['fas', 'comments']} className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-blue-600">Total Feedback</p>
              <p className="text-2xl font-bold text-blue-900">{feedbacks.length}</p>
            </div>
          </div>
        </Card>

        <Card className="bg-green-50 border-green-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <FontAwesomeIcon icon={['fas', 'lightbulb']} className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-green-600">General Feedback</p>
              <p className="text-2xl font-bold text-green-900">{getTypeCount('general')}</p>
            </div>
          </div>
        </Card>

        <Card className="bg-yellow-50 border-yellow-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <FontAwesomeIcon icon={['fas', 'exclamation-triangle']} className="h-8 w-8 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-yellow-600">Complaints</p>
              <p className="text-2xl font-bold text-yellow-900">{getTypeCount('complaint')}</p>
            </div>
          </div>
        </Card>

        <Card className="bg-purple-50 border-purple-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <FontAwesomeIcon icon={['fas', 'thumbs-up']} className="h-8 w-8 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-purple-600">Suggestions</p>
              <p className="text-2xl font-bold text-purple-900">{getTypeCount('suggestion')}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4">
          <div className="flex-1">
            <Input
              placeholder="Search by customer email, customer ID, or feedback content..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              icon={['fas', 'search']}
            />
          </div>
          <div className="w-full md:w-48">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Types</option>
              <option value="general">General</option>
              <option value="complaint">Complaint</option>
              <option value="suggestion">Suggestion</option>
              <option value="compliment">Compliment</option>
              <option value="service">Service</option>
            </select>
          </div>
          <div className="text-sm text-gray-500">
            Showing {filteredFeedbacks.length} of {feedbacks.length} feedbacks
          </div>
        </div>
      </Card>

      {/* Feedback Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Feedback
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredFeedbacks.length > 0 ? (
                filteredFeedbacks.map((feedback) => (
                  <tr key={feedback.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <FontAwesomeIcon icon={['fas', 'user-circle']} className="h-8 w-8 text-gray-400" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{feedback.customerEmail || 'Unknown'}</div>
                          <div className="text-sm text-gray-500">{feedback.customerId}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getTypeBadge(feedback.type)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 max-w-xs truncate">
                        {feedback.feedback || 'No feedback provided'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {feedback.timestamp && format(feedback.timestamp.toDate(), 'MMM dd, yyyy HH:mm')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <Button
                          size="small"
                          variant="ghost"
                          onClick={() => openDetailsModal(feedback)}
                        >
                          View Details
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="px-6 py-4 text-center text-gray-500">
                    No feedback found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Details Modal */}
      {showDetailsModal && selectedFeedback && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">
                Feedback Details
              </h3>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <FontAwesomeIcon icon={['fas', 'times']} />
              </button>
            </div>
            
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Customer Information</h4>
                  <div className="space-y-2">
                    <p><strong>Email:</strong> {selectedFeedback.customerEmail || 'Unknown'}</p>
                    <p><strong>Customer ID:</strong> {selectedFeedback.customerId}</p>
                    <p><strong>Date Submitted:</strong> {selectedFeedback.timestamp && format(selectedFeedback.timestamp.toDate(), 'MMM dd, yyyy HH:mm')}</p>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Feedback Information</h4>
                  <div className="space-y-2">
                    <p><strong>Type:</strong> {getTypeBadge(selectedFeedback.type)}</p>
                    <p><strong>Feedback ID:</strong> {selectedFeedback.id}</p>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-3">Customer Feedback</h4>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-gray-800 whitespace-pre-wrap">{selectedFeedback.feedback || 'No feedback provided'}</p>
                </div>
              </div>
            </div>

            <div className="flex justify-end mt-6 border-t pt-4">
              <Button
                onClick={() => setShowDetailsModal(false)}
                variant="primary"
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

export default FeedbackPage;
