/**
 * Customer-facing garage culture article — V5 from-zero body (social hangouts, not repair manual).
 */
import type { PageTopicBoundary } from "@/lib/infinity/venture-isolation/venture-isolation";

export const CLUB_THROTTLE_GARAGE_TOPIC: PageTopicBoundary = {
  page_id: "/journal/culture/garage-culture-as-rider-social-life/",
  venture_id: "club-throttle",
  primary_topic: "garage culture as rider social life",
  primary_reader_job: "Treat a working garage as invited social time after the ride—not a costume set or fake outlaw stage.",
  must_cover: ["working garage", "after the ride", "people who stay", "costume", "invite", "print or hold"],
  allowed_supporting: ["bench light", "grease on clothes", "meet versus garage", "shared shop"],
  out_of_scope_for_page: ["park once", "two-second gap", "headlight reach", "overdriving", "staggered formation", "abrasion rating table"],
  conversion_intent: { primary: "LEARN", secondary: "PRODUCT_CONSIDERATION" },
};

function paragraphs(blocks: string[]): string {
  return blocks.join("\n\n");
}

export function clubThrottleGarageV5Body() {
  const answer =
    "Garage culture is a working garage after the ride: people who stay, usable light, and time that does not need a camera. It is not a costume shop and not a fake outlaw set.";

  const headings = [
    "What a working garage actually is",
    "Who belongs in that room",
    "Meet versus garage: two different invites",
    "What clothes should do there",
    "Imagery that does not belong on a shirt",
    "Print or hold the mark",
    "Naming the hour before people arrive",
    "Shared shops and apartment stalls",
    "Floor, noise, and neighbors",
    "Tools, loaners, and the bench",
    "Kids, beer, and the drain pan",
    "When the hour spills outside",
    "Common costume mistakes",
    "Where to go next inside Club Throttle",
    "Limits of this garage note",
  ];

  const body = paragraphs([
    "Garage culture is rider social life with a floor and a light—not a backdrop rented for photos. A working garage is the hour after the ride when someone stays to talk, torque a drain plug, or sit on a stool without performing for a feed. The room works when nobody posts and still works when someone does.",
    "People who stay belong there. Tools belong there. Time belongs there. An audience does not. If the room only functions when a camera is on, it is a set. If the room functions when the door is closed and the bench is lit, it is a garage.",
    "A meet in a lot is public. A garage hour is invited. Do not run garage rules in a grocery row. Do not run lot rules as if they were a closed shop. Compare meet and garage honestly: one collects strangers under sodium lights; the other collects time under a bench lamp.",
    "Clothes in that room should survive grease and still look like themselves the next day. That is a different job than a repair-shop costume. A midweight tee can take a cuff smear and still read as a shirt at coffee the next morning. A thin catalog tee can turn one smear into the whole story. Neither shirt is a coverall—keep a rag nearby.",
    "Fake outlaw marks, manufacturer logos you do not own, and repair-shop costume prints stay off Club Throttle. A suggestion is a note, not a command to print. If the mark cannot name why it belongs after the ride, hold it. Third-party badges and rebellion cosplay are the same fail—they are not this room.",
    "Print or hold is the commercial question. If the idea only works as a joke about a brand you do not own, hold it. If the idea is a night road, a bench light, or the hour after the ride, it can stay in the notebook until the art is real.",
    "Late-oil-change example: one bench light, a drain pan, and two people who stayed. The shirt that works is the one you are not afraid to wear near the pan. The shirt that fails is the one you treat like glass. That is a use test, not a catalog pose.",
    "Name the hour before people arrive. Name the tool that will be on the bench. If you cannot name either, you are hosting a hang, not a garage. Both can be fine—do not confuse the labels when you invite people.",
    "Inviting more people can kill the work. Closing the door can keep the work and lose the social life. Invite or not is a real decision. A garage that never welcomes anyone becomes a storage room; a garage that never closes becomes a stage.",
    "An apartment parking stall can still hold garage culture if the hour is real. The costume still does not belong there. After you leave, the space should still be usable for the person who lives beside it.",
    "Usable light and a bench that is not a podium are the checks. If the only bright thing is a phone camera, you built a set. Empty walls beat slop. Fabric weight and wash care live on the shirt page—this page owns the hour and the room.",
    "Identity here is the hour after the ride, not a ten-thousand-dollar film set. Keep a rag nearby. People who stay belong. An audience that only watches does not replace them.",
    "Off-limits imagery includes fake outlaw patches, manufacturer marks you do not license, and repair-shop costume graphics. Hold those prints. If you cannot name why the mark belongs after the hour, hold it.",
    "Shared rentals and apartment parking still need a written hour. Put it on a note on the door. People who arrive late to a closed hour are not owed a costume welcome.",
    "Request a real reason to print before you ask a shop to put a mark on cotton. Club Throttle will not print manufacturer marks or fake club marks to look busy. A suggestion stays a note until art and reason align.",
    "Oil on the floor is a slip, not a vibe. Wipe it before the next person walks in. A working garage stays usable because someone cleaned, not because someone posted a photo of the mess.",
    "Loan tools only if you will see them come back. A missing torque wrench is how a friendly hour becomes a fight. Write the name on tape if the shop is shared.",
    "Drinks near the drain pan are how a late oil change becomes a spill. Drink away from the work. The hour after the ride can still be social without turning the bench into a bar.",
    "A neighbor who hears wrenches at midnight is part of the invite-or-not decision. Close the door. Keep the radio down. Garage culture that wakes a building does not last a season.",
    "Kids in the room need a clear walk line and no hot exhaust. If you cannot give them that, the hour is adults only. That is a floor rule, not a costume rule.",
    "If the only conversation is who has the loudest pipes, you are hosting a contest. Send that talk outside. The bench is for work and for people who will stay when the contest ends.",
    "When the work is done, put the bike on the stand or the street, not across the only walk line. Leave the room as if the next person has to find a tool in the dark.",
    "A parts runner who never returns is not a guest—they are a hole in the hour. If someone leaves for a gasket, write the time they said they would return. If they miss it, close the drain and wait.",
    "Gloves on the bench keep grease off a shirt you still want to wear tomorrow. A rag in the back pocket is the same idea. Garage clothes should survive the hour and still look like themselves the next day.",
    "A playlist that drowns a torque spec is how a bolt gets left loose. Turn it down when the work is real. Talk can wait. A late oil change is not a concert.",
    "If the shop is rented, read the hours on the lease before you invite a crowd. A working garage that ignores the building is a noise complaint waiting for a photo.",
    "Hold a mark that needs a skull to look tough. Club Throttle is not a fake outlaw brand. The hour after the ride is enough story if the art is honest.",
    "When two people disagree about a print, neither wins by shouting over a running bike. Shut it down. Talk. Then print or hold. The bench is not a vote.",
    "Leave one clean rag and one working light for the next hour. That is the smallest gift a garage can give. Empty walls and a usable floor beat a costume set every time.",
    "A drain pan left full overnight is how a working garage becomes a smell. Empty it. Cap it. Put it where a foot will not find it.",
    "If you borrow a lift, leave the arms down and the area clear. A raised bike with no owner in the room is a trap. Invite or not includes who is allowed near the lift.",
    "Do not print a costume just because a wall looks empty. A blank wall is honest. A fake outlaw mark is not. Hold the art until it belongs after the ride.",
    "When the hour ends, thank the people who stayed. That sentence is garage culture. The costume is optional. The thanks is not.",
    "A stuck drain plug is a reason to stop, not a reason to force it with bravado. Ask for help. Keep the floor clear. Finish the oil change or hold the work until morning.",
    "If the art on the wall is a manufacturer poster, it does not make the room a Club Throttle set. Take it down if you are going to print original marks. Hold the costume. Keep the hour.",
    "Read bike-night etiquette if the hour spills into a lot. Read how to ride after dark if the night is the point on the road home. Read how riders choose a shirt for fabric and wash—this page owns garage culture as rider social life, not lot parking cards and not pack spacing on the road.",
    "Club Throttle sells marks about nights and benches when the art is real. Browse the shop or Garage Culture collection when you want house graphics that respect the hour—not cosplay that pretends the shop is an outlaw club.",
    "What is garage culture if it is not a costume shop? It is invited time, people who stay, light you can use, clothes that survive grease, and prints you hold until they mean something after the ride.",
    "Common mistakes: fake outlaw graphics, repair-shop costume prints, treating a suggestion as a print order, and filling empty walls with geometry because nothing is ready. Empty is better than slop.",
    "Official safety pages still matter if the garage spills into a street. They do not decorate the room—they remind you the ride home is still a ride.",
    "This does not automatically make a garage a brand set. It does not invent a product. Club Throttle will not print a costume to look busy.",
    "Keep the floor clear, name the hour, do not print a costume, ask whether the mark belongs after the ride. That checklist fits on one card in your pocket.",
    "A meet collects strangers. A garage collects time. Clothes that survive grease belong in the second. Clothes that only survive a lookbook belong in neither.",
    "When the last person leaves, the bench should still be usable. That is the culture you are actually keeping—not the poster, not the patch, not the story about a shop you do not run.",
    "Garage culture as rider social life is the working hour after the ride: invite, light, stay, clean up, print or hold with honesty. Everything else is noise around that hour.",
    "Write the hour on paper if your memory is generous. If stay-time drops 10 percent after a costume night, that is a signal to invite fewer performers and more helpers next time.",
    "A bench that holds two people comfortably beats a bench crowded by six who will not touch a wrench. Scale the invite to the work, not to the photo count.",
    "Heat in a closed shop rises fast when bodies stack. Crack the door for air before you crack a beer. A working garage still needs oxygen.",
    "Photos can document the hour without becoming the hour. One picture at the end beats fifty during the torque pass.",
    "If someone suggests a print because the wall looked empty, ask what the mark says about the hour after the ride. Empty walls are an honest answer until art is ready.",
    "Motorcycle context here is social: who stayed, who helped, who cleaned, who will come back. Torque specs live in manuals; this page lives in the invite list.",
    "When the garage closes for the night, reset the space: tools home, floor swept, lights off. The next invite starts with how the room looked when you left.",
  ]);

  const faqs = [
    {
      question: "Is garage culture the same as a bike night?",
      answer: "No. A lot meet is public; a garage hour is invited time with a bench and a door you can close.",
    },
    {
      question: "Can I wear a good shirt near the drain pan?",
      answer: "Yes if you accept a smear risk—midweight cotton survives better than a thin catalog tee; neither replaces a coverall.",
    },
    {
      question: "Is a suggestion a print order?",
      answer: "No. A suggestion is a note until art and a real reason to print exist.",
    },
    {
      question: "What imagery should clubs avoid on shirts?",
      answer: "Fake outlaw marks, unlicensed manufacturer logos, and repair-shop costume art that pretends the room is something it is not.",
    },
    {
      question: "Does this page teach wrenching?",
      answer: "No. It teaches social life in a working garage—not torque specs or service manuals.",
    },
    {
      question: "Where do lot rules live?",
      answer: "In bike-night etiquette when the bikes are still in a shared parking row.",
    },
  ];

  return { answer, headings, body, faqs };
}
