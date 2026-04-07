interface TermsState {
  hasScrolledToBottom: boolean;
  consentChecked: boolean;
  captchaToken: string | null;
  captchaStatus: "idle" | "success" | "error" | "expired";
  captchaError: string | null;
  isVerifying: boolean;
}

type TermsAction =
  | { type: "SCROLL_TO_BOTTOM" }
  | { type: "SET_CONSENT"; value: boolean }
  | { type: "CAPTCHA_SUCCESS"; token: string }
  | { type: "CAPTCHA_ERROR" }
  | { type: "CAPTCHA_EXPIRE" }
  | { type: "VERIFY_START" }
  | { type: "VERIFY_FAILED"; error: string };

export const termsInitialState: TermsState = {
  hasScrolledToBottom: false,
  consentChecked: false,
  captchaToken: null,
  captchaStatus: "idle",
  captchaError: null,
  isVerifying: false,
};

export function termsReducer(state: TermsState, action: TermsAction): TermsState {
  switch (action.type) {
    case "SCROLL_TO_BOTTOM":
      return { ...state, hasScrolledToBottom: true };
    case "SET_CONSENT":
      /* v8 ignore next 3 */
      if (!action.value) {
        return { ...state, consentChecked: false, captchaToken: null, captchaStatus: "idle", captchaError: null };
      }
      return { ...state, consentChecked: true };
    case "CAPTCHA_SUCCESS":
      return { ...state, captchaToken: action.token, captchaStatus: "success", captchaError: null };
    case "CAPTCHA_ERROR":
      return { ...state, captchaToken: null, captchaStatus: "error", captchaError: null };
    case "CAPTCHA_EXPIRE":
      return { ...state, captchaToken: null, captchaStatus: "expired", captchaError: null };
    case "VERIFY_START":
      return { ...state, isVerifying: true, captchaError: null };
    case "VERIFY_FAILED":
      return { ...state, isVerifying: false, captchaToken: null, captchaStatus: "idle", captchaError: action.error };
    /* v8 ignore next 2 */
    default:
      return state;
  }
}
