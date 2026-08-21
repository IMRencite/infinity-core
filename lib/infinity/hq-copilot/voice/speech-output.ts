export function isBrowserSpeechSynthesisAvailable(
  synthesis: { speak?: unknown } | null | undefined = typeof window === "undefined" ? null : window.speechSynthesis,
): boolean {
  return Boolean(synthesis && typeof synthesis.speak === "function");
}

export function shouldSpeakHqCopilotAnswer(input: {
  userEnabled: boolean;
  autoPlay: boolean;
  synthesisAvailable: boolean;
  answer: string;
}): boolean {
  if (input.autoPlay) return false;
  if (!input.userEnabled) return false;
  if (!input.synthesisAvailable) return false;
  return input.answer.trim().length > 0;
}

export function spokenAnswerText(answer: string, maxChars = 1_200): string {
  const compact = answer.replace(/\s+/g, " ").trim();
  if (compact.length <= maxChars) return compact;
  return `${compact.slice(0, maxChars - 1).trimEnd()}…`;
}
