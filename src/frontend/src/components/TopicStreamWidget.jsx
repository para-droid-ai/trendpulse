import React, { useState, useEffect, useCallback } from 'react';
import { topicStreamAPI } from '../services/api';
import { format, formatDistanceToNowStrict, parseISO } from 'date-fns';
import DeepDiveChat from './DeepDiveChat';
import MarkdownRenderer from './MarkdownRenderer';
import SummaryDeleteButton from './SummaryDeleteButton';
import TopicStreamForm from './TopicStreamForm';
import Portal from './Portal';
import OrbitalLoadingAnimation from './OrbitalLoadingAnimation';

// Custom locale for abbreviated distance
const customDistanceLocale = {
  lessThanXSeconds: { one: 'just now', other: '{{count}}s ago' },
  xSeconds: { one: '{{count}}s ago', other: '{{count}}s ago' },
  halfAMinute: '30s ago',
  lessThanXMinutes: { one: '1m ago', other: '{{count}}m ago' },
  xMinutes: { one: '{{count}}m ago', other: '{{count}}m ago' },
  aboutXHours: { one: '1h ago', other: '{{count}}h ago' },
  xHours: { one: '{{count}}h ago', other: '{{count}}h ago' },
  xDays: { one: '1d ago', other: '{{count}}d ago' },
  aboutXWeeks: { one: '1wk ago', other: '{{count}}wk ago' },
  xWeeks: { one: '{{count}}wk ago', other: '{{count}}wk ago' },
  aboutXMonths: { one: '1mo ago', other: '{{count}}mo ago' },
  xMonths: { one: '{{count}}mo ago', other: '{{count}}mo ago' },
  aboutXYears: { one: '1yr ago', other: '{{count}}yr ago' },
  xYears: { one: '{{count}}yr ago', other: '{{count}}yr ago' },
  overXYears: { one: 'over 1yr ago', other: 'over {{count}}yr ago' },
  almostXYears: { one: 'almost 1yr ago', other: 'almost {{count}}yr ago' },
};

function formatDistanceLocale(token, count, options) {
  options = options || {};

  const result = customDistanceLocale[token];

  if (typeof result === 'string') {
    return result.replace('{{count}}', count);
  }

  if (options.addSuffix) {
    if (options.comparison > 0) {
      return 'in ' + result.one.replace('{{count}}', count);
    } else {
      return result.other.replace('{{count}}', count);
    }
  } else {
     // Simple case without suffix (though formatDistanceToNowStrict uses suffix)
     // We'll return the 'other' form as a fallback.
     return result.other.replace('{{count}}', count);
  }
}

const localeWithAbbreviation = {
    formatDistance: formatDistanceLocale,
    // Include other locale properties if needed, but formatDistance is key
    localize: {}, // Assuming we don't need custom localization strings for now
    match: {}, // Assuming we don't need custom matching for now
    options: {},
};

