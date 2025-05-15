import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
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

export default function MarkdownRenderer({ content }) {
  if (content == null) return null;
  const markdownContent = String(content);
  const sections = extractThinkSections(markdownContent);
  return (
    <div className="prose prose-sm sm:prose lg:prose-lg xl:prose-xl max-w-none dark:prose-invert prose-p:my-2 prose-h1:mt-3 prose-h1:mb-2 prose-h2:mt-3 prose-h2:mb-2 prose-h3:mt-2 prose-h3:mb-1">
      {sections.map((section, i) =>
        section.type === 'think' ? (
          <MaskedSection key={i}>{section.value}</MaskedSection>
        ) : (
          <ReactMarkdown
            key={i}
            remarkPlugins={[remarkGfm]}
            components={{
              h1: ({node, ...props}) => <h2 {...props} />,
              h2: ({node, ...props}) => <h2 {...props} />,
              h3: ({node, ...props}) => <h2 {...props} />,
              h4: ({node, ...props}) => <h2 {...props} />,
              h5: ({node, ...props}) => <h2 {...props} />,
              h6: ({node, ...props}) => <h2 {...props} />,
            }}
          >{section.value}</ReactMarkdown>
        )
      )}
    </div>
  );
} 