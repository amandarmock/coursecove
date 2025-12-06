/**
 * Sanitization Utilities - Unit Tests
 *
 * Tests for F001: Appointment Type Management
 * Covers: sanitizeText, sanitizeRequiredText, sanitizeRichText,
 *         sanitizeUrl, sanitizeAddress, isValidDuration, isValidQuantity
 */

import { TRPCError } from '@trpc/server'
import {
  sanitizeText,
  sanitizeRequiredText,
  sanitizeRichText,
  sanitizeUrl,
  sanitizeAddress,
  isValidDuration,
  isValidQuantity,
} from './sanitize'
import {
  APPOINTMENT_TYPE_NAME_MAX_LENGTH,
  APPOINTMENT_TYPE_DESCRIPTION_MAX_LENGTH,
  LOCATION_ADDRESS_MAX_LENGTH,
  APPOINTMENT_DURATION_MIN,
  APPOINTMENT_DURATION_MAX,
  BULK_QUANTITY_MIN,
  BULK_QUANTITY_MAX,
} from './constants'

// =============================================================================
// sanitizeText
// =============================================================================

describe('sanitizeText', () => {
  describe('null/undefined handling', () => {
    it('returns empty string for null input', () => {
      expect(sanitizeText(null)).toBe('')
    })

    it('returns empty string for undefined input', () => {
      expect(sanitizeText(undefined)).toBe('')
    })

    it('returns empty string for empty string input', () => {
      expect(sanitizeText('')).toBe('')
    })
  })

  describe('whitespace handling', () => {
    it('trims leading whitespace', () => {
      expect(sanitizeText('   hello')).toBe('hello')
    })

    it('trims trailing whitespace', () => {
      expect(sanitizeText('hello   ')).toBe('hello')
    })

    it('trims both leading and trailing whitespace', () => {
      expect(sanitizeText('   hello   ')).toBe('hello')
    })

    it('preserves internal whitespace', () => {
      expect(sanitizeText('hello world')).toBe('hello world')
    })

    it('returns empty string for whitespace-only input', () => {
      expect(sanitizeText('   ')).toBe('')
    })
  })

  describe('HTML tag stripping', () => {
    it('strips script tags completely', () => {
      expect(sanitizeText('<script>alert("xss")</script>')).toBe('')
    })

    it('strips script tags but keeps text content', () => {
      expect(sanitizeText('Hello <script>evil()</script> World')).toBe('Hello  World')
    })

    it('strips bold tags but keeps content', () => {
      expect(sanitizeText('<b>bold text</b>')).toBe('bold text')
    })

    it('strips italic tags but keeps content', () => {
      expect(sanitizeText('<i>italic text</i>')).toBe('italic text')
    })

    it('strips nested tags', () => {
      expect(sanitizeText('<div><p><b>nested</b></p></div>')).toBe('nested')
    })

    it('strips anchor tags but keeps text', () => {
      expect(sanitizeText('<a href="http://evil.com">Click me</a>')).toBe('Click me')
    })

    it('strips img tags', () => {
      expect(sanitizeText('<img src="x" onerror="alert(1)">')).toBe('')
    })

    it('handles malformed HTML', () => {
      expect(sanitizeText('<b>unclosed')).toBe('unclosed')
    })
  })

  describe('XSS prevention', () => {
    it('neutralizes javascript: protocol in href', () => {
      expect(sanitizeText('<a href="javascript:alert(1)">click</a>')).toBe('click')
    })

    it('neutralizes event handlers', () => {
      expect(sanitizeText('<div onclick="evil()">text</div>')).toBe('text')
    })

    it('neutralizes data: protocol', () => {
      expect(sanitizeText('<a href="data:text/html,<script>alert(1)</script>">x</a>')).toBe('x')
    })
  })

  describe('length enforcement', () => {
    it('uses default max length from constants', () => {
      const longInput = 'a'.repeat(APPOINTMENT_TYPE_NAME_MAX_LENGTH + 50)
      const result = sanitizeText(longInput)
      expect(result.length).toBe(APPOINTMENT_TYPE_NAME_MAX_LENGTH)
    })

    it('respects custom max length', () => {
      const longInput = 'a'.repeat(100)
      const result = sanitizeText(longInput, 50)
      expect(result.length).toBe(50)
    })

    it('does not truncate short input', () => {
      const shortInput = 'hello'
      expect(sanitizeText(shortInput, 100)).toBe('hello')
    })
  })
})

