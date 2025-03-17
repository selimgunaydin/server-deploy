/**
 * Helper function for safe data fetching during build time
 * This function will handle errors and provide fallbacks during the build process
 */
export async function safeFetch<T>(
  url: string,
  options?: RequestInit,
  fallback: T = [] as unknown as T
): Promise<T> {
  try {
    // Skip during production build to prevent ECONNREFUSED errors
    if (process.env.NODE_ENV === 'production' && process.env.NEXT_PHASE === 'phase-production-build') {
      console.log(`Skipping fetch to ${url} during build time`);
      return fallback;
    }

    const res = await fetch(url, {
      ...options,
      cache: 'no-store',
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch data from ${url}: ${res.status} ${res.statusText}`);
    }

    return await res.json() as T;
  } catch (error) {
    console.error(`Error fetching data from ${url}:`, error);
    return fallback;
  }
}