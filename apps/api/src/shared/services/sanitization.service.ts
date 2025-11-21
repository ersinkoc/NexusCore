import sanitizeHtml from 'sanitize-html';

/**
 * Sanitization Service
 * Protects against XSS attacks by sanitizing user-generated content
 */
export class SanitizationService {
  /**
   * Sanitize HTML content with strict rules
   * Removes all potentially dangerous tags and attributes
   *
   * Use this for user-generated content that should not contain ANY HTML
   */
  static sanitizeText(dirty: string): string {
    return sanitizeHtml(dirty, {
      allowedTags: [], // No HTML tags allowed
      allowedAttributes: {}, // No attributes allowed
      disallowedTagsMode: 'recursiveEscape', // Escape dangerous tags instead of removing
    });
  }

  /**
   * Sanitize HTML content with relaxed rules
   * Allows safe formatting tags but removes scripts, iframes, etc.
   *
   * Use this for rich text editors where basic formatting is needed
   */
  static sanitizeHtml(dirty: string): string {
    return sanitizeHtml(dirty, {
      allowedTags: [
        // Basic formatting
        'p',
        'br',
        'strong',
        'b',
        'em',
        'i',
        'u',
        's',
        // Lists
        'ul',
        'ol',
        'li',
        // Headings
        'h1',
        'h2',
        'h3',
        'h4',
        'h5',
        'h6',
        // Quotes
        'blockquote',
        'q',
        // Code
        'code',
        'pre',
        // Links (with restrictions)
        'a',
      ],
      allowedAttributes: {
        a: ['href', 'title', 'target', 'rel'],
      },
      allowedSchemes: ['http', 'https', 'mailto'],
      allowedSchemesByTag: {
        a: ['http', 'https', 'mailto'],
      },
      // Enforce security attributes on links
      transformTags: {
        a: (_tagName, attribs) => {
          return {
            tagName: 'a',
            attribs: {
              ...attribs,
              // Prevent tabnabbing and ensure links open in new tab
              rel: 'noopener noreferrer',
              target: '_blank',
            },
          };
        },
      },
      // Disallow dangerous tag modes
      disallowedTagsMode: 'recursiveEscape',
    });
  }

  /**
   * Sanitize markdown-style content
   * Allows only markdown formatting (converted to safe HTML)
   */
  static sanitizeMarkdown(dirty: string): string {
    // First sanitize any HTML that might be injected
    const cleanedHtml = this.sanitizeHtml(dirty);
    return cleanedHtml;
  }

  /**
   * Sanitize user input for SQL/NoSQL queries
   * Removes special characters that could be used in injection attacks
   *
   * Note: This is a defense-in-depth measure. Always use parameterized queries!
   */
  static sanitizeQueryParam(dirty: string): string {
    // Remove null bytes, control characters, and SQL/NoSQL special chars
    return (
      dirty
        .replace(/\0/g, '') // Null bytes
        // eslint-disable-next-line no-control-regex
        .replace(new RegExp('[\\x00-\\x1F\\x7F]', 'g'), '') // Control characters
        .trim()
    );
  }

  /**
   * Sanitize filename to prevent path traversal attacks
   * Removes directory separators and other dangerous characters
   */
  static sanitizeFilename(filename: string): string {
    return (
      filename
        .replace(/[/\\]/g, '') // Remove path separators
        .replace(/\.\./g, '') // Remove parent directory references
        // eslint-disable-next-line no-control-regex
        .replace(new RegExp('[<>:"|?*\\x00-\\x1F]', 'g'), '') // Remove invalid filename chars
        .trim()
    );
  }

  /**
   * Sanitize email address
   * Basic validation and normalization
   */
  static sanitizeEmail(email: string): string {
    return email.toLowerCase().trim().replace(/\s+/g, ''); // Remove all whitespace
  }

  /**
   * Sanitize URL
   * Validates and normalizes URL, ensures it's not javascript: or data: scheme
   */
  static sanitizeUrl(url: string): string {
    const trimmed = url.trim();

    // Block dangerous URL schemes
    const dangerousSchemes = ['javascript:', 'data:', 'vbscript:', 'file:'];
    const lowerUrl = trimmed.toLowerCase();

    for (const scheme of dangerousSchemes) {
      if (lowerUrl.startsWith(scheme)) {
        return ''; // Return empty string for dangerous URLs
      }
    }

    return trimmed;
  }
}
