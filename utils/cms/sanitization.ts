const ALLOWED_TAGS = ['P', 'B', 'I', 'STRONG', 'EM', 'U', 'UL', 'OL', 'LI', 'BR', 'A', 'H2', 'H3', 'H4', 'BLOCKQUOTE'];
const ALLOWED_ATTRS = ['href', 'target', 'rel', 'id'];

/**
 * Recursively sanitizes DOM nodes, keeping only allowed tags and attributes.
 */
function sanitizeNode(node: Node): HTMLElement {
  // If window is undefined (e.g. running in Node.js environment during tests), return standard element mocked
  const doc = typeof document !== 'undefined' ? document : null;
  const cleanParent = doc ? doc.createElement('div') : { appendChild: () => {}, childNodes: [] } as unknown as HTMLElement;
  
  node.childNodes.forEach(child => {
    if (child.nodeType === 3) { // Text node (Node.TEXT_NODE)
      if (doc) {
        cleanParent.appendChild(doc.createTextNode(child.textContent || ''));
      }
    } else if (child.nodeType === 1) { // Element node (Node.ELEMENT_NODE)
      const element = child as HTMLElement;
      const tagName = element.tagName.toUpperCase();
      
      if (ALLOWED_TAGS.includes(tagName)) {
        if (doc) {
          const cleanElement = doc.createElement(tagName.toLowerCase());
          
          // Copy allowed attributes
          ALLOWED_ATTRS.forEach(attr => {
            if (element.hasAttribute(attr)) {
              let val = element.getAttribute(attr) || '';
              // Security check for href
              if (attr === 'href') {
                const valLower = val.toLowerCase().trim();
                if (valLower.startsWith('javascript:') || valLower.startsWith('data:')) {
                  val = '#';
                }
              }
              cleanElement.setAttribute(attr, val);
            }
          });

          // For links, enforce secure targets
          if (tagName === 'A') {
            cleanElement.setAttribute('target', '_blank');
            cleanElement.setAttribute('rel', 'noopener noreferrer');
          }

          // Recursively sanitize children
          const sanitizedChildren = sanitizeNode(element);
          while (sanitizedChildren.firstChild) {
            cleanElement.appendChild(sanitizedChildren.firstChild);
          }
          
          cleanParent.appendChild(cleanElement);
        }
      } else {
        // Tag is not allowed, strip the tag but keep its text content / child nodes
        const sanitizedChildren = sanitizeNode(element);
        if (doc) {
          while (sanitizedChildren.firstChild) {
            cleanParent.appendChild(sanitizedChildren.firstChild);
          }
        }
      }
    }
  });

  return cleanParent as HTMLElement;
}

/**
 * Sanitize an HTML string using DOMParser in the browser.
 */
export function sanitizeHtml(html: string): string {
  if (!html) return '';
  if (typeof window === 'undefined') {
    // Simple basic fallback for non-browser environments (e.g. testing)
    return html.replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, '');
  }

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const cleanBody = sanitizeNode(doc.body);
    return cleanBody.innerHTML;
  } catch (e) {
    console.error('Error sanitizing html:', e);
    return html;
  }
}

/**
 * Handle paste events to strip invalid styles, scripts, classnames, etc.
 * Returns the sanitized HTML string.
 */
export function handlePasteText(e: React.ClipboardEvent<HTMLDivElement>): string {
  e.preventDefault();
  
  // Try to get HTML content first
  const html = e.clipboardData.getData('text/html');
  if (html) {
    return sanitizeHtml(html);
  }
  
  // Fallback to plain text
  const text = e.clipboardData.getData('text/plain');
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br />');
}
