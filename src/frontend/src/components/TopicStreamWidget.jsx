import React, { useState, useEffect, useCallback } from 'react';
import { topicStreamAPI } from '../services/api';
import { format, formatDistanceToNowStrict, parseISO } from 'date-fns';
import { formatInTimeZone, utcToZonedTime as toZonedTime } from 'date-fns-tz';
import DeepDiveChat from './DeepDiveChat';
import MarkdownRenderer from './MarkdownRenderer';
import SummaryDeleteButton from './SummaryDeleteButton';
import TopicStreamForm from './TopicStreamForm';
import { useTheme } from '../context/ThemeContext';

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

const TopicStreamWidget = ({ stream, onDelete, onUpdate, isGridView = false }) => {
  // Add animation state
  const [animateIn, setAnimateIn] = useState(false);
  
  // Component states
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [summaries, setSummaries] = useState([]);
  const [loadingSummaries, setLoadingSummaries] = useState(true);
  const [apiError, setApiError] = useState('');
  const [expandedSummaryId, setExpandedSummaryId] = useState(null);
  const [showDeepDiveChat, setShowDeepDiveChat] = useState(false);
  const [selectedSummaryId, setSelectedSummaryId] = useState(null);
  const { theme } = useTheme();
  
  // Add missing state declarations
  const [totalStoredEstTokens, setTotalStoredEstTokens] = useState(0);
  const [copyFeedback, setCopyFeedback] = useState('');

  // Trigger animation on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimateIn(true);
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  // Function to fetch summaries
  const fetchSummaries = useCallback(async () => {
    try {
      setLoadingSummaries(true);
      setApiError('');
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
      setApiError('Failed to load summaries. Please try refreshing.');
    } finally {
      setLoadingSummaries(false);
    }
  }, [stream.id]);

  useEffect(() => {
    fetchSummaries();
  }, [stream.id]);

  // Update total stored tokens when the stream prop changes (e.g., after update)
  useEffect(() => {
    setTotalStoredEstTokens(stream.total_stored_est_tokens || 0);
  }, [stream.total_stored_est_tokens]);

  const handleUpdateNow = async () => {
    try {
      setUpdating(true);
      setApiError('');

      const newSummary = await topicStreamAPI.updateNow(stream.id);

      if (newSummary.content && newSummary.content.includes("No new information is available")) {
        setApiError('No new information is available since the last update.');
      } else {
        setSummaries([newSummary, ...summaries]);
      }
    } catch (err) {
      console.error('Failed to update stream:', err);
      setApiError(err.message || 'Failed to update stream. Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteStream = () => {
    setShowConfirmDelete(true);
  };

  const confirmDeleteStream = () => {
    onDelete(stream.id);
    setShowConfirmDelete(false);
  };

  const cancelDeleteStream = () => {
    setShowConfirmDelete(false);
  };

  const handleSummarySuccessfullyDeleted = (deletedSummaryId) => {
    setSummaries(prevSummaries => prevSummaries.filter(s => s.id !== deletedSummaryId));
    setApiError('');
  };

  const handleSummaryDeletionError = (errorMessage) => {
    setApiError(errorMessage);
  };

  const handleAppendSummary = (newSummary) => {
    setSummaries([newSummary, ...summaries]);
  };

  const handleDeepDive = (summary) => {
    setSelectedSummaryId(summary.id);
    setShowDeepDiveChat(true);
  };

  const toggleExpandSummary = (id) => {
    if (expandedSummaryId === id) {
      setExpandedSummaryId(null);
    } else {
      setExpandedSummaryId(id);
    }
  };

  const handleEdit = () => {
    setEditMode(true);
  };

  const handleEditSubmit = async (formData) => {
    try {
      await onUpdate(stream.id, formData);
      setEditMode(false);
      setApiError('');
    } catch (err) {
      console.error('Failed to update stream:', err);
      setApiError(err.message || 'Failed to update stream. Please try again.');
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
         // Removed the extra separator inside the loop
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

  if (!stream) {
    return null;
  }

  console.log(`TopicStreamWidget mounted/rendered for stream ID ${stream.id}. Total Stored Est Tokens from prop: ${stream.total_stored_est_tokens}`);

  // Calculate time since last update
  const lastUpdateTimestamp = summaries.length > 0 ? summaries[0].created_at : null;

  // Get user's local time zone
  const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  console.log('User Time Zone:', userTimeZone);

  const timeSinceLastUpdate = lastUpdateTimestamp
    ? formatDistanceToNowStrict(toZonedTime(parseISO(lastUpdateTimestamp + 'Z'), userTimeZone), { addSuffix: true, locale: localeWithAbbreviation })
    : 'Never updated';

  return (
    <div 
      className={`${
        isGridView ? 'h-full' : ''
      } bg-card rounded-lg shadow-sm border border-border overflow-hidden transition-all duration-300 ease-in-out transform ${
        animateIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
    >
      {/* Stream header */}
      <div className="relative">
        <div className="p-4 border-b border-border bg-card sticky top-0 z-10">
          <div className="flex items-start justify-between">
            <div className="mr-2 flex-1">
              {editMode ? (
          <TopicStreamForm
            initialData={stream}
            onSubmit={handleEditSubmit}
                  onCancel={() => setEditMode(false)}
            isEditing={true}
          />
      ) : (
                <h2 
                  className="text-lg font-semibold text-foreground mb-1 line-clamp-2 transition-all duration-300" 
                  title={stream.query}
                >
                   {stream.query}
                </h2>
              )}
              
              <div className="flex flex-wrap gap-2 mt-2 transition-all duration-300 ease-in-out">
                {/* Badges */}
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-foreground transition-all duration-300 ease-in-out transform hover:scale-105">
                       {stream.update_frequency}
                     </span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-foreground transition-all duration-300 ease-in-out transform hover:scale-105">
                       {stream.detail_level}
                     </span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-foreground transition-all duration-300 ease-in-out transform hover:scale-105">
                  Model: {stream.model || 'sonar-small-chat'}
                   </span>
                
                {/* Last updated info */}
                {stream.last_updated && (
                  <span 
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-foreground bg-muted transition-all duration-300 ease-in-out transform hover:scale-105" 
                    title={`Last updated: ${formatInTimeZone(toZonedTime(new Date(stream.last_updated), Intl.DateTimeFormat().resolvedOptions().timeZone), Intl.DateTimeFormat().resolvedOptions().timeZone, 'MMM d, yyyy h:mm a')}`}
                  >
                    Updated: {formatInTimeZone(toZonedTime(new Date(stream.last_updated), Intl.DateTimeFormat().resolvedOptions().timeZone), Intl.DateTimeFormat().resolvedOptions().timeZone, 'MMM d, h:mm a')}
                     </span>
                   )}
                 </div>
               </div>

            {/* Action buttons */}
            <div className="flex flex-shrink-0 space-x-2 transition-all duration-300 ease-in-out">
                   <button
                className="p-2 text-muted-foreground hover:text-foreground bg-muted/50 hover:bg-muted rounded transition-all duration-300 ease-in-out transform hover:scale-105 active:scale-95"
                onClick={() => setShowSettings(true)}
                title="Stream settings"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                      </svg>
                    </button>
                    <button
                className="p-2 text-muted-foreground hover:text-foreground bg-muted/50 hover:bg-muted rounded transition-all duration-300 ease-in-out transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={handleUpdateNow}
                      disabled={updating}
                title="Update now"
              >
                {updating ? (
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                )}
                     </button>
            </div>
          </div>

          {/* Settings panel */}
          {showSettings && (
            <div className="mt-2 py-2 px-2 rounded bg-muted animate-bounce-in">
              <div className="flex flex-wrap gap-2">
                     <button
                  onClick={() => {
                    setShowSettings(false);
                    setEditMode(true);
                  }}
                  className="px-2 py-1 text-xs bg-muted hover:bg-muted/80 rounded text-foreground transition-all duration-300 ease-in-out transform hover:scale-105 active:scale-95"
                            >
                  Edit
                            </button>
                            <button
                  onClick={() => {
                    setShowConfirmDelete(true);
                    setShowSettings(false);
                  }}
                  className="px-2 py-1 text-xs bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded transition-all duration-300 ease-in-out transform hover:scale-105 active:scale-95"
                            >
                  Delete
                            </button>
                          </div>
                        </div>
                      )}
          
          {/* Confirmation dialog */}
          {showConfirmDelete && (
            <div className="mt-2 p-3 border border-destructive bg-destructive/10 text-destructive rounded animate-bounce-in">
              <p className="text-sm mb-2">Are you sure you want to delete this topic stream?</p>
              <div className="flex justify-end space-x-2">
                  <button
                  onClick={() => setShowConfirmDelete(false)}
                  className="px-2 py-1 text-xs bg-muted hover:bg-muted/80 text-foreground rounded transition-all duration-300 ease-in-out transform hover:scale-105 active:scale-95"
                  >
                  Cancel
                  </button>
                  <button
                  onClick={() => {
                    onDelete(stream.id);
                    setShowConfirmDelete(false);
                  }}
                  className="px-2 py-1 text-xs bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded transition-all duration-300 ease-in-out transform hover:scale-105 active:scale-95"
                >
                  Delete
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
          </div>

      {/* Summaries section */}
      <div className="p-4 pt-1">
        {apiError && (
          <div className="mb-4 p-3 bg-destructive/10 text-destructive border border-destructive rounded transition-all duration-300 ease-in-out">
            <p className="text-sm">{apiError}</p>
            <button
              onClick={() => setApiError('')}
              className="float-right font-bold"
              aria-label="Dismiss error"
            >
              ×
            </button>
            </div>
          )}

        {loadingSummaries ? (
          <div className="flex justify-center items-center py-10">
            <div className="animate-pulse flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                <svg className="animate-spin h-6 w-6 text-primary/60" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">Loading summaries...</p>
            </div>
          </div>
        ) : summaries.length === 0 ? (
          <div className="py-8 px-4 text-center animate-bounce-in">
            <p className="text-muted-foreground">No summaries yet. Click "Update now" to generate your first summary.</p>
              </div>
            ) : (
          <ul className="space-y-6">
            {summaries.map((summary, index) => (
              <li 
                key={summary.id} 
                className="border-b border-border pb-6 last:border-b-0 last:pb-0 transition-all duration-300 ease-in-out" 
                style={{
                  transitionDelay: `${index * 100}ms`,
                  animation: `slideIn 0.3s ease-out ${index * 100}ms forwards`,
                  opacity: 0
                }}
              >
                {/* Summary content */}
                <div className="mb-2 flex justify-between items-start">
                  <span className="text-xs text-muted-foreground">
                    {formatInTimeZone(toZonedTime(new Date(summary.created_at), Intl.DateTimeFormat().resolvedOptions().timeZone), Intl.DateTimeFormat().resolvedOptions().timeZone, 'MMMM d, yyyy h:mm a')}
                    </span>

                       <button
                    onClick={() => {
                      setSelectedSummaryId(summary.id);
                      setShowDeepDiveChat(true);
                    }}
                    className="text-xs bg-[#2ccebb] text-white px-2 py-1 rounded-full hover:bg-[#2ccebb]/90 transition-all duration-300 ease-in-out transform hover:scale-105 active:scale-95"
                  >
                    Deep Dive Chat
                      </button>
                    </div>
                
                {/* Thoughts section (if available) */}
                    {summary.thoughts && (
                  <div className="mb-4 p-3 rounded-md bg-muted dark:bg-muted/60 transition-all duration-300 ease-in-out">
                    <div className="text-sm font-medium text-muted-foreground mb-1">
                          Thoughts (experimental)
                        </div>
                        <div className="prose prose-sm max-w-none dark:prose-invert">
                          <MarkdownRenderer content={summary.thoughts} />
                        </div>
                      </div>
                    )}
                
                {/* Main summary content */}
                <div className={`prose prose-sm max-w-none dark:prose-invert transition-all duration-300 ease-in-out ${
                  expandedSummaryId === summary.id ? '' : 'line-clamp-10'
                }`}>
                  <MarkdownRenderer content={summary.content} />
                  </div>

                {/* Expand/collapse button */}
                {summary.content && summary.content.split('\n').length > 10 && (
                  <button
                    onClick={() => toggleExpandSummary(summary.id)}
                    className="text-xs text-muted-foreground hover:text-foreground mt-2 transition-all duration-300 ease-in-out transform hover:scale-105 active:scale-95"
                  >
                    {expandedSummaryId === summary.id ? 'Show less' : 'Read more'}
                  </button>
                )}
                
                {/* Sources section */}
                  {summary.sources && summary.sources.length > 0 && (
                  <div className="mt-4 transition-all duration-300 ease-in-out">
                    <p className="text-xs text-muted-foreground mb-1">Sources:</p>
                      <div className="flex flex-wrap gap-1">
                      {summary.sources.map((source, idx) => (
                          <a
                          key={idx}
                          href={typeof source === 'string' ? source : source.url}
                            target="_blank"
                            rel="noopener noreferrer"
                          className="text-xs text-muted-foreground bg-muted hover:bg-muted/80 px-2 py-1 rounded-full truncate max-w-[200px] transition-all duration-300 ease-in-out transform hover:scale-105"
                          title={typeof source === 'string' ? source : source.url || source}
                          >
                            {typeof source === 'string'
                            ? new URL(source).hostname
                            : source.name || new URL(source.url).hostname}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
              </li>
            ))}
          </ul>
            )}
          </div>

      {/* Deep Dive Chat modal */}
      {showDeepDiveChat && selectedSummaryId && (
        <div className="fixed inset-0 z-50 bg-background/75 flex items-center justify-center transition-opacity duration-300 ease-in-out animate-fade-in">
          <div className="bg-card rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col animate-bounce-in" style={{ maxWidth: '1400px' }}>
            {/* Modal header */}
                <div className="p-4 border-b border-border flex justify-between items-center">
              <h3 className="text-lg font-medium text-foreground">
                    Deep Dive: {stream.query}
                  </h3>
                  <button
                onClick={() => setShowDeepDiveChat(false)}
                className="text-muted-foreground hover:text-foreground transition-colors duration-300 transform hover:rotate-90"
                  >
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

            {/* Modal content */}
            <div className="flex overflow-hidden flex-row w-full h-[80vh]">
                  {/* Original Summary Section - Left Column */}
              <div className="p-4 border-r border-border overflow-y-auto flex-1">
                    <h4 className="text-md font-medium text-foreground mb-2">Original Summary</h4>
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <MarkdownRenderer content={summaries.find(s => s.id === selectedSummaryId)?.content || ''} />
                    </div>
                  </div>

                  {/* Deep Dive Chat Section - Right Column */}
              <div className="p-4 border-l border-border overflow-y-auto flex-1">
                    <DeepDiveChat
                      topicStreamId={stream.id}
                  summaryId={selectedSummaryId}
                      topic={stream.query}
                  onAppend={() => {
                    // Handle new summary creation if needed
                  }}
                    />
                  </div>
                </div>
              </div>
            </div>
      )}
    </div>
  );
};

export default TopicStreamWidget;