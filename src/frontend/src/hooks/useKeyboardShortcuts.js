import { useEffect } from 'react';

const useKeyboardShortcuts = (shortcuts) => {
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Build key combination string
      let combo = '';
      if (event.metaKey || event.ctrlKey) combo += 'cmd+';
      if (event.altKey) combo += 'alt+';
      if (event.shiftKey) combo += 'shift+';
      combo += event.key.toLowerCase();

      // Find matching shortcut
      const shortcut = shortcuts.find(s => s.key === combo);
      if (shortcut) {
        event.preventDefault();
        shortcut.action();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);
};

export default useKeyboardShortcuts; 