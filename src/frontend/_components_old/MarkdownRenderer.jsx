import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus, vs } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useContext } from 'react';
import AuthContext from '../context/AuthContext';

export default function MarkdownRenderer({ content }) {
  if (content == null) return null;
  
  const markdownContent = String(content);
  const { darkMode } = useContext(AuthContext) || { darkMode: false };
  
  return (
    <div className="rounded prose max-w-none dark:prose-invert prose-p:my-2 prose-h1:mt-3 prose-h1:mb-2 prose-h2:mt-3 prose-h2:mb-2 prose-h3:mt-2 prose-h3:mb-1 prose-ul:my-1 prose-li:my-0.5 prose-pre:my-1">
      <ReactMarkdown 
        remarkPlugins={[remarkGfm]}
        components={{
          code({ node, inline, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            return !inline && match ? (
              <SyntaxHighlighter
                style={darkMode ? vscDarkPlus : vs}
                language={match[1]}
                PreTag="div"
                {...props}
              >
                {String(children).replace(/\n$/, '')}
              </SyntaxHighlighter>
            ) : (
              <code className={className} {...props}>
                {children}
              </code>
            );
          },
          table({ node, ...props }) {
            return (
              <div className="overflow-x-auto my-2">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700" {...props} />
              </div>
            );
          },
          thead({ node, ...props }) {
            return <thead className="bg-gray-100 dark:bg-gray-800" {...props} />;
          },
          tbody({ node, ...props }) {
            return <tbody className="divide-y divide-gray-200 dark:divide-gray-700" {...props} />;
          },
          tr({ node, ...props }) {
            return <tr className="hover:bg-gray-50 dark:hover:bg-gray-900" {...props} />;
          },
          th({ node, ...props }) {
            return <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider" {...props} />;
          },
          td({ node, ...props }) {
            return <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300" {...props} />;
          },
          blockquote({ node, ...props }) {
            return <blockquote className="border-l-4 border-gray-300 dark:border-gray-600 pl-4 italic text-gray-700 dark:text-gray-300" {...props} />;
          },
          a({ node, ...props }) {
            return <a className="text-blue-600 dark:text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer" {...props} />;
          }
        }}
      >
        {markdownContent}
      </ReactMarkdown>
    </div>
  );
} 