const TopicStreamWidget = ({ 
  stream, 
  onDelete, 
  onUpdate, 
  isGridView, 
  onDragStart, 
  onDragEnd, 
  onDragOver, 
  onDrop, 
  isDraggedOver, 
  isDragging,
  isNewlyCreated = false,
  isSelected = false
}) => {
  const [summaries, setSummaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showDeepDive, setShowDeepDive] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [selectedSummary, setSelectedSummary] = useState(null);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showExportOptions, setShowExportOptions] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState('');

  // State for deleting the WHOLE stream (keep existing)
  const [showDeleteStreamConfirm, setShowDeleteStreamConfirm] = useState(false);

  const fetchSummaries = useCallback(async () => {
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
  }, [stream.id, stream.model_type]);

  useEffect(() => {
    fetchSummaries();
  }, [fetchSummaries]);

  const handleUpdateNow = async () => {
    try {
      setUpdating(true);
      setError('');

      const newSummary = await topicStreamAPI.updateNow(stream.id);

      if (newSummary.content && newSummary.content.includes("No new information is available")) {
        setError('No new information is available since the last update.');
      } else {
        setSummaries(prevSummaries => [newSummary, ...prevSummaries]);
      }
    } catch (err) {
      console.error('Failed to update stream:', err);
      setError(err.message || 'Failed to update stream. Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteStream = () => {
    console.log('🗑️ Delete stream button clicked for stream:', stream.id);
    setShowDeleteStreamConfirm(true);
  };

  const confirmDeleteStream = () => {
    console.log('✅ Delete stream confirmed for stream:', stream.id);
    console.log('🔄 Calling onDelete prop with stream ID:', stream.id);
    if (onDelete && typeof onDelete === 'function') {
    onDelete(stream.id);
    }
    setShowDeleteStreamConfirm(false);
  };

  const cancelDeleteStream = () => {
    setShowDeleteStreamConfirm(false);
  };

  const handleSummarySuccessfullyDeleted = (deletedSummaryId) => {
    console.log('📝 Summary successfully deleted:', deletedSummaryId);
    setSummaries(prevSummaries => {
      const newSummaries = prevSummaries.filter(s => s.id !== deletedSummaryId);
      console.log('📊 Updated summaries count:', newSummaries.length);
      return newSummaries;
    });
    setError('');
  };

  const handleSummaryDeletionError = (errorMessage) => {
    setError(errorMessage);
  };

  const handleAppendSummary = (newSummary) => {
    setSummaries(prevSummaries => [newSummary, ...prevSummaries]);
  };

  const handleDeepDive = (summary) => {
    setSelectedSummary(summary);
    setShowDeepDive(true);
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
        const lastUpdatedFormatted = format(parseISO(streamData.last_updated), 'MMM d, yyyy h:mm a');
        content += `*Last Updated:* ${lastUpdatedFormatted}\n`;
      }
      content += `\n---\n\n`;

      summariesData.forEach((summary, index) => {
        const createdAtFormatted = summary.created_at ? format(parseISO(summary.created_at), 'MMM d, yyyy h:mm a') : '';

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
         // Removed the extra separator inside the loop
         content += `\n---\n\n`;
      });

    } else { // txt format
       content += `${streamData.query}\n\n`;
      content += `Update Frequency: ${streamData.update_frequency}\n`;
      content += `Detail Level: ${streamData.detail_level}\n`;
        if (streamData.last_updated) {
        const lastUpdatedFormatted = format(parseISO(streamData.last_updated), 'MMM d, yyyy h:mm a');
        content += `Last Updated: ${lastUpdatedFormatted}\n`;
      }
      content += `\n---\n\n`;

      summariesData.forEach((summary, index) => {
        const createdAtFormatted = summary.created_at ? format(parseISO(summary.created_at), 'MMM d, yyyy h:mm a') : '';

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
    console.log(`[TopicStreamWidget] Attempting to export as ${formatType}`);
    try {
      console.log(`[TopicStreamWidget] Formatting content for ${formatType}...`);
      const content = formatStreamContent(stream, summaries, formatType);
      console.log(`[TopicStreamWidget] Content formatted. Length: ${content.length}`);

      console.log(`[TopicStreamWidget] Creating Blob... Type: ${formatType === 'md' ? 'text/markdown;charset=utf-8' : 'text/plain;charset=utf-8'}`);
      const blob = new Blob([content], { type: formatType === 'md' ? 'text/markdown;charset=utf-8' : 'text/plain;charset=utf-8' });
      console.log(`[TopicStreamWidget] Blob created.`);

      console.log(`[TopicStreamWidget] Creating object URL from Blob...`);
      const url = URL.createObjectURL(blob);
      console.log(`[TopicStreamWidget] Object URL created: ${url}`);

      const a = document.createElement('a');
      // Improve filename sanitization and provide a fallback
      const sanitizedQuery = (stream.query || 'untitled_stream').replace(/[\s\\\\/:*?"<>|]+/g, '_').substring(0, 50);
      const filename = `${sanitizedQuery}.${formatType}`;
      console.log(`[TopicStreamWidget] Generated filename: ${filename}`);

      a.href = url;
      a.download = filename;
      console.log('[TopicStreamWidget] Appending link to body and clicking...');
      document.body.appendChild(a);
      a.click();
      console.log('[TopicStreamWidget] Link clicked. Scheduling cleanup...');

      // Add a small setTimeout (e.g., 100ms) before revoking the object URL and removing the temporary anchor element.
      setTimeout(() => {
        console.log('[TopicStreamWidget] Executing cleanup...');
        if (document.body.contains(a)) { // Check if element still exists
          document.body.removeChild(a);
          console.log('[TopicStreamWidget] Link element removed from body.');
        } else {
           console.log('[TopicStreamWidget] Link element not found in body, likely already removed.');
        }
        URL.revokeObjectURL(url); // Clean up the object URL
        console.log(`[TopicStreamWidget] Cleaned up object URL: ${url}`);
      }, 100); // 100ms delay

    } catch (err) {
      console.error(`[TopicStreamWidget] Error during exportAsFile (${formatType}):`, err);
      setCopyFeedback(`Export failed: ${err.message || 'Unknown error'}`); // Or use a new state
      setTimeout(() => setCopyFeedback(''), 3000);
    }
  };

  if (!stream || !stream.id) {
    console.warn('TopicStreamWidget: Invalid stream prop received', stream);
    return null;
  }

  console.log(`TopicStreamWidget mounted/rendered for stream ID ${stream.id}. Total Stored Est Tokens from prop: ${stream.total_stored_est_tokens}`);

  // Calculate time since last update with safety check
  const lastUpdateTimestamp = summaries && summaries.length > 0 ? summaries[0].created_at : null;

  const timeSinceLastUpdate = lastUpdateTimestamp
    ? formatDistanceToNowStrict(parseISO(lastUpdateTimestamp), { addSuffix: true, locale: localeWithAbbreviation })
    : 'Never updated';

  return (
    <div 
      className={`${isGridView ? 'lg:col-span-1' : 'w-full'} bg-card border border-border rounded-xl overflow-hidden shadow-sm hover:shadow-lg hover:border-border/50 transition-all duration-300 ease-out group ${
        isDraggedOver ? 'border-primary bg-primary/5' : ''
      } ${isDragging ? 'opacity-50' : ''} ${isNewlyCreated ? 'new-stream-highlight' : ''} ${isSelected ? 'selected-stream' : ''}`}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      {showEditForm ? (
        <div className="p-6 bg-card animate-in slide-in-from-top-2 duration-300">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-foreground">Edit Topic Stream</h3>
            <div className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
              ID: {stream.id}
            </div>
          </div>
          <TopicStreamForm
            initialData={stream}
            onSubmit={handleEditSubmit}
            onCancel={() => setShowEditForm(false)}
            isEditing={true}
          />
        </div>
      ) : (
        <>
          {/* Header */}
          <div className="p-6 pb-4 border-b border-border/50">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-foreground leading-tight mb-2 group-hover:text-primary transition-colors">
                   {stream.query}
                 </h3>
                <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                  <div className="flex items-center space-x-1">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="3"/>
                      <path d="M12 1v6M12 17v6M5.64 5.64l4.24 4.24M14.12 14.12l4.24 4.24M1 12h6M17 12h6M5.64 18.36l4.24-4.24M14.12 9.88l4.24-4.24"/>
                    </svg>
                    <span className="capitalize">{stream.update_frequency}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14,2 14,8 20,8"/>
                    </svg>
                    <span className="capitalize">{stream.detail_level}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"/>
                      <polyline points="12,6 12,12 16,14"/>
                    </svg>
                    <span>{timeSinceLastUpdate}</span>
                  </div>
                 </div>
               </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-2">
                {/* Update Button */}
                <button
                  onClick={handleUpdateNow}
                  disabled={updating}
                  className="p-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 transition-all duration-200"
                  title="Update Now"
                >
                  {updating ? (
                    <OrbitalLoadingAnimation size="small" variant="orbital" />
                  ) : (
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M23 4v6h-6M1 20v-6h6"/>
                      <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10M22.99 14A9 9 0 0 1 18.36 18.36L14 14"/>
                    </svg>
                  )}
                </button>

                   {/* Edit Button */}
                   <button
                     onClick={handleEdit}
                  className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent hover:scale-105 active:scale-95 transition-all duration-200"
                     title="Edit Stream"
                   >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 20h9"/>
                    <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                      </svg>
                    </button>

                {/* Export Menu */}
                <div className="relative">
                      <button
                        onClick={() => setShowExportOptions(!showExportOptions)}
                    className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent hover:scale-105 active:scale-95 transition-all duration-200"
                    title="Export Options"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                      <polyline points="7,10 12,15 17,10"/>
                      <line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                      </button>

                      {showExportOptions && (
                    <div className="absolute right-0 top-full mt-2 w-48 bg-card border border-border rounded-lg shadow-lg z-20 animate-in slide-in-from-top-2 duration-200">
                      <div className="p-2">
                            <button
                          onClick={copyToClipboard}
                          className="w-full flex items-center space-x-2 px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors"
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                          </svg>
                          <span>Copy to Clipboard</span>
                            </button>
                            <button
                          onClick={() => exportAsFile('md')}
                          className="w-full flex items-center space-x-2 px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors"
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                            <polyline points="14,2 14,8 20,8"/>
                          </svg>
                          <span>Export as Markdown</span>
                            </button>
                            <button
                          onClick={() => exportAsFile('txt')}
                          className="w-full flex items-center space-x-2 px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors"
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                            <polyline points="14,2 14,8 20,8"/>
                          </svg>
                          <span>Export as Text</span>
                            </button>
                          </div>
                    </div>
                  )}
                </div>

                {/* Delete Stream Button - Big red X to distinguish from summary delete */}
                <div className="relative">
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log('🔴 Stream delete button clicked - Event details:', {
                        streamId: stream?.id,
                        hasOnDeleteProp: !!onDelete,
                        onDeleteType: typeof onDelete,
                        summariesCount: summaries?.length || 0,
                        timestamp: new Date().toISOString()
                      });
                      handleDeleteStream();
                    }}
                    className="p-2 rounded-lg text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30 hover:scale-110 active:scale-95 transition-all duration-200 border-2 border-red-300 dark:border-red-700 bg-red-50/50 dark:bg-red-900/10"
                    title="🗑️ DELETE ENTIRE STREAM (All summaries will be lost!)"
                    type="button"
                    disabled={false}
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <circle cx="12" cy="12" r="10"/>
                      <path d="M15 9l-6 6M9 9l6 6"/>
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* Copy Feedback */}
            {copyFeedback && (
              <Portal>
                <div 
                  className="fixed bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
                  style={{ 
                    position: 'fixed',
                    top: '0',
                    left: '0',
                    width: '100vw',
                    height: '100vh',
                    zIndex: 9999,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    pointerEvents: 'none' // Allow clicks to pass through overlay
                  }}
                >
                  <div 
                    className="bg-foreground text-background text-sm rounded shadow-lg animate-in slide-in-from-bottom-2 duration-200"
                    style={{
                      position: 'relative',
                      padding: '0.75rem 1rem',
                      pointerEvents: 'auto' // Re-enable clicks on content
                    }}
                  >
                    {copyFeedback}
                  </div>
                </div>
              </Portal>
            )}
          </div>

          {/* Error section */}
          {error && !showDeleteStreamConfirm && (
            <div className="p-4 bg-destructive/10 border-l-4 border-destructive text-destructive">
              <p>{error}</p>
              <button onClick={() => setError('')} className="text-sm underline mt-1 text-destructive-foreground hover:text-destructive/80">Dismiss</button>
            </div>
          )}

          <div className="divide-y divide-border">
            {loading ? (
              <div className="p-4 text-center text-muted-foreground">Loading summaries...</div>
            ) : summaries.length === 0 && !error ? (
              <div className="p-4 text-center text-muted-foreground">
                No summaries yet. Click "Update Now" to generate one.
              </div>
            ) : (
              summaries.map((summary) => (
                <div key={summary.id} className="p-2">
                  <h4 className="text-md font-medium text-foreground mb-2">Summary</h4>
                  {/* Timestamp, Model, and Summary Actions */}
                  <div className="flex flex-wrap gap-2 items-center mb-2">
                    {/* Timestamp Badge */}
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-muted text-black dark:text-white font-medium">
                      {summary.created_at ? format(parseISO(summary.created_at), 'MMM d, yyyy h:mm a') : ''}
                    </span>
                    {/* Model Badge - Ensure model exists before rendering */}
                    {summary.model && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-black bg-[#6495ed] dark:text-black">{summary.model}</span>
                    )}

                    {/* Summary Actions - Deep Dive Chat and Delete */}
                    <div className="flex space-x-2 items-center ml-auto pr-1"> {/* Added ml-auto to push to the right */}
                       <button
                        onClick={() => handleDeepDive(summary)}
                        className="text-xs p-1 rounded-md text-white bg-[#2ccebb] hover:opacity-90 transition-colors"
                        title="Deep Dive Chat"
                      >
                        <img src="/deepdivechat.svg" alt="Deep Dive Chat" className="h-6 w-6" />
                      </button>
                       <SummaryDeleteButton
                        streamId={stream.id}
                        summaryId={summary.id}
                        onSummaryDeleted={handleSummarySuccessfullyDeleted}
                        onError={handleSummaryDeletionError}
                        isIconOnly={true}
                      />
                    </div>
                  </div>
                  {/* Summary Content */}
                  <div className="px-2 py-1">
                    {/* Thoughts (experimental) section */}
                    {summary.thoughts && (
                      <div className="mb-4 p-3 rounded-md bg-muted dark:bg-[#4b4a49]">
                        <div className="text-sm font-medium text-muted-foreground mb-2">
                          Thoughts (experimental)
                        </div>
                        <div className="prose prose-sm max-w-none dark:prose-invert">
                          <MarkdownRenderer content={summary.thoughts} />
                        </div>
                      </div>
                    )}
                    {/* Removed truncation class and logic */}
                    <div className={`prose prose-sm max-w-none dark:prose-invert px-2`}>
                      <MarkdownRenderer content={summary.content || ''} />
                    </div>
                  </div>

                  {/* Summary Sources */}
                  {summary.sources && summary.sources.length > 0 && (
                    <div className="px-2 pb-2">
                      <div className="text-xs font-medium text-muted-foreground mb-1">Sources:</div>
                      <div className="flex flex-wrap gap-1">
                        {summary.sources.map((source, index) => (
                          <a
                            key={index}
                            href={typeof source === 'string' ? source : (source.url || source.name || source)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-muted-foreground bg-muted hover:bg-muted/80 px-2 py-1 rounded-full truncate max-w-[200px]"
                            title={typeof source === 'string' ? source : (source.url || source)}
                          >
                            {typeof source === 'string'
                              ? source
                              : (source.name || source.url || source)}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* New block to display token statistics - place this after summary content/sources */}
                  {(summary.prompt_tokens !== null || summary.completion_tokens !== null || summary.total_tokens !== null || summary.estimated_content_tokens !== null) && (
                    <div className="mt-2 pt-2 border-t border-border/50 px-2 text-xs text-muted-foreground"> {/* Container for both lines */}
                      
                      {/* Line 1: API Token Usage */}
                      {(summary.prompt_tokens !== null || summary.completion_tokens !== null || summary.total_tokens !== null) && (
                        <div className="flex flex-wrap items-center gap-x-2"> {/* gap-x-2 for space between items */}
                          <span className="font-semibold text-foreground/80">API Usage:</span> {/* Bolder label */}
                          
                          {summary.prompt_tokens !== null && (
                            <span title="Tokens in the prompt sent to the API (includes query, system prompt, and previous context if any)">
                              Input: {summary.prompt_tokens}
                            </span>
                          )}
                          
                          {summary.completion_tokens !== null && (
                            <>
                              {summary.prompt_tokens !== null && <span className="text-muted-foreground/60 mx-1">|</span>} {/* Conditional separator */}
                              <span title="Tokens generated by the AI model as the response content">
                                Output: {summary.completion_tokens}
                              </span>
                            </>
                          )}

                          {summary.total_tokens !== null && (
                            <>
                              {(summary.prompt_tokens !== null || summary.completion_tokens !== null) && <span className="text-muted-foreground/60 mx-1">|</span>} {/* Conditional separator */}
                              <span title="Total tokens processed by the API for this call (prompt + completion)">
                                Total: {summary.total_tokens} tokens
                              </span>
                            </>
                          )}
                        </div>
                      )}

                      {/* Line 2: Estimated Content Tokens */}
                      {summary.estimated_content_tokens !== null && (
                        <div className={`${(summary.prompt_tokens !== null || summary.completion_tokens !== null || summary.total_tokens !== null) ? 'mt-0.5' : ''}`}> {/* Add top margin only if API usage is also shown */}
                          <span className="text-foreground/80">(Content Est: ~{summary.estimated_content_tokens} tokens)</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {showDeepDive && selectedSummary && (
            <Portal>
              <div 
                className="fixed bg-background/75" 
                style={{ 
                  position: 'fixed',
                  top: '0',
                  left: '0',
                  width: '100vw',
                  height: '100vh',
                  zIndex: 9999,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '1rem'
                }}
              >
                <div 
                  className="bg-card rounded-lg shadow-xl overflow-hidden flex flex-col"
                  style={{
                    position: 'relative',
                    width: '100%',
                    height: '90vh',
                    maxWidth: '100rem',
                    margin: '0'
                  }}
                >
                <div className="p-4 border-b border-border flex justify-between items-center">
                  <h3 className="text-lg font-medium text-foreground truncate flex-1 min-w-0">
                    Deep Dive: {stream.query}
                  </h3>
                  <button
                    onClick={() => setShowDeepDive(false)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                      <svg 
                        className="h-6 w-6" 
                        viewBox="0 0 24 24" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="2" 
                        strokeLinecap="round" 
                        strokeLinejoin="round"
                      >
                        <path d="M18 6L6 18M6 6l12 12"/>
                    </svg>
                  </button>
                </div>

                {/* Main content area with two columns */}
                <div className="flex flex-1 overflow-hidden flex-row">
                  {/* Original Summary Section - Left Column */}
                  <div className="flex-1 basis-1/2 p-4 border-r border-border overflow-y-auto">
                    <h4 className="text-md font-medium text-foreground mb-2">Original Summary</h4>
                    <div className="text-sm text-muted-foreground mb-2">
                        {selectedSummary.created_at ? format(parseISO(selectedSummary.created_at), 'MMM d, yyyy h:mm a') : ''} • Model: {selectedSummary.model_type}
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
            </Portal>
          )}

          {showDeleteStreamConfirm && (
            <Portal>
              <div 
                className="fixed inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" 
                style={{ 
                  position: 'fixed',
                  top: '0',
                  left: '0',
                  width: '100vw',
                  height: '100vh',
                  zIndex: 9999,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '1rem'
                }}
                onClick={cancelDeleteStream}
              >
                <div 
                  className="bg-card rounded-lg p-6 shadow-xl" 
                  style={{
                    position: 'relative',
                    width: '100%',
                    maxWidth: '32rem',
                    maxHeight: '90vh',
                    margin: '0',
                    overflow: 'auto'
                  }}
                  onClick={e => e.stopPropagation()}
                >
                <h3
                  className="text-lg font-medium text-foreground mb-4"
                  style={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    display: 'block'
                  }}
                  title={stream.query}
                >
                  Delete Topic Stream: {stream.query}
                </h3>
                <p className="text-muted-foreground mb-6">
                  Are you sure you want to delete this topic stream? This action cannot be undone, and all associated summaries will be permanently deleted.
                </p>
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={cancelDeleteStream}
                    className="px-4 py-2 text-sm font-medium text-foreground bg-muted rounded-md hover:bg-muted/80"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmDeleteStream}
                    className="px-4 py-2 text-sm font-medium text-destructive-foreground bg-destructive rounded-md hover:bg-destructive/90"
                  >
                    Delete Stream
                  </button>
                </div>
              </div>
            </div>
            </Portal>
          )}
        </>
      )}
    </div>
  );
};

export default TopicStreamWidget;