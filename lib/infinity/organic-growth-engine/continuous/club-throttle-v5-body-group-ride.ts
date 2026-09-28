/**
 * Customer-facing group-ride etiquette — V5 from-zero body (street spacing and signals, not a race).
 */
import type { PageTopicBoundary } from "@/lib/infinity/venture-isolation/venture-isolation";

export const CLUB_THROTTLE_GROUP_RIDE_TOPIC: PageTopicBoundary = {
  page_id: "/journal/rides/group-ride-etiquette/",
  venture_id: "club-throttle",
  primary_topic: "group ride etiquette",
  primary_reader_job: "Run a street group with staggered spacing, signals, shared fuel stops, and a clean wave-off—not a race.",
  must_cover: ["group-ride etiquette", "staggered", "signal", "two-second", "sweep", "fuel stop", "wave off", "not a race"],
  allowed_supporting: ["lead rider", "night group", "mixed bikes", "hand signals"],
  out_of_scope_for_page: ["fabric weight", "GSM", "size chart", "park once", "idle time", "fake outlaw", "repair-shop costume"],
  conversion_intent: { primary: "LEARN", secondary: "PRODUCT_CONSIDERATION" },
};

function paragraphs(blocks: string[]): string {
  const merged: string[] = [];
  let buf = "";
  for (const block of blocks) {
    const next = buf ? `${buf} ${block}` : block;
    if (next.split(/\s+/).length >= 28) {
      merged.push(next);
      buf = "";
    } else {
      buf = next;
    }
  }
  if (buf) merged.push(buf);
  return merged.join("\n\n");
}

