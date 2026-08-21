/**
 * Frontend Formatters & Utility Helpers
 * 
 * Demonstrates JavaScript Function Declaration Hoisting:
 * In JavaScript/TypeScript, function declarations (e.g. `function formatUnits(...)`)
 * are hoisted to the top of the enclosing scope during compilation, allowing them
 * to be safely invoked before their lexical definition in the file.
 */

export function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 Bytes';
  // Invoking hoisted helper function defined below
  return calculateUnits(bytes, 2);
}

/**
 * Hoisted Function Declaration
 * Evaluated and allocated in memory during the compile/creation phase
 */
function calculateUnits(bytes: number, decimals: number): string {
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export function formatDate(dateString: string | Date): string {
  if (!dateString) return 'N/A';
  // Invoking hoisted helper function defined below
  return formatLocaleDate(dateString);
}

/**
 * Hoisted Helper for localized dates
 */
function formatLocaleDate(d: string | Date): string {
  return new Date(d).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
