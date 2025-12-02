/**
 * Sanitize and validate user inputs to prevent XSS and injection attacks
 */

export function sanitizeString(input: string): string {
  if (typeof input !== 'string') return '';

  return input
    .trim()
    .replace(/[<>]/g, '') // Remove < and > characters
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .slice(0, 500); // Limit length
}

export function sanitizeEmail(email: string): string {
  return email.toLowerCase().trim().slice(0, 254); // Max email length is 254
}

export function sanitizeHexAddress(address: string): string {
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    throw new Error('Invalid Ethereum address');
  }
  return address.toLowerCase();
}

export function sanitizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const allowedProtocols = ['http:', 'https:'];
    if (!allowedProtocols.includes(parsed.protocol)) {
      throw new Error('Invalid protocol');
    }
    return parsed.toString();
  } catch {
    throw new Error('Invalid URL');
  }
}

export function sanitizeJSON(input: string): Record<string, any> {
  try {
    const parsed = JSON.parse(input);
    // Recursively sanitize strings in object
    return sanitizeObject(parsed);
  } catch {
    throw new Error('Invalid JSON');
  }
}

function sanitizeObject(obj: any): any {
  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }
  if (obj && typeof obj === 'object') {
    const sanitized: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[sanitizeString(key)] = sanitizeObject(value);
    }
    return sanitized;
  }
  return obj;
}
