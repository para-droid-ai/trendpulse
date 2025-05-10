import React, { useState, useEffect } from 'react';

const TopicStreamForm = ({ onSubmit, initialData = null, isEditing = false }) => {
  const [formData, setFormData] = useState({
    query: '',
    update_frequency: 'daily',
    detail_level: 'detailed',
    model_type: 'sonar-reasoning',
    recency_filter: '1d'
  });
  
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  useEffect(() => {
    if (initialData) {
      setFormData({
        query: initialData.query || '',
        update_frequency: initialData.update_frequency || 'daily',
        detail_level: initialData.detail_level || 'detailed',
        model_type: initialData.model_type || 'sonar-reasoning',
        recency_filter: initialData.recency_filter || '1d'
      });
    } else {
      setFormData({
        query: '',
        update_frequency: 'daily',
        detail_level: 'detailed',
        model_type: 'sonar-reasoning',
        recency_filter: '1d'
      });
    }
  }, [initialData]);
  
  const updateFrequencyOptions = [
    { value: 'hourly', label: 'Hourly' },
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' }
  ];
  
  const detailLevelOptions = [
    { value: 'brief', label: 'Brief' },
    { value: 'detailed', label: 'Detailed' },
    { value: 'comprehensive', label: 'Comprehensive' }
  ];
  
  const modelTypeOptions = [
    { value: 'sonar', label: 'Sonar' },
    { value: 'sonar-pro', label: 'Sonar Pro' },
    { value: 'sonar-reasoning', label: 'Sonar Reasoning' },
    { value: 'sonar-reasoning-pro', label: 'Sonar Reasoning Pro' }
  ];
  
  const recencyFilterOptions = [
    { value: '1h', label: 'Last hour' },
    { value: '1d', label: 'Last day' },
    { value: '1w', label: 'Last week' },
    { value: '1m', label: 'Last month' },
    { value: '1y', label: 'Last year' }
  ];
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    
    // Clear error for this field when user edits it
    if (errors[name]) {
      setErrors({ ...errors, [name]: undefined });
    }
  };
  
  const validateForm = () => {
    const newErrors = {};
    
    // Query validation - required and minimum length
    if (!formData.query.trim()) {
      newErrors.query = 'Query is required';
    } else if (formData.query.trim().length < 3) {
      newErrors.query = 'Query must be at least 3 characters';
    } else if (formData.query.trim().length > 100) {
      newErrors.query = 'Query must be less than 100 characters';
    }
    
    // Validate update frequency
    const validUpdateFrequencies = updateFrequencyOptions.map(option => option.value);
    if (!validUpdateFrequencies.includes(formData.update_frequency)) {
      newErrors.update_frequency = 'Please select a valid update frequency';
    }
    
    // Validate detail level
    const validDetailLevels = detailLevelOptions.map(option => option.value);
    if (!validDetailLevels.includes(formData.detail_level)) {
      newErrors.detail_level = 'Please select a valid detail level';
    }
    
    // Validate model type
    const validModelTypes = modelTypeOptions.map(option => option.value);
    if (!validModelTypes.includes(formData.model_type)) {
      newErrors.model_type = 'Please select a valid model type';
    }
    
    // Validate recency filter
    const validRecencyFilters = recencyFilterOptions.map(option => option.value);
    if (!validRecencyFilters.includes(formData.recency_filter)) {
      newErrors.recency_filter = 'Please select a valid recency filter';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      await onSubmit(formData);
      if (!isEditing) {
        setFormData({
          query: '',
          update_frequency: 'daily',
          detail_level: 'detailed',
          model_type: 'sonar-reasoning',
          recency_filter: '1d'
        });
      }
      setErrors({});
    } catch (error) {
      console.error('Form submission error:', error);
      setErrors({
        submission: error.response?.data?.detail || 'Failed to create topic stream. Please try again.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {errors.submission && (
        <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded">
          {errors.submission}
        </div>
      )}
      
      <div>
        <label htmlFor="query" className="block text-sm font-medium text-gray-700">
          Topic Query <span className="text-red-500">*</span>
        </label>
        <div className="mt-1">
          <input
            type="text"
            name="query"
            id="query"
            value={formData.query}
            onChange={handleChange}
            className={`shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md ${
              errors.query ? 'border-red-500' : ''
            }`}
            placeholder="Enter a topic query, e.g., 'latest AI developments'"
            data-testid="topic-query-input"
          />
          {errors.query && (
            <p className="mt-1 text-sm text-red-600">{errors.query}</p>
          )}
        </div>
        <p className="mt-1 text-xs text-gray-500">
          This query will be used to search for information on this topic.
        </p>
      </div>
      
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor="update_frequency" className="block text-sm font-medium text-gray-700">
            Update Frequency
          </label>
          <select
            id="update_frequency"
            name="update_frequency"
            value={formData.update_frequency}
            onChange={handleChange}
            className={`mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md ${
              errors.update_frequency ? 'border-red-500' : ''
            }`}
            data-testid="update-frequency-select"
          >
            {updateFrequencyOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {errors.update_frequency && (
            <p className="mt-1 text-sm text-red-600">{errors.update_frequency}</p>
          )}
        </div>
        
        <div>
          <label htmlFor="detail_level" className="block text-sm font-medium text-gray-700">
            Detail Level
          </label>
          <select
            id="detail_level"
            name="detail_level"
            value={formData.detail_level}
            onChange={handleChange}
            className={`mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md ${
              errors.detail_level ? 'border-red-500' : ''
            }`}
            data-testid="detail-level-select"
          >
            {detailLevelOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {errors.detail_level && (
            <p className="mt-1 text-sm text-red-600">{errors.detail_level}</p>
          )}
        </div>
        
        <div>
          <label htmlFor="model_type" className="block text-sm font-medium text-gray-700">
            Model Type
          </label>
          <select
            id="model_type"
            name="model_type"
            value={formData.model_type}
            onChange={handleChange}
            className={`mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md ${
              errors.model_type ? 'border-red-500' : ''
            }`}
            data-testid="model-type-select"
          >
            {modelTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {errors.model_type && (
            <p className="mt-1 text-sm text-red-600">{errors.model_type}</p>
          )}
        </div>
        
        <div>
          <label htmlFor="recency_filter" className="block text-sm font-medium text-gray-700">
            Recency Filter
          </label>
          <select
            id="recency_filter"
            name="recency_filter"
            value={formData.recency_filter}
            onChange={handleChange}
            className={`mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md ${
              errors.recency_filter ? 'border-red-500' : ''
            }`}
            data-testid="recency-filter-select"
          >
            {recencyFilterOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {errors.recency_filter && (
            <p className="mt-1 text-sm text-red-600">{errors.recency_filter}</p>
          )}
        </div>
      </div>
      
      <div className="pt-4">
        <button
          type="submit"
          disabled={isSubmitting}
          className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
            isSubmitting ? 'opacity-75 cursor-not-allowed' : ''
          }`}
          data-testid="create-stream-button"
        >
          {isSubmitting ? (isEditing ? 'Updating...' : 'Creating...') : (isEditing ? 'Update Topic Stream' : 'Create Topic Stream')}
        </button>
      </div>
    </form>
  );
};

export default TopicStreamForm; 