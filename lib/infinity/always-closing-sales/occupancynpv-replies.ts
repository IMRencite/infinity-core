import { OCCUPANCYNPV_EMAIL_SIGNATURE } from "@/lib/infinity/production-outbound/email-signature";
import { isPositiveBuyingSignal, isRequestInputsQuestion, isTryWithNumbersQuestion } from "@/lib/infinity/production-outbound/conversation-semantics";
import { selectNextBestCommercialAction, type CommercialInteraction } from "./doctrine";
import {
  buildSalesContrast,
  selectConsultativeQuestion,
} from "./consultative-sales";

function firstTouchCore(): string {
  return `OccupancyNPV helps you compare lease options without rebuilding a spreadsheet every time the numbers change.

It's useful when you need to see which option makes more financial sense — quickly.`;
}

export function composeOccupancyNpvAlwaysClosingReply(input: CommercialInteraction): {
  body: string;
  next_action: ReturnType<typeof selectNextBestCommercialAction>["next_action"];
  decision: ReturnType<typeof selectNextBestCommercialAction>;
} {
  const decision = selectNextBestCommercialAction(input);
  const text = input.inbound;
  const turn = input.turn ?? 1;
  const contrast = buildSalesContrast(/renew|mov(e|ing)|relocat/.test(text) ? "two_models" : "spreadsheet");
  const question = selectConsultativeQuestion({
    stage: decision.stage,
    inbound: text,
    turn,
  });
  let core = "";
  if (/verified path|canonical|dealworkspace|eligible_at/i.test(text) || turn >= 5) {
    core = `You've already got the picture. At this point, the easiest thing is to try it with your real numbers.

Start the free trial and run both options.`;
  } else if (decision.intent === "REQUEST_INPUTS" || isRequestInputsQuestion(text)) {
    core = `Not much. For each lease, you'd start with the rent, lease term, annual increases, and any move or downtime costs.

Instead of rebuilding two spreadsheets, OccupancyNPV puts both options side by side so you can see which one makes more financial sense. That makes the decision less messy.

Since you already have the leases, the easiest next step is to try them with your actual numbers. The 3-day free trial has no credit card and no automatic billing.`;
  } else if (decision.intent === "TRY_WITH_NUMBERS" || isTryWithNumbersQuestion(text)) {
    core = `That's pretty simple. You'd enter the basic numbers from your current lease — rent, term, increases, and any costs tied to staying — then add the numbers for the new location, like rent, move costs, and downtime.

The big difference is you're not rebuilding two spreadsheets and trying to figure out which one is really better. OccupancyNPV puts both options side by side so you can see which one makes more financial sense.

${question?.text ?? "If you're already looking at a lease decision, wouldn't it make sense to run your actual numbers and see which option comes out stronger?"}`;
  } else if (decision.intent === "POSITIVE_INTEREST" || isPositiveBuyingSignal(text)) {
    core = `That tracks. If it already looks like a fit, the useful next step is not another product tour.

You already know the comparison: rent, term, increases, and any move or downtime costs for each lease. The 3-day free trial has no credit card and no automatic billing, so you can run the real numbers without a billing surprise.

Start here: https://occupancynpv.com/pricing`;
  } else if (decision.intent === "ACTIVE_EVALUATION" || /couple leases|looking to compare|currently have .{0,48}lease|comparing .{0,24}leases/i.test(text)) {
    core = `Perfect — that's exactly the kind of situation OccupancyNPV is built for.

If you have a couple leases you're comparing, the easiest next step is to plug in the rent, term, increases, move costs, and downtime for each one. Then you can see which option actually makes more financial sense without rebuilding separate spreadsheets. Staying in two models makes the decision harder than it needs to be.

You can try that with your real numbers in the 3-day free trial — no credit card and no automatic billing.

${question?.text ?? "Do you already have the rent and term for both leases?"}

Start here: https://occupancynpv.com/pricing`;
  } else if (decision.intent === "RENEW_VS_RELOCATE" || (/renew/i.test(text) && /mov(e|ing)|new location|relocat/i.test(text))) {
    core = `That's exactly what this is built for.

If you're comparing renew vs move, the current way is usually two models that get out of date every time rent or downtime changes. That makes the decision harder than it needs to be.

${contrast.sentence}

${question?.text ?? "Would it help if you could see both options side by side without rebuilding the analysis?"}`;
  } else if (/example|show me what it would look like/i.test(text)) {
    core = `Sure. Say Lease A costs $8,000 a month and has almost no moving costs. Lease B is $7,000 a month, but moving there would cost you $40,000 and cause some downtime.

Just looking at rent, Lease B looks cheaper. But once you include the move and downtime, the answer may change.

That's where OccupancyNPV helps — instead of guessing from the rent line, you put both options in and it shows you which one actually makes more financial sense.

${question?.text ?? "Do you have two leases you're comparing right now?"}

If you do, you can plug them into the 3-day free trial and see the difference with your actual numbers. No credit card and no automatic billing.

Start here: https://occupancynpv.com/pricing`;
  } else if (/price|pricing|how much|what does this cost|cost/.test(text.toLowerCase()) && !/exit cost|move cost/.test(text.toLowerCase())) {
    core = `Professional is $290 a year. Per-Deal is $149.

If the numbers keep changing, it gets hard to know which option is actually better. Instead of guessing from a price list, run your real numbers on the 3-day free trial and see which option comes out stronger.`;
  } else if (/competitor|excel|spreadsheet is enough|other tool/.test(text.toLowerCase())) {
    core = `Spreadsheets can do one scenario. The cost is rebuilding the analysis every time something changes. That slows the decision down.

${contrast.sentence}`;
  } else if (/too expensive|boss will never|maybe later|still thinking|circle back|stalled/.test(text.toLowerCase())) {
    core = `If this is stalling because the analysis is still messy, that's the problem.

${contrast.sentence} That makes the decision harder than it needs to be.

Would it help if you could see both options side by side without rebuilding the analysis?`;
  } else if (/buy|purchase|start now|sign up/.test(text.toLowerCase())) {
    core = `You've got enough information to test it now.

At this point, the easiest thing is to try it with your real numbers. Start the free trial and run both options.`;
  } else if ((input.turn ?? 1) <= 1 && !isPositiveBuyingSignal(text)) {
    core = firstTouchCore();
  } else {
    core = `You've already got the picture. At this point, the useful next step is to run your actual leases — rent, term, increases, and any move or downtime costs.

The 3-day free trial has no credit card and no automatic billing.`;
  }
  if (/INVITE_TRIAL|START_TRIAL|REQUEST_PURCHASE|REQUEST_NUMBERS/.test(decision.next_action) && !/free trial|try it free/i.test(core)) {
    core = `${core}\n\nYou can try it with a 3-day free trial — no credit card and no automatic billing.`;
  }
  const advance = decision.cta ? `\n\n${decision.cta}` : "";
  return {
    body: `${core}${advance}\n\n${OCCUPANCYNPV_EMAIL_SIGNATURE}`,
    next_action: decision.next_action,
    decision,
  };
}
