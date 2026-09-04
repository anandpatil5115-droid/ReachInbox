const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email.trim());
}

export function parseEmailsFromText(text: string): string[] {
  const emailMatches = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
  return emailMatches || [];
}

export function deduplicateEmails(emails: string[]): string[] {
  const seen = new Set<string>();
  const unique: string[] = [];

  for (const email of emails) {
    const normalized = email.trim().toLowerCase();
    if (!seen.has(normalized)) {
      seen.add(normalized);
      unique.push(normalized);
    }
  }

  return unique;
}

export function validateAndCleanEmails(text: string): { valid: string[]; invalid: string[] } {
  const allEmails = parseEmailsFromText(text);
  const valid: string[] = [];
  const invalid: string[] = [];

  for (const email of allEmails) {
    const normalized = email.trim().toLowerCase();
    if (isValidEmail(normalized)) {
      valid.push(normalized);
    } else {
      invalid.push(normalized);
    }
  }

  return {
    valid: deduplicateEmails(valid),
    invalid: deduplicateEmails(invalid),
  };
}
