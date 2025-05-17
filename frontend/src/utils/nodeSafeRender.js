/**
 * Utilities for safer rendering of node elements that might cause toLowerCase errors
 */

/**
 * Safely gets the node name as a string, with fallback for null/undefined
 * @param {any} node - The node object 
 * @returns {string} - Safe string version of node name
 */
export const getSafeNodeName = (node) => {
  if (!node) return '';
  
  try {
    const nodeName = node.nodeName || node.name || node.type || '';
    return typeof nodeName === 'string' ? nodeName : String(nodeName);
  } catch (err) {
    console.warn('Error accessing node name:', err);
    return '';
  }
};

/**
 * Safely check if a node matches a specific element type
 * @param {any} node - The node to check
 * @param {string} elementType - The element type to check against (e.g., 'svg', 'div')
 * @returns {boolean} - Whether the node matches the specified element type
 */
export const isNodeOfType = (node, elementType) => {
  if (!node || !elementType) return false;
  
  try {
    const nodeName = getSafeNodeName(node);
    const elementTypeLower = typeof elementType === 'string' ? elementType.toLowerCase() : '';
    return nodeName.toLowerCase() === elementTypeLower;
  } catch (err) {
    console.warn('Error checking node type:', err);
    return false;
  }
};

/**
 * Wraps a component with error handling for node rendering
 * @param {Function} Component - The component to wrap
 * @returns {Function} - Wrapped component with error handling
 */
export const withSafeNodeHandling = (Component) => {
  return function SafeComponent(props) {
    try {
      return <Component {...props} />;
    } catch (err) {
      console.error('Error rendering component:', err);
      return <div className="error-fallback">Error rendering component</div>;
    }
  };
};

export default {
  getSafeNodeName,
  isNodeOfType,
  withSafeNodeHandling
};