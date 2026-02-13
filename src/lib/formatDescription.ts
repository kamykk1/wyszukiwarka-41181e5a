/**
 * Convert raw HTML description from partner APIs into clean plain text.
 * Handles <br>, </br>, <ul>, </ul>, <li>, </li>, and other common tags.
 */
export function formatDescription(html: string): string {
  return html
    // <li> → bullet point
    .replace(/<li[^>]*>/gi, '\n• ')
    // closing/opening structural tags → nothing or newline
    .replace(/<\/li>/gi, '')
    .replace(/<ul[^>]*>/gi, '')
    .replace(/<\/ul>/gi, '')
    .replace(/<ol[^>]*>/gi, '')
    .replace(/<\/ol>/gi, '')
    // <br> variants → newline
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/br>/gi, '\n')
    // <p> → newline
    .replace(/<p[^>]*>/gi, '\n')
    .replace(/<\/p>/gi, '')
    // strip any remaining HTML tags
    .replace(/<[^>]+>/g, '')
    // collapse multiple newlines
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
