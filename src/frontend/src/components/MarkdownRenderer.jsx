import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import MaskedSection from './MaskedSection';

function extractThinkSections(content) {
  const regex = /<think>([\s\S]*?)<\/think>/gi;
  let lastIndex = 0;
  const parts = [];
  let match;
  while ((match = regex.exec(content)) !== null) {
    if (match.index > lastIndex) parts.push({ type: 'markdown', value: content.slice(lastIndex, match.index) });
    parts.push({ type: 'think', value: match[1].trim() });
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < content.length) parts.push({ type: 'markdown', value: content.slice(lastIndex) });
  return parts;
}

// Component for rendering clickable citation numbers
function CitationNumber({ number, source, onClick }) {
  const handleClick = (e) => {
    e.preventDefault();
    if (source && typeof source === 'string') {
      window.open(source, '_blank', 'noopener,noreferrer');
    } else if (source && source.url) {
      window.open(source.url, '_blank', 'noopener,noreferrer');
    }
    if (onClick) onClick(number);
  };

  return (
    <button
      onClick={handleClick}
      className="inline-flex items-center justify-center w-5 h-5 ml-0.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-full transition-colors duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
      title={source ? `View source: ${typeof source === 'string' ? source : (source.url || source.name || 'Source')}` : `Source ${number}`}
      style={{
        fontSize: '10px',
        lineHeight: '1',
        minWidth: '20px',
        height: '20px'
      }}
    >
      {number}
    </button>
  );
}

// Function to parse citations and replace them with clickable components
function parseCitations(content, sources = []) {
  if (!content || typeof content !== 'string') return content;
  
  // Pattern to match citations like [1], [7], [12], etc.
  const citationPattern = /\[(\d+)\]/g;
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = citationPattern.exec(content)) !== null) {
    // Add text before citation
    if (match.index > lastIndex) {
      parts.push(content.slice(lastIndex, match.index));
    }
    
    // Add citation component
    const citationNumber = parseInt(match[1], 10);
    const sourceIndex = citationNumber - 1; // Convert to 0-based index
    const source = sources[sourceIndex];
    
    parts.push(
      <CitationNumber 
        key={`citation-${citationNumber}-${match.index}`}
        number={citationNumber}
        source={source}
      />
    );
    
    lastIndex = citationPattern.lastIndex;
  }
  
  // Add remaining text
  if (lastIndex < content.length) {
    parts.push(content.slice(lastIndex));
  }
  
  return parts.length > 1 ? parts : content;
}

export default function MarkdownRenderer({ content, sources = [] }) {
  if (content == null) return null;
  const markdownContent = String(content);
  const sections = extractThinkSections(markdownContent);
  
  return (
    <div className="prose prose-sm sm:prose lg:prose-lg xl:prose-xl max-w-none dark:prose-invert prose-p:my-2 prose-h1:mt-3 prose-h1:mb-2 prose-h2:mt-3 prose-h2:mb-2 prose-h3:mt-2 prose-h3:mb-1">
      {sections.map((section, i) =>
        section.type === 'think' ? (
          <div key={i} className="not-prose my-4">
            <MaskedSection>{section.value}</MaskedSection>
          </div>
        ) : (
          <ReactMarkdown
            key={i}
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeRaw]}
            components={{
              h1: ({node, ...props}) => <h2 {...props} />,
              h2: ({node, ...props}) => <h2 {...props} />,
              h3: ({node, ...props}) => <h2 {...props} />,
              h4: ({node, ...props}) => <h2 {...props} />,
              h5: ({node, ...props}) => <h2 {...props} />,
              h6: ({node, ...props}) => <h2 {...props} />,
              // Custom text renderer to handle citations
              p: ({children, ...props}) => {
                const processedChildren = React.Children.map(children, (child) => {
                  if (typeof child === 'string') {
                    return parseCitations(child, sources);
                  }
                  return child;
                });
                return <p {...props}>{processedChildren}</p>;
              },
              // Handle citations in other text elements
              li: ({children, ...props}) => {
                const processedChildren = React.Children.map(children, (child) => {
                  if (typeof child === 'string') {
                    return parseCitations(child, sources);
                  }
                  return child;
                });
                return <li {...props}>{processedChildren}</li>;
              },
            }}
          >{section.value}</ReactMarkdown>
        )
      )}
    </div>
  );
} 