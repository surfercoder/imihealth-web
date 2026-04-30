/** Hard-redirect the browser to an external URL. Wrapped so tests can mock it. */
export function redirectBrowser(url: string): void {
  window.location.assign(url);
}
