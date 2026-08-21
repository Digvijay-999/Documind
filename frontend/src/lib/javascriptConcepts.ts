/**
 * JavaScript Language Concepts Demonstration Module
 * 
 * Demonstrates JavaScript Function Declaration Hoisting:
 * In JavaScript, function declarations are hoisted to the top of their containing scope
 * during the creation/compilation phase. This allows functions to be invoked BEFORE
 * their physical lexical definition in the source file.
 */

export function demonstrateHoisting(): string {
  // Invoking hoistedFunction before its definition below
  return hoistedFunction();

  // Function declaration is hoisted to the top of demonstrateHoisting scope
  function hoistedFunction(): string {
    return "Function declarations are hoisted";
  }
}

/**
 * System and Environment Banner Helper
 * Demonstrates function declaration hoisting in real application logic
 */
export function getSystemArchitectureSummary(): string {
  // Calling formatArchSummary before its lexical declaration below
  return formatArchSummary('Next.js 16 + React 19 + Express Engine');

  // Hoisted function declaration
  function formatArchSummary(engine: string): string {
    return `Architecture: ${engine}`;
  }
}
