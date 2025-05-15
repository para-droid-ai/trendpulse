import React, { useState, useEffect } from 'react';
import { topicStreamAPI } from '../services/api';
import { format, formatDistanceToNowStrict, parseISO } from 'date-fns';
import { formatInTimeZone, toZonedTime } from 'date-fns-tz';
import DeepDiveChat from './DeepDiveChat';
import MarkdownRenderer from './MarkdownRenderer';
import SummaryDeleteButton from './SummaryDeleteButton';
import TopicStreamForm from './TopicStreamForm';

const TopicStreamWidget = ({ stream, onDelete, onUpdate, isGridView }) => {
  const [summaries, setSummaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedSummaryId, setExpandedSummaryId] = useState(null);
  const [showDeepDive, setShowDeepDive] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [selectedSummary, setSelectedSummary] = useState(null);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showExportOptions, setShowExportOptions] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState('');

  // State for deleting the WHOLE stream (keep existing)
  const [showDeleteStreamConfirm, setShowDeleteStreamConfirm] = useState(false);

  useEffect(() => {
    fetchSummaries();
  }, [stream.id]);

  const fetchSummaries = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await topicStreamAPI.getSummaries(stream.id);
      // Map summaries to explicitly include model_type from the stream
      const summariesWithModel = data.map(summary => ({
        ...summary,
        model_type: stream.model_type, // Ensure model_type from the stream is included
      }));
      setSummaries(summariesWithModel);
      console.log('Fetched summaries data:', data);
    } catch (err) {
      console.error('Failed to load summaries:', err);
      setError('Failed to load summaries. Please try refreshing.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateNow = async () => {
    try {
      setUpdating(true);
      setError('');
      
      const newSummary = await topicStreamAPI.updateNow(stream.id);
      
      if (newSummary.content && newSummary.content.includes("No new information is available")) {
        setError('No new information is available since the last update.');
      } else {
        setSummaries([newSummary, ...summaries]);
      }
    } catch (err) {
      console.error('Failed to update stream:', err);
      setError(err.message || 'Failed to update stream. Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteStream = () => {
    setShowDeleteStreamConfirm(true);
  };

  const confirmDeleteStream = () => {
    onDelete(stream.id);
    setShowDeleteStreamConfirm(false);
  };

  const cancelDeleteStream = () => {
    setShowDeleteStreamConfirm(false);
  };

  const handleSummarySuccessfullyDeleted = (deletedSummaryId) => {
    setSummaries(prevSummaries => prevSummaries.filter(s => s.id !== deletedSummaryId));
    setError('');
  };
  
  const handleSummaryDeletionError = (errorMessage) => {
    setError(errorMessage);
  };

  const handleAppendSummary = (newSummary) => {
    setSummaries([newSummary, ...summaries]);
  };

  const handleDeepDive = (summary) => {
    setSelectedSummary(summary);
    setShowDeepDive(true);
  };

  const toggleExpandSummary = (id) => {
    if (expandedSummaryId === id) {
      setExpandedSummaryId(null);
    } else {
      setExpandedSummaryId(id);
    }
  };

  const handleEdit = () => {
    setShowEditForm(true);
  };

  const handleEditSubmit = async (formData) => {
    try {
      await onUpdate(stream.id, formData);
      setShowEditForm(false);
      setError('');
    } catch (err) {
      console.error('Failed to update stream:', err);
      setError(err.message || 'Failed to update stream. Please try again.');
    }
  };

  // Function to format stream content for export
  const formatStreamContent = (streamData, summariesData, formatType = 'md') => {
    let content = ``;

    if (formatType === 'md') {
      content += `# ${streamData.query}\n\n`;
      content += `*Update Frequency:* ${streamData.update_frequency}\n`;
      content += `*Detail Level:* ${streamData.detail_level}\n`;
      if (streamData.last_updated) {
        // Re-use the date formatting logic for consistency
        const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const lastUpdatedFormatted = formatInTimeZone(toZonedTime(parseISO(streamData.last_updated + 'Z'), userTimeZone), userTimeZone, 'MMM d, yyyy h:mm a');
        content += `*Last Updated:* ${lastUpdatedFormatted}\n`;
      }
      content += `\n---\n\n`;

      summariesData.forEach((summary, index) => {
        const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const createdAtFormatted = summary.created_at ? formatInTimeZone(toZonedTime(parseISO(summary.created_at + 'Z'), userTimeZone), userTimeZone, 'MMM d, yyyy h:mm a') : '';

        content += `## Summary ${summariesData.length - index}\n\n`;
        content += `*Generated:* ${createdAtFormatted}\n`;
        if (summary.model) {
          content += `*Model:* ${summary.model}\n`;
        }
        content += `\n${summary.content}\n\n`;

        if (summary.sources && summary.sources.length > 0) {
          content += `*Sources:*\n`;
          summary.sources.forEach(source => {
             // Handle potential source objects or strings
            const sourceUrl = typeof source === 'string' ? source : (source.url || source.name || source);
            if (sourceUrl) {
              content += `- [${sourceUrl}](${sourceUrl})\n`;
            }
          });
          content += `\n`;
        }
         content += `\n---\n\n`;
      });

    } else { // txt format
       content += `${streamData.query}\n\n`;
      content += `Update Frequency: ${streamData.update_frequency}\n`;
      content += `Detail Level: ${streamData.detail_level}\n`;
        if (streamData.last_updated) {
        const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const lastUpdatedFormatted = formatInTimeZone(toZonedTime(parseISO(streamData.last_updated + 'Z'), userTimeZone), userTimeZone, 'MMM d, yyyy h:mm a');
        content += `Last Updated: ${lastUpdatedFormatted}\n`;
      }
      content += `\n---\n\n`;

      summariesData.forEach((summary, index) => {
        const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const createdAtFormatted = summary.created_at ? formatInTimeZone(toZonedTime(parseISO(summary.created_at + 'Z'), userTimeZone), userTimeZone, 'MMM d, yyyy h:mm a') : '';

        content += `Summary ${summariesData.length - index}\n\n`;
        content += `Generated: ${createdAtFormatted}\n`;
         if (summary.model) {
          content += `Model: ${summary.model}\n`;
        }
        content += `\n${summary.content}\n\n`;

        if (summary.sources && summary.sources.length > 0) {
          content += `Sources:\n`;
          summary.sources.forEach(source => {
             const sourceUrl = typeof source === 'string' ? source : (source.url || source.name || source);
             if(sourceUrl) { // Ensure sourceUrl is not empty
                content += `- ${sourceUrl}\n`;
             }
          });
           content += `\n`;
        }
         content += `\n---\n\n`;
      });
    }

    return content;
  };

  // Function to copy content to clipboard
  const copyToClipboard = async () => {
    const content = formatStreamContent(stream, summaries, 'txt'); // Use txt format for clipboard
    try {
      await navigator.clipboard.writeText(content);
      setCopyFeedback('Copied!');
      console.log('Stream content copied to clipboard!');
    } catch (err) {
      setCopyFeedback('Failed to copy.');
      console.error('Failed to copy stream content:', err);
    } finally {
      setTimeout(() => setCopyFeedback(''), 3000);
    }
  };

  // Function to export content as a file
  const exportAsFile = (formatType) => {
    const content = formatStreamContent(stream, summaries, formatType);
    const blob = new Blob([content], { type: formatType === 'md' ? 'text/markdown' : 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    // Sanitize filename (replace spaces with underscores, remove special characters)
    const sanitizedQuery = stream.query.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_.-]/g, '');
    const filename = `${sanitizedQuery}.${formatType}`;
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url); // Clean up the object URL
  };

  if (!stream) {
    return null;
  }

  // Calculate time since last update
  const lastUpdateTimestamp = summaries.length > 0 ? summaries[0].created_at : null;
  
  // Get user's local time zone
  const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  console.log('User Time Zone:', userTimeZone);

  const timeSinceLastUpdate = lastUpdateTimestamp
    ? formatDistanceToNowStrict(toZonedTime(parseISO(lastUpdateTimestamp + 'Z'), userTimeZone), { addSuffix: true })
    : 'Never updated';

  return (
    <div className={`${isGridView ? 'lg:col-span-1' : 'w-full'} bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200`}>
      <div className={`p-4 border-b dark:border-gray-700 flex ${isGridView ? 'flex-col space-y-4' : 'justify-between items-start'}`}>
        <div className={`${isGridView ? 'w-full' : 'flex-1 min-w-0 mr-4'}`}>
          <h3 className={`text-lg font-semibold text-gray-900 dark:text-white ${isGridView ? 'line-clamp-3' : 'truncate'}`}>
            {stream.query}
          </h3>
          <div className="flex flex-wrap gap-2 mt-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
              {stream.update_frequency}
            </span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
              {stream.detail_level}
            </span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
              {stream.model_type}
            </span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
              {timeSinceLastUpdate}
            </span>
          </div>
        </div>
        
        {/* Buttons - right side, need conditional layout */}
        {isGridView ? (
          // Grid View Layout: Revert to original layout (left-aligned, all on one line)
          <div className="flex flex-wrap gap-2 w-full justify-start relative"> {/* Revert to justify-start */}
            <button
              onClick={handleEdit}
              className="text-xs py-1 px-2 rounded bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
            >
              Edit
            </button>
            <button
              onClick={handleUpdateNow}
              disabled={updating}
              className={`text-xs py-1 px-2 rounded bg-blue-600 text-white hover:bg-blue-700 transition-colors ${
                updating ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {updating ? 'Updating...' : 'Update Now'}
            </button>

            {/* Delete Button for Grid View */}
            <button
              onClick={handleDeleteStream}
              className="text-xs py-1 px-2 rounded bg-red-600 text-white hover:bg-red-700 transition-colors"
            >
              Delete Stream
            </button>

            {/* Export Button for Grid View */}
            <button
              onClick={() => setShowExportOptions(!showExportOptions)}
              className="text-xs py-1 px-2 rounded bg-gray-600 text-white hover:bg-gray-700 transition-colors"
            >
              Export
            </button>

            {/* Export Options Dropdown - positioned relative to this container */}
            {showExportOptions && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-700 rounded-md shadow-lg z-10"> {/* Position dropdown */}
                <div className="py-1" role="menu" aria-orientation="vertical" aria-labelledby="options-menu">
                  <button
                    onClick={() => { copyToClipboard(); setShowExportOptions(false); }}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600"
                    role="menuitem"
                  >
                    Copy to Clipboard
                  </button>
                  <button
                    onClick={() => { exportAsFile('md'); setShowExportOptions(false); }}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600"
                    role="menuitem"
                  >
                    Export as .md
                  </button>
                  <button
                    onClick={() => { exportAsFile('txt'); setShowExportOptions(false); }}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600"
                    role="menuitem"
                  >
                    Export as .txt
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          // List View Layout: Edit/Update on first line, Delete/Export on second, both right-aligned
          <div className="flex flex-col items-end space-y-1 relative"> {/* items-end aligns flex items to the right */}
            {/* First line: Edit, Update Now */}
            <div className="flex space-x-1"> {/* Container for first line buttons */}
              <button
                onClick={handleEdit}
                className="text-xs py-1 px-2 rounded bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
              >
                Edit
              </button>
              <button
                onClick={handleUpdateNow}
                disabled={updating}
                className={`text-xs py-1 px-2 rounded bg-blue-600 text-white hover:bg-blue-700 transition-colors ${
                  updating ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {updating ? 'Updating...' : 'Update Now'}
              </button>
            </div>

            {/* Second line: Delete, Export */}
            <div className="flex space-x-1 justify-end w-full"> {/* Ensure buttons are right-aligned on this line */}
              <button
                onClick={handleDeleteStream}
                className="text-xs py-1 px-2 rounded bg-red-600 text-white hover:bg-red-700 transition-colors"
              >
                Delete Stream
              </button>
              <button
                onClick={() => setShowExportOptions(!showExportOptions)}
                className="text-xs py-1 px-2 rounded bg-gray-600 text-white hover:bg-gray-700 transition-colors"
              >
                Export
              </button>
            </div>

            {/* Export Options Dropdown - positioned relative to the main flex-col container */}
            {showExportOptions && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-700 rounded-md shadow-lg z-10"> {/* Position dropdown */}
                <div className="py-1" role="menu" aria-orientation="vertical" aria-labelledby="options-menu">
                  <button
                    onClick={() => { copyToClipboard(); setShowExportOptions(false); }}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600"
                    role="menuitem"
                  >
                    Copy to Clipboard
                  </button>
                  <button
                    onClick={() => { exportAsFile('md'); setShowExportOptions(false); }}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600"
                    role="menuitem"
                  >
                    Export as .md
                  </button>
                  <button
                    onClick={() => { exportAsFile('txt'); setShowExportOptions(false); }}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600"
                    role="menuitem"
                  >
                    Export as .txt
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {error && !showDeleteStreamConfirm && (
        <div className="p-4 bg-red-100 border-l-4 border-red-500 text-red-700">
          <p>{error}</p>
          <button onClick={() => setError('')} className="text-sm underline mt-1">Dismiss</button>
        </div>
      )}

      <div className="divide-y dark:divide-gray-700">
        {loading ? (
          <div className="p-4 text-center text-gray-500 dark:text-gray-400">Loading summaries...</div>
        ) : summaries.length === 0 && !error ? (
          <div className="p-4 text-center text-gray-500 dark:text-gray-400">
            No summaries yet. Click "Update Now" to generate one.
          </div>
        ) : (
          summaries.map((summary) => (
            <div key={summary.id} className="p-4">
              <h4 className="text-md font-medium text-gray-700 dark:text-gray-300 mb-2">Summary</h4>
               <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                 <span className="text-xs px-2.5 py-0.5 rounded-full bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200 font-medium">
                    {summary.created_at ? formatInTimeZone(toZonedTime(parseISO(summary.created_at + 'Z'), Intl.DateTimeFormat().resolvedOptions().timeZone), Intl.DateTimeFormat().resolvedOptions().timeZone, 'MMM d, yyyy h:mm a') : ''}
                  </span>
                 <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">{summary.model_type}</span>
               </div>
               <div className={`prose prose-sm max-w-none dark:prose-invert`}>
                 <MarkdownRenderer content={summary.content} />
               </div>
               
               {/* Summary Actions */}
               <div className="flex space-x-2 mt-4">
                  <button
                   onClick={() => handleDeepDive(summary)}
                   className="text-xs bg-indigo-50 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-300 px-2 py-1 rounded-full"
                 >
                   Deep Dive
                 </button>
                  <SummaryDeleteButton 
                   streamId={stream.id} 
                   summaryId={summary.id}
                   onSummaryDeleted={handleSummarySuccessfullyDeleted}
                   onError={handleSummaryDeletionError} 
                 />
               </div>
              
               {/* Summary Sources */}
               {summary.sources && summary.sources.length > 0 && (
                 <div className="mt-3">
                   <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Sources:</div>
                   <div className="flex flex-wrap gap-1">
                     {summary.sources.map((source, index) => (
                       <a
                         key={index}
                         href={typeof source === 'string' ? source : (source.url || source.name || source)}
                         target="_blank"
                         rel="noopener noreferrer"
                         className="text-xs text-gray-600 bg-gray-100 hover:bg-gray-200 dark:text-gray-400 dark:bg-gray-700 dark:hover:bg-gray-600 px-2 py-1 rounded-full truncate max-w-[200px]"
                         title={typeof source === 'string' ? source : (source.url || source.name || source)}
                       >
                         {typeof source === 'string' 
                           ? source 
                           : (source.name || source.url || source)}
                       </a>
                     ))}
                   </div>
                 </div>
               )}
            </div>
          ))
        )}
      </div>

      {showDeepDive && selectedSummary && (
        <div className="fixed inset-0 z-50 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-3/4 max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900 dark:text-blue-300 truncate flex-1 min-w-0">
                Deep Dive: {stream.query}
              </h3>
              <button
                onClick={() => setShowDeepDive(false)}
                className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Main content area with two columns */}
            <div className="flex flex-1 overflow-hidden flex-row">
              {/* Original Summary Section - Left Column */}
              <div className="flex-1 basis-1/2 p-4 border-r dark:border-gray-700 overflow-y-auto">
                <h4 className="text-md font-medium text-gray-700 dark:text-gray-300 mb-2">Summary</h4>
                <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                  {selectedSummary.created_at ? formatInTimeZone(toZonedTime(parseISO(selectedSummary.created_at), userTimeZone), userTimeZone, 'MMM d, yyyy h:mm a') : ''} • Model: {selectedSummary.model_type}
                </div>
                <MarkdownRenderer content={selectedSummary.content} />
              </div>
              
              {/* Deep Dive Chat Section - Right Column */}
              <div className="flex-1 basis-1/2 overflow-hidden">
                <DeepDiveChat 
                  topicStreamId={stream.id} 
                  summaryId={selectedSummary.id}
                  topic={stream.query}
                  onAppend={handleAppendSummary}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {showDeleteStreamConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full shadow-xl">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Delete Topic Stream?
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Are you sure you want to delete the entire topic stream "{stream.query}"? This action cannot be undone, and all associated summaries will be permanently deleted.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={cancelDeleteStream}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteStream}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
              >
                Delete Stream
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Display copy feedback */}
      {copyFeedback && (
        <div className="absolute bottom-4 right-4 px-3 py-2 bg-gray-800 text-white text-sm rounded shadow-lg z-50">
          {copyFeedback}
        </div>
      )}
    </div>
  );
};

export default TopicStreamWidget;