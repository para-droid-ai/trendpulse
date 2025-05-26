import { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';

const Portal = ({ children }) => {
  const [container, setContainer] = useState(null);

  useEffect(() => {
    // Create a dedicated div for the portal if it doesn't exist
    let portalContainer = document.getElementById('portal-root');
    if (!portalContainer) {
      portalContainer = document.createElement('div');
      portalContainer.setAttribute('id', 'portal-root');
      document.body.appendChild(portalContainer);
    }
    setContainer(portalContainer);

    // Cleanup function to remove the div when the last portal is unmounted
    // This is a simplified cleanup; a more robust solution might involve reference counting
    return () => {
      if (portalContainer && portalContainer.childNodes.length === 0) {
        // portalContainer.parentNode?.removeChild(portalContainer);
        // Commenting out direct removal to avoid issues if multiple portals open/close rapidly.
        // The div will persist, which is generally fine.
      }
    };
  }, []);

  if (!container) {
    return null; // Or a loading spinner, or some fallback UI
  }

  return ReactDOM.createPortal(children, container);
};

export default Portal; 