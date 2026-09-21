import type { AskReviewRequestCopy } from "./types";

function safeName(businessName: string): string {
  const name = businessName.trim();
  return name || "our business";
}

export function buildRequestCopyVariants(businessName: string, reviewUrl: string): AskReviewRequestCopy {
  const name = safeName(businessName);
  return {
    counter: `We would appreciate a Google review. Scan the QR or open this link: ${reviewUrl}`,
    sms: `Hi — if you have 30 seconds, would you leave ${name} a Google review? ${reviewUrl}`,
    email: `Thank you for visiting ${name}. If you are willing, please leave a Google review here:\n\n${reviewUrl}\n\nThis message is a template only. AskReview does not send email for you.`,
  };
}

export function buildRequestCopy(businessName: string, reviewUrl: string): string {
  return buildRequestCopyVariants(businessName, reviewUrl).sms;
}
