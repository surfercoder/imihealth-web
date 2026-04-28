// Browser navigation indirection so client components can be unit-tested
// without poking at jsdom's locked `window.location` object.

/* v8 ignore start */
export function navigateTo(url: string): void {
  window.location.href = url;
}
/* v8 ignore stop */
