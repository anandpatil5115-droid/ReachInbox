import { isValidEmail, parseEmailsFromText, deduplicateEmails } from '../utils/emailValidator';

describe('Email Validator', () => {
  describe('isValidEmail', () => {
    it('should validate correct email addresses', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('user.name@domain.co')).toBe(true);
      expect(isValidEmail('user+tag@domain.com')).toBe(true);
    });

    it('should reject invalid email addresses', () => {
      expect(isValidEmail('')).toBe(false);
      expect(isValidEmail('invalid')).toBe(false);
      expect(isValidEmail('invalid@')).toBe(false);
      expect(isValidEmail('@domain.com')).toBe(false);
      expect(isValidEmail('invalid@domain')).toBe(false);
    });
  });

  describe('parseEmailsFromText', () => {
    it('should extract emails from text', () => {
      const text = 'Contact us at test@example.com or support@domain.org';
      const emails = parseEmailsFromText(text);
      expect(emails).toEqual(['test@example.com', 'support@domain.org']);
    });

    it('should handle comma-separated emails', () => {
      const text = 'test@example.com, user@domain.com';
      const emails = parseEmailsFromText(text);
      expect(emails).toEqual(['test@example.com', 'user@domain.com']);
    });

    it('should handle newlines', () => {
      const text = 'test@example.com\nuser@domain.com';
      const emails = parseEmailsFromText(text);
      expect(emails).toEqual(['test@example.com', 'user@domain.com']);
    });

    it('should return empty array for no emails', () => {
      const text = 'No emails here';
      const emails = parseEmailsFromText(text);
      expect(emails).toEqual([]);
    });
  });

  describe('deduplicateEmails', () => {
    it('should remove duplicate emails', () => {
      const emails = ['test@example.com', 'TEST@EXAMPLE.COM', 'user@domain.com'];
      const deduped = deduplicateEmails(emails);
      expect(deduped).toEqual(['test@example.com', 'user@domain.com']);
    });

    it('should handle empty array', () => {
      const emails: string[] = [];
      const deduped = deduplicateEmails(emails);
      expect(deduped).toEqual([]);
    });
  });
});