export function clubThrottleGroupRideV5Body() {
  const answer =
    "A street group ride needs staggered spacing, a named sweep, shared fuel stops, and a wave-off everyone can see. It is not a race and not a place to copy illegal evasion.";

  const headings = [
    "What a street group is not",
    "Staggered formation and the two-second gap",
    "Lead, sweep, fuel, and signals",
    "How to leave with a wave-off",
    "Mixed bikes, night groups, and weather",
    "Phones, filming, and when someone goes down",
    "After you park: lot rules return",
    "Common mistakes on street groups",
    "Where to go next inside Club Throttle",
    "Limits of this group note",
  ];

  const body = paragraphs([
    "Group-ride etiquette for street bikes is not a race brief. Six bikes can work if someone leads who knows the route, someone sweeps who will look back, and the two-second gap stays real in traffic. Excitement is not a qualification. The street is still a street.",
    "Staggered formation is a habit, not a parade trick. The two-second gap means if the bike ahead crosses a painted line, you still have time to see it. Closing that gap to look fast is a gap jump—unsafe to copy and unfair to the rider behind you.",
    "Signal early and big. A late wave in a blind dip is not a signal. Practice the same three signs: slow, hazard, peel-off. If someone invents a fourth mid-ride, ignore it and hold your gap.",
    "Decide lead and sweep before the first wheel moves. Compare lead or sweep candidates on one criterion: who already knows the route and who will actually look back. The lead already knows the route. The sweep will actually look back—not assume mirrors do the job. If either name is missing, you are a cluster, not a group. Wait until both names exist.",
    "Say the route, the sweep, and the fuel stop out loud. If anyone cannot repeat those three, do not roll. A lot meet can end at the parking line; a group ride does not end until the last rider is accounted for.",
    "Stop for fuel together. Do not make the last rider invent a station. Name the stop before you roll. If someone is on reserve, say it at the start, not at the exit ramp.",
    "Wave off when you leave. The last rider should know you are gone. Leaving without a signal is how a sweep starts hunting a ghost. Peel off at a planned point, not in a decreasing-radius surprise.",
    "The lead holds pace when someone gap-jumps. The lead does not speed up to match ego. The gap-jumper resets or leaves with a wave-off. Street racing stays off this page as something to copy.",
    "A mixed group rides to the slowest honest pace, not the loudest bike. A smaller displacement machine is not a joke—it sets the speed everyone can keep. If louder bikes cannot live with that, they leave with a wave-off.",
    "Night groups add light inspection on every bike, not just the lead. One dead tail lamp makes the whole formation harder to see. Read how to ride after dark for headlight discipline; this page owns spacing once wheels roll.",
    "If you are only meeting in a lot, stop using street-group rules. Read bike-night etiquette. This page owns the moving group—not shirt fabric and not grocery aisles.",
    "Interstate on-ramps are not a place to rebuild staggered formation. Get through, then reset the two-second gap on the next straight. Panic bunching on a merge is a gap jump with extra traffic.",
    "Construction zones reset the gap. Painted lines disappear. Hold longer space and ignore anyone who treats cones like a race. Illegal evasion around a work crew is still evasion.",
    "Hand signals only work if the rider behind can see them. Fix comms or split if the person behind cannot hear you at a stop—they will not hear a hazard call at speed.",
    "Phones stay in a pocket until the fuel stop. A rider filming from the middle of the pack is a moving hazard. The sweep can wave that person off.",
    "If a bike drops, the group does not become a circle in a live lane. Get the machine to a shoulder. One person calls. The rest hold a safe distance. A street is still a street when someone is down.",
    "Rain mid-ride is a split test. Slow first. Then decide whether the named sweep can still see the last bike. Break into two smaller groups at the next planned stop if not.",
    "Count bikes at every stop. If the number changes and nobody waved off, do not roll until the missing rider is found or confirmed gone.",
    "A decreasing-radius exit is a bad place to pass. Hold your line. The lead does not owe you a hole because you are bored. Passing inside a group is how a two-second gap becomes a collision.",
    "A passenger in the group is not cargo. They get the same wave-off and the same fuel stop. If they cannot last the loop, peel off at the planned point.",
    "Tire pressure checks belong at the start, not after the first wobble. A group does not diagnose a front end at highway pace. The rider with the wobble leaves with a wave-off and a plan.",
    "If the lead misses a turn, the group does not invent three new routes. The sweep holds the last known plan until the pack can stop together.",
    "Do not use a group to draft a car. That is street racing dressed as traffic. Hold the two-second gap even when a gap in the next lane looks inviting.",
    "If the weather turns, the named sweep still has a job. Get the pack to the next planned stop, then decide stay or split.",
    "After the last wave-off, send one message that the ride is closed. People who were not there should not hunt a ghost route.",
    "A rider who wants to lead because they bought the newest bike still needs the route in their head. Hardware is not a qualification.",
    "Agree the route one more time at the curb. Name the sweep out loud. Stop for fuel together at the planned station. A group ride checklist is lead, sweep, fuel, two-second gap, and wave-off—five names on one card before the first wheel moves.",
    "NHTSA motorcycle-safety guidance is public context for visibility and protective equipment. It does not bless a race. IIHS notes on other-vehicle visibility still apply when a group shares a lane with cars.",
    "This is not legal advice. It does not automatically make a group safe. Club Throttle will not teach evasion or street racing.",
    "After you park, the group ride is over. Lot rules take over. Do not keep street-group spacing in a grocery aisle. Read bike-night etiquette if the stop is a meet.",
    "How should a street group ride work without becoming a race? Named lead, named sweep, shared fuel, honest two-second gap, and a wave-off the last rider can see. Miss one and you are still a cluster.",
    "Club Throttle cares about groups because culture rides home together sometimes. Browse the shop when you want graphics for after the ride—not as a substitute for naming a sweep before you roll.",
    "Related reads stay inside the brand: how to ride after dark for night packs, bike-night etiquette when you only meet in a lot, and streetwear versus riding gear for what cotton cannot do on the road.",
    "Write the sweep's name on the same card as the fuel stop. If you cannot name both, wait. That wait is etiquette, not delay for its own sake.",
    "A rider on reserve who hides it is a fuel-stop problem waiting for an exit ramp. Say it at the start. Silence is how the last rider invents a station.",
    "If someone films a gap jump, treat it as a method to delete—not imitate. Group-ride etiquette is the gap you can still see, not the pass you can post.",
    "Familiarity is not a substitute for a signal. Two friends who ride together every week still need a wave-off when one peels off.",
    "A larger group is more social and harder to keep honest. Default smaller until the habit is real.",
    "Emergency lanes and shoulders are for emergencies—not for re-forming a pack because someone missed a turn.",
    "When the sweep cannot see the last bike, split before the first corner. Do not invent a new rule in traffic.",
    "Street groups end when the last rider is accounted for. Wave off. Share fuel. Hold the gap. Those three keep a street group honest.",
    "Group-ride etiquette for street bikes that are not a race is staggered spacing, early signals, shared fuel, a named sweep, and a wave-off everyone understands. Everything else is detail on those habits.",
    "A 6-bike group with a named sweep is a common sweet spot—large enough to feel like a ride, small enough to keep honest gaps. If the gap closes by 10 percent every mile, split before the sweep loses the last tail lamp.",
    "Rolling through a yellow as a pack is how strangers become liabilities. Hold the line legally even when the group feels impatient.",
    "Rotating lead on a long day is fine if every new lead knows the route and agrees to the same two-second gap. Rotation is not an excuse to gap-jump.",
    "Sweep should carry a charged phone and know who to call if someone separates without a wave-off. That prep is part of the job, not optional heroics.",
    "City groups and country groups need different speeds even with the same formation. Name which you are before you roll.",
    "If a rider shows up in dark clothing on a night group, they need a fix before the first mile—not after someone loses them in a mirror.",
    "Hand signals at night need bigger motion and earlier timing. Assume the rider behind is half blind from glare.",
    "A fuel stop is a reset: head count, gap check, visor wipe, layer zip. Treat it like a pit without the race.",
    "When the route includes gravel, the lead announces it early. The sweep confirms the last bike cleared the loose section.",
    "Do not block a live lane while you argue about the next turn. Pull off, agree, then roll.",
    "If the group splits, each sub-group still needs a sweep. Half a cluster without a sweep is still a cluster.",
    "Request a named sweep before anyone rolls—that sentence is the whole pre-ride briefing in six words.",
    "Street racing stories belong at the bar after the bikes are off, not on the road as a method. This page will not teach evasion.",
    "After a good group ride, debrief one thing: where the gap tightened and why. Next month’s ride gets calmer because you remembered.",
    "What number should you write on the card? The sweep’s name, the fuel stop, and the count of bikes—6 is a common start, not a maximum. If the count changes without a wave-off, you stop and reconcile before the next corner.",
    "Lane splitting as a pack is not group-ride etiquette in most states. Hold your lane as a unit or split intentionally with a plan, not because the gap ahead looked fun.",
    "Elevated roadways add wind that pushes staggered bikes sideways. Give extra space before bridges and open spans where crosswinds surprise the last rider.",
    "A rider who uses the group to learn a new route should say so at the curb. Surprises mid-ride are how a sweep loses someone who peeled off silently.",
    "Courtesy at the merge is part of the ride: one bike at a time, eyes on mirrors, no race to the front. The lead sets that tone in the first mile so the sweep is not chasing a pack that already ran a yellow as a unit.",
    "Staggered spacing only works when every rider treats it as a responsibility, not a suggestion. The person behind you cannot fix your gap jump; they can only suffer it. Hold the two-second gap on straights, in rain, and after fuel stops when cold tires shorten everyone's patience.",
  ]);

  const faqs = [
    {
      question: "Who should lead a street group?",
      answer: "Someone who already knows the route—not the newest or loudest rider in the pack.",
    },
    {
      question: "What is the two-second gap for?",
      answer: "So you still have time to see what the bike ahead hits—closing it to look fast is a gap jump.",
    },
    {
      question: "Can a new rider sweep?",
      answer: "Only if they will actually look back; sweeping is a job, not a consolation prize.",
    },
    {
      question: "How do I leave without drama?",
      answer: "Wave off at a planned point so the sweep knows you are gone.",
    },
    {
      question: "Is a group ride a race?",
      answer: "No. Street racing and evasion stories stay off this page as things to copy.",
    },
    {
      question: "Does this page cover parking at a meet?",
      answer: "No. Lot rules live in bike-night etiquette once the kickstands are down.",
    },
  ];

  return { answer, headings, body, faqs };
}