// =============================================================================
// sanitizeRequiredText
// =============================================================================

describe('sanitizeRequiredText', () => {
  describe('valid input', () => {
    it('returns sanitized text for valid input', () => {
      expect(sanitizeRequiredText('Hello World')).toBe('Hello World')
    })

    it('trims and returns valid text', () => {
      expect(sanitizeRequiredText('  Hello  ')).toBe('Hello')
    })

    it('strips HTML and returns content', () => {
      expect(sanitizeRequiredText('<b>Bold</b>')).toBe('Bold')
    })
  })

  describe('empty input handling', () => {
    it('throws TRPCError for empty string', () => {
      expect(() => sanitizeRequiredText('')).toThrow(TRPCError)
    })

    it('throws TRPCError for whitespace-only input', () => {
      expect(() => sanitizeRequiredText('   ')).toThrow(TRPCError)
    })

    it('throws TRPCError for HTML-only input that results in empty string', () => {
      expect(() => sanitizeRequiredText('<script></script>')).toThrow(TRPCError)
    })

    it('throws BAD_REQUEST error code', () => {
      try {
        sanitizeRequiredText('')
        fail('Expected error to be thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(TRPCError)
        expect((error as TRPCError).code).toBe('BAD_REQUEST')
      }
    })

    it('includes field name in error message', () => {
      try {
        sanitizeRequiredText('', 200, 'Name')
        fail('Expected error to be thrown')
      } catch (error) {
        expect((error as TRPCError).message).toContain('Name')
      }
    })

    it('uses default field name in error message', () => {
      try {
        sanitizeRequiredText('')
        fail('Expected error to be thrown')
      } catch (error) {
        expect((error as TRPCError).message).toContain('Input')
      }
    })
  })

  describe('length enforcement', () => {
    it('respects max length parameter', () => {
      const longInput = 'a'.repeat(100)
      const result = sanitizeRequiredText(longInput, 50)
      expect(result.length).toBe(50)
    })
  })
})

// =============================================================================
// sanitizeRichText
// =============================================================================

describe('sanitizeRichText', () => {
  describe('null/undefined handling', () => {
    it('returns empty string for null input', () => {
      expect(sanitizeRichText(null)).toBe('')
    })

    it('returns empty string for undefined input', () => {
      expect(sanitizeRichText(undefined)).toBe('')
    })
  })

  describe('allowed tags', () => {
    it('preserves bold tags', () => {
      expect(sanitizeRichText('<b>bold</b>')).toBe('<b>bold</b>')
    })

    it('preserves italic tags', () => {
      expect(sanitizeRichText('<i>italic</i>')).toBe('<i>italic</i>')
    })

    it('preserves em tags', () => {
      expect(sanitizeRichText('<em>emphasis</em>')).toBe('<em>emphasis</em>')
    })

    it('preserves strong tags', () => {
      expect(sanitizeRichText('<strong>strong</strong>')).toBe('<strong>strong</strong>')
    })

    it('preserves paragraph tags', () => {
      expect(sanitizeRichText('<p>paragraph</p>')).toBe('<p>paragraph</p>')
    })

    it('preserves br tags', () => {
      expect(sanitizeRichText('line1<br>line2')).toBe('line1<br>line2')
    })

    it('preserves unordered list tags', () => {
      expect(sanitizeRichText('<ul><li>item</li></ul>')).toBe('<ul><li>item</li></ul>')
    })

    it('preserves ordered list tags', () => {
      expect(sanitizeRichText('<ol><li>item</li></ol>')).toBe('<ol><li>item</li></ol>')
    })
  })

  describe('disallowed tags', () => {
    it('strips script tags', () => {
      expect(sanitizeRichText('<script>alert(1)</script>')).toBe('')
    })

    it('strips anchor tags but keeps text', () => {
      expect(sanitizeRichText('<a href="http://evil.com">link</a>')).toBe('link')
    })

    it('strips div tags but keeps content', () => {
      expect(sanitizeRichText('<div>content</div>')).toBe('content')
    })

    it('strips img tags', () => {
      expect(sanitizeRichText('<img src="x">')).toBe('')
    })

    it('strips iframe tags', () => {
      expect(sanitizeRichText('<iframe src="x"></iframe>')).toBe('')
    })
  })

  describe('attribute stripping', () => {
    it('removes all attributes from allowed tags', () => {
      expect(sanitizeRichText('<b style="color:red" class="evil">text</b>')).toBe('<b>text</b>')
    })

    it('removes onclick handlers', () => {
      expect(sanitizeRichText('<p onclick="evil()">text</p>')).toBe('<p>text</p>')
    })
  })

  describe('length enforcement', () => {
    it('uses default max length from constants', () => {
      const longInput = 'a'.repeat(APPOINTMENT_TYPE_DESCRIPTION_MAX_LENGTH + 100)
      const result = sanitizeRichText(longInput)
      expect(result.length).toBe(APPOINTMENT_TYPE_DESCRIPTION_MAX_LENGTH)
    })

    it('respects custom max length', () => {
      const longInput = 'a'.repeat(200)
      const result = sanitizeRichText(longInput, 100)
      expect(result.length).toBe(100)
    })
  })
})

// =============================================================================
// sanitizeUrl
// =============================================================================

describe('sanitizeUrl', () => {
  describe('null/undefined handling', () => {
    it('returns null for null input', () => {
      expect(sanitizeUrl(null)).toBeNull()
    })

    it('returns null for undefined input', () => {
      expect(sanitizeUrl(undefined)).toBeNull()
    })

    it('returns null for empty string', () => {
      expect(sanitizeUrl('')).toBeNull()
    })

    it('returns null for whitespace-only input', () => {
      expect(sanitizeUrl('   ')).toBeNull()
    })
  })

  describe('valid HTTPS URLs', () => {
    it('accepts valid HTTPS URL', () => {
      expect(sanitizeUrl('https://example.com')).toBe('https://example.com')
    })

    it('accepts HTTPS URL with path', () => {
      expect(sanitizeUrl('https://example.com/path/to/page')).toBe('https://example.com/path/to/page')
    })

    it('accepts HTTPS URL with query parameters', () => {
      expect(sanitizeUrl('https://example.com?foo=bar')).toBe('https://example.com?foo=bar')
    })

    it('accepts HTTPS URL with port', () => {
      expect(sanitizeUrl('https://example.com:8080')).toBe('https://example.com:8080')
    })

    it('preserves URL with trimmed whitespace', () => {
      expect(sanitizeUrl('  https://example.com  ')).toBe('https://example.com')
    })
  })

  describe('localhost exceptions', () => {
    it('accepts HTTP localhost URL', () => {
      expect(sanitizeUrl('http://localhost:3000')).toBe('http://localhost:3000')
    })

    it('accepts HTTP 127.0.0.1 URL', () => {
      expect(sanitizeUrl('http://127.0.0.1:3000')).toBe('http://127.0.0.1:3000')
    })

    it('accepts HTTPS localhost URL', () => {
      expect(sanitizeUrl('https://localhost:3000')).toBe('https://localhost:3000')
    })
  })

  describe('dangerous schemes rejection', () => {
    it('rejects javascript: URLs', () => {
      expect(sanitizeUrl('javascript:alert(1)')).toBeNull()
    })

    it('rejects data: URLs', () => {
      expect(sanitizeUrl('data:text/html,<script>alert(1)</script>')).toBeNull()
    })

    it('rejects file: URLs', () => {
      expect(sanitizeUrl('file:///etc/passwd')).toBeNull()
    })

    it('rejects vbscript: URLs', () => {
      expect(sanitizeUrl('vbscript:msgbox(1)')).toBeNull()
    })

    it('rejects dangerous schemes case-insensitively', () => {
      expect(sanitizeUrl('JAVASCRIPT:alert(1)')).toBeNull()
      expect(sanitizeUrl('JavaScript:alert(1)')).toBeNull()
    })
  })

  describe('HTTP rejection for non-localhost', () => {
    it('rejects HTTP URL for external domains', () => {
      expect(sanitizeUrl('http://example.com')).toBeNull()
    })

    it('rejects HTTP URL for external IP addresses', () => {
      expect(sanitizeUrl('http://192.168.1.1')).toBeNull()
    })
  })

  describe('invalid URL handling', () => {
    it('returns null for invalid URL format', () => {
      expect(sanitizeUrl('not a url')).toBeNull()
    })

    it('returns null for URL without protocol', () => {
      expect(sanitizeUrl('example.com')).toBeNull()
    })

    it('returns null for FTP URLs', () => {
      expect(sanitizeUrl('ftp://example.com')).toBeNull()
    })
  })
})

// =============================================================================
// sanitizeAddress
// =============================================================================

describe('sanitizeAddress', () => {
  it('returns empty string for null input', () => {
    expect(sanitizeAddress(null)).toBe('')
  })

  it('returns empty string for undefined input', () => {
    expect(sanitizeAddress(undefined)).toBe('')
  })

  it('sanitizes address text', () => {
    expect(sanitizeAddress('123 Main St')).toBe('123 Main St')
  })

  it('strips HTML from address', () => {
    expect(sanitizeAddress('<script>evil</script>123 Main St')).toBe('123 Main St')
  })

  it('enforces LOCATION_ADDRESS_MAX_LENGTH', () => {
    const longAddress = 'a'.repeat(LOCATION_ADDRESS_MAX_LENGTH + 50)
    const result = sanitizeAddress(longAddress)
    expect(result.length).toBe(LOCATION_ADDRESS_MAX_LENGTH)
  })

  it('trims whitespace from address', () => {
    expect(sanitizeAddress('  123 Main St  ')).toBe('123 Main St')
  })
})

// =============================================================================
// isValidDuration
// =============================================================================

describe('isValidDuration', () => {
  describe('valid durations', () => {
    it('accepts minimum duration', () => {
      expect(isValidDuration(APPOINTMENT_DURATION_MIN)).toBe(true)
    })

    it('accepts maximum duration', () => {
      expect(isValidDuration(APPOINTMENT_DURATION_MAX)).toBe(true)
    })

    it('accepts duration in the middle of range', () => {
      expect(isValidDuration(60)).toBe(true)
    })

    it('accepts 30 minute duration', () => {
      expect(isValidDuration(30)).toBe(true)
    })
  })

  describe('invalid durations', () => {
    it('rejects duration below minimum', () => {
      expect(isValidDuration(APPOINTMENT_DURATION_MIN - 1)).toBe(false)
    })

    it('rejects duration above maximum', () => {
      expect(isValidDuration(APPOINTMENT_DURATION_MAX + 1)).toBe(false)
    })

    it('rejects zero duration', () => {
      expect(isValidDuration(0)).toBe(false)
    })

    it('rejects negative duration', () => {
      expect(isValidDuration(-30)).toBe(false)
    })

    it('rejects non-integer duration', () => {
      expect(isValidDuration(30.5)).toBe(false)
    })

    it('rejects NaN', () => {
      expect(isValidDuration(NaN)).toBe(false)
    })

    it('rejects Infinity', () => {
      expect(isValidDuration(Infinity)).toBe(false)
    })
  })
})

// =============================================================================
// isValidQuantity
// =============================================================================

describe('isValidQuantity', () => {
  describe('valid quantities', () => {
    it('accepts minimum quantity', () => {
      expect(isValidQuantity(BULK_QUANTITY_MIN)).toBe(true)
    })

    it('accepts maximum quantity', () => {
      expect(isValidQuantity(BULK_QUANTITY_MAX)).toBe(true)
    })

    it('accepts quantity in the middle of range', () => {
      expect(isValidQuantity(50)).toBe(true)
    })
  })

  describe('invalid quantities', () => {
    it('rejects quantity below minimum', () => {
      expect(isValidQuantity(BULK_QUANTITY_MIN - 1)).toBe(false)
    })

    it('rejects quantity above maximum', () => {
      expect(isValidQuantity(BULK_QUANTITY_MAX + 1)).toBe(false)
    })

    it('rejects zero quantity', () => {
      expect(isValidQuantity(0)).toBe(false)
    })

    it('rejects negative quantity', () => {
      expect(isValidQuantity(-5)).toBe(false)
    })

    it('rejects non-integer quantity', () => {
      expect(isValidQuantity(5.5)).toBe(false)
    })

    it('rejects NaN', () => {
      expect(isValidQuantity(NaN)).toBe(false)
    })
  })
})
