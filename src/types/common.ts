export type ActionResult<T = void> =
  | { error: string; success?: never; data?: never }
  | { error?: never; success: true; data?: T };
