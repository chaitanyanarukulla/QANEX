import { Injectable } from '@nestjs/common';

@Injectable()
export class PiiRedactionService {
  private readonly patterns = [
    // Email
    {
      regex: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
      replacement: '[EMAIL_REDACTED]',
    },
    // Phone (Simple US/International format match)
    {
      regex: /(\+\d{1,2}\s?)?1?-?\.?\s?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g,
      replacement: '[PHONE_REDACTED]',
    },
    // Credit Card (Major brands, simple match)
    { regex: /\b(?:\d[ -]*?){13,16}\b/g, replacement: '[CC_REDACTED]' },
  ];

  redact(text: string): string {
    if (!text) return text;
    let redacted = text;
    for (const pattern of this.patterns) {
      redacted = redacted.replace(pattern.regex, pattern.replacement);
    }
    return redacted;
  }
}
