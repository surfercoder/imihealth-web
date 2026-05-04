export const navigator = {
  /* v8 ignore next 3 -- jsdom blocks stubbing window.location, so this is exercised in production only */
  go(url: string): void {
    window.location.assign(url);
  },
};

/** Hard-redirect the browser to an external URL. Wrapped so tests can mock it. */
export function redirectBrowser(url: string): void {
  navigator.go(url);
}
