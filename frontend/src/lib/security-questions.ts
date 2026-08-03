/**
 * Must match backend/src/routes/auth.routes.ts's SECURITY_QUESTIONS exactly —
 * the reset flow sends the selected text back to the server for comparison.
 */
export const SECURITY_QUESTIONS = [
  "What was the name of your first pet?",
  "What city were you born in?",
  "What is your mother's maiden name?",
  "What was the name of your elementary school?",
  "What was the make of your first car?",
  "What is the name of the street you grew up on?",
] as const;
