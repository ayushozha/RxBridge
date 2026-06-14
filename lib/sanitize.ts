/**
 * Removes em dash and en dash characters from a string, replacing them with a
 * plain comma so spoken transcripts and any displayed text stay free of the
 * dash characters we do not want in this project.
 */
export function stripDashes(text: string): string {
  return text.replace(/\s*[—–]\s*/g, ", ");
}
