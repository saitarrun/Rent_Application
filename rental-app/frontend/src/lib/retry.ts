/**
 * Retry logic with exponential backoff for HTTP requests
 */

export interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
}

const DEFAULT_OPTIONS: RetryOptions = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2
};

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function shouldRetry(status: number): boolean {
  // Retry on 5xx errors and specific 4xx errors
  return status >= 500 || status === 408 || status === 429;
}

export async function retryFetch(
  url: string,
  options: RequestInit = {},
  retryOptions: RetryOptions = {}
): Promise<Response> {
  const { maxRetries, initialDelay, maxDelay, backoffMultiplier } = {
    ...DEFAULT_OPTIONS,
    ...retryOptions
  };

  let lastError: Error | null = null;
  let lastResponse: Response | null = null;

  for (let attempt = 0; attempt <= maxRetries!; attempt++) {
    try {
      const response = await fetch(url, options);
      lastResponse = response;

      if (!shouldRetry(response.status)) {
        return response;
      }

      if (attempt < maxRetries!) {
        const backoffDelay = Math.min(
          initialDelay! * Math.pow(backoffMultiplier!, attempt),
          maxDelay!
        );
        await delay(backoffDelay);
        continue;
      }
      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < maxRetries!) {
        const backoffDelay = Math.min(
          initialDelay! * Math.pow(backoffMultiplier!, attempt),
          maxDelay!
        );
        await delay(backoffDelay);
        continue;
      }
    }
  }

  if (lastResponse) return lastResponse;
  throw lastError || new Error('Request failed after retries');
}
