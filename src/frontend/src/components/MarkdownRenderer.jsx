import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function MarkdownRenderer({ content }) {
  if (content == null) return null;
  const markdownContent = String(content);
  return (
    <div className="prose prose-sm sm:prose lg:prose-lg xl:prose-xl max-w-none dark:prose-invert prose-p:my-2 prose-h1:mt-3 prose-h1:mb-2 prose-h2:mt-3 prose-h2:mb-2 prose-h3:mt-2 prose-h3:mb-1">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {markdownContent}
      </ReactMarkdown>
    </div>
  );
} 