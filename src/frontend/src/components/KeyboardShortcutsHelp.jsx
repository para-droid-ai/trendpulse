import React from 'react';

const KeyboardShortcutsHelp = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const shortcuts = [
    { key: '⌘N', description: 'Create new stream' },
    { key: '⌘1', description: 'Switch to list view' },
    { key: '⌘2', description: 'Switch to grid view' },
    { key: '⌘3', description: 'Switch to feed view' },
    { key: '⌘R', description: 'Refresh streams' },
    { key: '⌘T', description: 'Toggle theme' },
    { key: 'ESC', description: 'Close modals/forms' },
    { key: '⌘/ or ⌘?', description: 'Show this help' }
  ];

  return (
    <div 
      className="fixed bg-black/50 backdrop-blur-sm animate-in fade-in duration-300"
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
      onClick={onClose}
    >
      <div 
        className="bg-card rounded-xl shadow-xl animate-in slide-in-from-bottom-4 duration-300"
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '28rem',
          maxHeight: '90vh',
          margin: '0',
          overflow: 'auto'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-border">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-foreground">Keyboard Shortcuts</h3>
            <button
              onClick={onClose}
              className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-accent transition-colors"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6" style={{ maxHeight: 'calc(90vh - 8rem)', overflow: 'auto' }}>
          <div className="space-y-3">
            {shortcuts.map((shortcut, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{shortcut.description}</span>
                <kbd className="inline-flex items-center px-2 py-1 rounded-md bg-muted text-xs font-medium text-muted-foreground border border-border">
                  {shortcut.key}
                </kbd>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground text-center">
              Use these shortcuts to navigate TrendPulse like a pro
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KeyboardShortcutsHelp; 