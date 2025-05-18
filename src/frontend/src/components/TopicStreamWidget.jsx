import React, { useState, useEffect } from 'react';
import { topicStreamAPI } from '../services/api';
import { format, formatDistanceToNowStrict, parseISO } from 'date-fns';
import { formatInTimeZone, toZonedTime } from 'date-fns-tz';
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

  // State for token count
  const [totalStoredEstTokens, setTotalStoredEstTokens] = useState(0);

  // State for override checkbox
  const [ignorePreviousForThisUpdateOverride, setIgnorePreviousForThisUpdateOverride] = useState(false);

  const theme = useTheme();

  useEffect(() => {
    fetchSummaries();
  }, [stream.id]);

  useEffect(() => {
    // Calculate total estimated content tokens from fetched summaries
    if (summaries && summaries.length > 0) {
        const sumOfEstTokens = summaries.reduce((acc, s) => acc + (s.estimated_content_tokens || 0), 0);
        setTotalStoredEstTokens(sumOfEstTokens);
    } else {
        setTotalStoredEstTokens(0);
    }
  }, [summaries]);

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

      const options = { 
          ignore_all_previous_summaries_override: ignorePreviousForThisUpdateOverride 
      };
      const newSummary = await topicStreamAPI.updateNow(stream.id, options);

      if (newSummary.content && newSummary.content.includes("No new information is available")) {
        setError('No new information is available since the last update.');
      } else {
        setSummaries([newSummary, ...summaries]);
      }
      setIgnorePreviousForThisUpdateOverride(false); // Reset override after use
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
    ? formatDistanceToNowStrict(toZonedTime(parseISO(lastUpdateTimestamp + 'Z'), userTimeZone), { addSuffix: true, locale: localeWithAbbreviation })
    : 'Never updated';

  return (
    <div className={`${isGridView ? 'lg:col-span-1' : 'w-full'} bg-card border border-border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200`}>
      {showEditForm ? (
        <div className="p-4 bg-card">
          <h3 className="text-lg font-medium text-foreground mb-4">Edit Topic Stream</h3>
          <div className="text-xs text-muted-foreground mb-4">Stream ID: {stream.id}</div>
          <TopicStreamForm
            initialData={stream}
            onSubmit={handleEditSubmit}
            onCancel={() => setShowEditForm(false)}
            isEditing={true}
          />
        </div>
      ) : (
        <>
          <div className="p-4 border-b border-border flex flex-col">
            <div className="flex justify-between items-start">
              <div className={`${isGridView ? 'w-full' : 'flex-1 min-w-0 mr-4'}`}>
                <h3 className={`text-lg font-semibold text-foreground ${isGridView ? 'line-clamp-3' : 'truncate'}`}>
                   {stream.query}
                 </h3>
                 {/* Tags and timestamp - Render based on isGridView */}
                 <div className="flex flex-wrap gap-2 mt-2"> {/* Consistent tag layout */}
                   {stream.update_frequency && (
                     <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs text-black bg-[#a1c9f2] dark:text-black">
                       {stream.update_frequency}
                     </span>
                   )}
                   {/* Detail Level Badge */}
                   {stream.detail_level && (
                     <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs text-black bg-[#25b6a5] dark:text-black">
                       {stream.detail_level}
                     </span>
                   )}
                   {/* Model Badge */}
                   <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs text-black bg-[#6495ed] flex-shrink-0 dark:text-black">{/* flex-shrink-0 */}
                     {stream.model_type}
                   </span>
                   {/* Time Since Last Update - Keep with other badges */}
                   <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs text-black bg-[#818cf8] dark:text-black">
                     {timeSinceLastUpdate}
                   </span>
                 </div>
               </div>

               {/* Action Buttons - Render based on isGridView */}
               {!isGridView && (
                 <div className="flex space-x-1 items-center relative flex-shrink-0 justify-end"> {/* Show only in non-grid view, aligned right */}
                   {/* Edit Button */}
                   <button
                     onClick={handleEdit}
                     className="p-1 rounded bg-muted text-foreground hover:bg-muted/80 transition-colors"
                     title="Edit Stream"
                   >
                      {/* Pencil Icon */}
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                      </svg>
                    </button>

                    {/* Update Now Button */}
                    <button
                      onClick={handleUpdateNow}
                      disabled={updating}
                      className={`p-1 rounded bg-primary text-primary-foreground hover:bg-primary/90 transition-colors ${updating ? 'opacity-50 cursor-not-allowed' : ''}`}
                      title={updating ? 'Updating...' : 'Update Now'}
                    >
                       {/* Using SVG file from public folder */}
                       <img src="/icons8-refresh.svg" alt="Refresh" className={`h-4 w-4 ${updating ? 'animate-spin' : ''}`} />
                     </button>

                     {/* Delete Button */}
                     <button
                       onClick={handleDeleteStream}
                       className="p-1 rounded bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"
                       title="Delete Stream"
                     >
                        {/* Using trashcan SVG file from public folder */}
                        <img src="/icons8-trash-can.svg" alt="Delete Stream" className="h-4 w-4" />
                      </button>

                      {/* Export Button */}
                      <button
                        onClick={() => setShowExportOptions(!showExportOptions)}
                        className="py-1 px-2 rounded bg-muted text-foreground hover:bg-muted/80 transition-colors text-xs"
                      >
                        Export
                      </button>

                      {/* Export Options Dropdown */}
                      {showExportOptions && (
                        <div className="absolute right-0 top-full mt-1 w-48 bg-popover rounded-md shadow-lg z-10"> {/* Position relative to button */}
                          <div className="py-1" role="menu" aria-orientation="vertical" aria-labelledby="options-menu">
                            <button
                              onClick={() => { copyToClipboard(); setShowExportOptions(false); }}
                              className="block w-full text-left px-4 py-2 text-sm text-foreground hover:bg-muted/80"
                              role="menuitem"
                            >
                              Copy to Clipboard
                            </button>
                            <button
                              onClick={() => { exportAsFile('md'); setShowExportOptions(false); }}
                              className="block w-full text-left px-4 py-2 text-sm text-foreground hover:bg-muted/80"
                              role="menuitem"
                            >
                              Export as .md
                            </button>
                            <button
                              onClick={() => { exportAsFile('txt'); setShowExportOptions(false); }}
                              className="block w-full text-left px-4 py-2 text-sm text-foreground hover:bg-muted/80"
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

            {/* Token count for List View - Below buttons, inside header, right aligned */}
            {!isGridView && (totalStoredEstTokens > 0 || !loading) && (
              <div className="flex justify-end mt-2"> {/* Container to align tag to the right */}
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs text-black bg-[#a1c9f2] dark:text-black">
                  Estimated Stream Tokens: {totalStoredEstTokens}
                </span>
              </div>
            )}

            {/* Action buttons for grid view, placed below title/tags */}
            {isGridView && (
              <div className="flex items-center justify-between mt-2 w-full"> {/* Container for token counter and buttons */} 
                {/* Token count for Grid View - Left aligned */}
                {(totalStoredEstTokens > 0 || !loading) && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs text-black bg-[#a1c9f2] dark:text-black">
                    Estimated Stream Tokens: {totalStoredEstTokens}
                  </span>
                )}
                {/* Action Buttons for Grid View - Right aligned */} 
                <div className="flex space-x-1 items-center flex-shrink-0"> {/* Container for the buttons */}
                   {/* Edit Button */}
                   <button
                     onClick={handleEdit}
                     className="p-1 rounded bg-muted text-foreground hover:bg-muted/80 transition-colors"
                     title="Edit Stream"
                   >
                      {/* Pencil Icon */}
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                      </svg>
                    </button>

                    {/* Update Now Button */}
                    <button
                      onClick={handleUpdateNow}
                      disabled={updating}
                      className={`p-1 rounded bg-primary text-primary-foreground hover:bg-primary/90 transition-colors ${updating ? 'opacity-50 cursor-not-allowed' : ''}`}
                      title={updating ? 'Updating...' : 'Update Now'}
                    >
                       {/* Using SVG file from public folder */}
                       <img src="/icons8-refresh.svg" alt="Refresh" className={`h-4 w-4 ${updating ? 'animate-spin' : ''}`} />
                    </button>

                    {/* Delete Button */}
                    <button
                      onClick={handleDeleteStream}
                      className="p-1 rounded bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"
                      title="Delete Stream"
                    >
                       {/* Using trashcan SVG file from public folder */}
                       <img src="/icons8-trash-can.svg" alt="Delete Stream" className="h-4 w-4" />
                    </button>

                    {/* Export Button */}
                    <button
                      onClick={() => setShowExportOptions(!showExportOptions)}
                      className="py-1 px-2 rounded bg-muted text-foreground hover:bg-muted/80 transition-colors text-xs"
                    >
                      Export
                    </button>

                    {/* Export Options Dropdown */}
                    {showExportOptions && (
                      <div className="absolute right-0 top-full mt-1 w-48 bg-popover rounded-md shadow-lg z-10"> {/* Position relative to button */}
                        <div className="py-1" role="menu" aria-orientation="vertical" aria-labelledby="options-menu">
                          <button
                            onClick={() => { copyToClipboard(); setShowExportOptions(false); }}
                            className="block w-full text-left px-4 py-2 text-sm text-foreground hover:bg-muted/80"
                            role="menuitem"
                          >
                            Copy to Clipboard
                          </button>
                          <button
                            onClick={() => { exportAsFile('md'); setShowExportOptions(false); }}
                            className="block w-full text-left px-4 py-2 text-sm text-foreground hover:bg-muted/80"
                            role="menuitem"
                          >
                            Export as .md
                          </button>
                          <button
                            onClick={() => { exportAsFile('txt'); setShowExportOptions(false); }}
                            className="block w-full text-left px-4 py-2 text-sm text-foreground hover:bg-muted/80"
                            role="menuitem"
                          >
                            Export as .txt
                          </button>
                        </div>
                      </div>
                    )}
                </div>
              </div>
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
                      {summary.created_at ? formatInTimeZone(toZonedTime(parseISO(summary.created_at + 'Z'), Intl.DateTimeFormat().resolvedOptions().timeZone), Intl.DateTimeFormat().resolvedOptions().timeZone, 'MMM d, yyyy h:mm a') : ''}
                    </span>
                    {/* Model Badge - Ensure model_type exists before rendering */}
                    {summary.model_type && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-black bg-[#6495ed] dark:text-black">{summary.model_type}</span>
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

                  {(summary.prompt_tokens !== null || summary.completion_tokens !== null || summary.total_tokens !== null) && (
                    <div className="mt-1 px-2 text-xs text-muted-foreground/80">
                      API Usage:
                      {summary.prompt_tokens !== null && ` P: ${summary.prompt_tokens}`}
                      {summary.completion_tokens !== null && ` | C: ${summary.completion_tokens}`}
                      {summary.total_tokens !== null && ` | Total: ${summary.total_tokens} tokens`}
                    </div>
                  )}
                  {summary.estimated_content_tokens !== null && (
                    <div className="mt-0.5 px-2 text-xs text-muted-foreground/70">
                      (Content Est: {summary.estimated_content_tokens} tokens)
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {showDeepDive && selectedSummary && (
            <div className="fixed inset-0 z-50 bg-background/75 flex items-center justify-center p-4">
              <div className="bg-card rounded-lg shadow-xl w-full max-h-[90vh] overflow-hidden flex flex-col max-w-7xl">
                <div className="p-4 border-b border-border flex justify-between items-center">
                  <h3 className="text-lg font-medium text-foreground truncate flex-1 min-w-0">
                    Deep Dive: {stream.query}
                  </h3>
                  <button
                    onClick={() => setShowDeepDive(false)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Main content area with two columns */}
                <div className="flex flex-1 overflow-hidden flex-row">
                  {/* Original Summary Section - Left Column */}
                  <div className="flex-1 basis-1/2 p-4 border-r border-border overflow-y-auto">
                    <h4 className="text-md font-medium text-foreground mb-2">Original Summary</h4>
                    <div className="text-sm text-muted-foreground mb-2">
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
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/75" onClick={cancelDeleteStream}>
              <div className="bg-card rounded-lg p-6 max-w-md w-full shadow-xl" onClick={e => e.stopPropagation()}>
                <h3
                  className="text-lg font-medium text-foreground mb-4"
                  style={{
                    width: 'calc(100% - 40px)',
                    maxWidth: 'calc(100% - 40px)',
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
          )}

          {/* Display copy feedback */}
          {copyFeedback && (
            <div className="absolute bottom-4 right-4 px-3 py-2 bg-foreground text-background text-sm rounded shadow-lg z-50">
              {copyFeedback}
            </div>
          )}

          {/* In the header section of TopicStreamWidget, after other buttons */}
          <div className="mt-2 flex items-center self-start w-full"> {/* self-start to align left if in a flex container */}
              <input
                  type="checkbox"
                  id={`ignore-previous-override-${stream.id}`}
                  checked={ignorePreviousForThisUpdateOverride}
                  onChange={(e) => setIgnorePreviousForThisUpdateOverride(e.target.checked)}
                  className="h-3.5 w-3.5 text-primary focus:ring-ring border-border rounded mr-1.5 accent-primary"
              />
              <label htmlFor={`ignore-previous-override-${stream.id}`} className="text-xs text-muted-foreground">
                  Force fresh update (ignore stream's context setting for this time)
              </label>
          </div>
        </>
      )}
    </div>
  );
};

export default TopicStreamWidget;