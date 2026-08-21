/**
 * JavaScript Language Fundamentals Module
 * 
 * Executable demonstrations of core JavaScript runtime concepts:
 * 1. Function Declaration Hoisting
 * 2. Event Loop (Synchronous Call Stack vs Microtask Queue vs Macrotask Queue)
 * 3. Asynchronous Patterns: Promises vs Callbacks
 * 4. Lexical Scoping & Closures
 */

// ==========================================
// 1. JAVASCRIPT — HOISTING
// ==========================================

/**
 * Demonstrates JavaScript Function Declaration Hoisting:
 * In JavaScript, function declarations are hoisted into memory during the creation phase,
 * enabling them to be safely invoked before their physical lexical definition.
 */
export function demonstrateHoisting(): string {
  // Invoking hoistedFunction before its definition below
  return hoistedFunction();

  // Hoisted function declaration
  function hoistedFunction(): string {
    return "Function declaration was hoisted";
  }
}

// ==========================================
// 2. JAVASCRIPT — EVENT LOOP
// ==========================================

/**
 * Demonstrates the synchronous portion of Event Loop execution scheduling.
 */
export function demonstrateEventLoop(): string[] {
  const executionOrder: string[] = [];

  // 1. Synchronous Execution (Immediate Call Stack)
  executionOrder.push("synchronous");

  // 2. Microtask Queue (Promises - drained before macrotasks)
  Promise.resolve().then(() => {
    executionOrder.push("microtask");
  });

  // 3. Macrotask Queue (Timers/IO - executed on subsequent event loop tick)
  setTimeout(() => {
    executionOrder.push("macrotask");
  }, 0);

  return executionOrder;
}

/**
 * Demonstrates asynchronous resolution order of the JavaScript Event Loop:
 * Call Stack (Synchronous) -> Microtask Queue (Promise) -> Macrotask Queue (setTimeout)
 */
export async function demonstrateEventLoopAsync(): Promise<string[]> {
  const executionOrder: string[] = [];

  // 1. Synchronous Call Stack
  executionOrder.push("synchronous");

  // 2. Schedule Microtask
  const microtask = Promise.resolve().then(() => {
    executionOrder.push("microtask");
  });

  // 3. Schedule Macrotask
  const macrotask = new Promise<void>((resolve) => {
    setTimeout(() => {
      executionOrder.push("macrotask");
      resolve();
    }, 0);
  });

  await microtask;
  await macrotask;

  return executionOrder;
}

// ==========================================
// 3. JAVASCRIPT — PROMISES VS CALLBACKS
// ==========================================

/**
 * Traditional Callback-based asynchronous pattern
 */
export function fetchWithCallback(
  callback: (error: Error | null, value?: string) => void
): void {
  setTimeout(() => {
    callback(null, "Callback result");
  }, 0);
}

/**
 * Modern Promise-based asynchronous pattern
 */
export function fetchWithPromise(): Promise<string> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve("Promise result");
    }, 0);
  });
}

/**
 * Comparison demonstrating both Callback and Promise consumption styles
 */
export async function compareAsyncPatterns(): Promise<{
  callback: string;
  promise: string;
}> {
  // Wrapping callback into a Promise to await its execution
  const callbackResult = await new Promise<string>((resolve, reject) => {
    fetchWithCallback((error, value) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(value ?? "");
    });
  });

  // Awaiting native Promise execution
  const promiseResult = await fetchWithPromise();

  return {
    callback: callbackResult,
    promise: promiseResult,
  };
}

// ==========================================
// 4. JAVASCRIPT — CLOSURES
// ==========================================

/**
 * Demonstrates JavaScript Closures:
 * The returned functions retain lexical access to the private `count` state
 * across subsequent invocations after createRequestCounter has returned.
 */
export function createRequestCounter(initialCount: number = 0) {
  let count = initialCount;

  return {
    increment: () => {
      count += 1;
      return count;
    },
    getCount: () => count,
    reset: () => {
      count = initialCount;
      return count;
    },
  };
}
