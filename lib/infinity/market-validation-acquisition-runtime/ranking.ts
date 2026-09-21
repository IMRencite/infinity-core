import type { AcquisitionChannelRecord, ChannelOutcome, EvidenceGap } from "./types";

function informationScore(channel: AcquisitionChannelRecord): number {
  return channel.validationInformationValue === "HIGH" ? 3 : channel.validationInformationValue === "MEDIUM" ? 2 : 1;
}

function personaScore(channel: AcquisitionChannelRecord): number {
  return channel.personaSuitability === "HIGH" ? 3 : channel.personaSuitability === "MEDIUM" ? 2 : 1;
}

function exposurePenalty(channel: AcquisitionChannelRecord): number {
  if (channel.channelType === "paid_acquisition") return 4;
  if (channel.financialAuthorizationRequired) return 2;
  if (channel.communicationAuthorizationRequired) return 0.4;
  return 0;
}

function timeFit(channel: AcquisitionChannelRecord, daysRemaining: number): number {
  if (daysRemaining >= 10) {
    if (channel.timeToEvidenceState === "FAST" && channel.validationInformationValue === "HIGH") return 2;
    if (channel.channelType === "paid_acquisition" || channel.channelType === "organic_growth_limited") return -1.5;
    return 0;
  }
  if (daysRemaining >= 4) {
    if (channel.channelType === "organic_growth_limited") return 0.6;
    if (channel.channelType === "paid_acquisition") return -1;
    return 0.2;
  }
  if (channel.channelType === "organic_growth_limited") return 1.2;
  if (channel.channelType === "paid_acquisition") return 0.2;
  return 0;
}

export function applyChannelOutcomes(
  channels: AcquisitionChannelRecord[],
  outcomes: ChannelOutcome[] = [],
): AcquisitionChannelRecord[] {
  return channels.map((channel) => {
    const outcome = outcomes.find((item) => item.channelType === channel.channelType);
    if (!outcome) return channel;
    const wastedTraffic = outcome.visits > 0 && outcome.qualified === 0;
    const highYield = outcome.visits > 0 && outcome.qualified / outcome.visits >= 0.2;
    return {
      ...channel,
      historicalPerformance: {
        visits: outcome.visits,
        qualified: outcome.qualified,
        valueAdjustment: wastedTraffic ? -2 : highYield ? 2 : 0,
      },
    };
  });
}

export function rankAcquisitionChannels(input: {
  channels: AcquisitionChannelRecord[];
  gap: EvidenceGap;
  outcomes?: ChannelOutcome[];
}): Array<{ rank: number; channelId: string; channelType: AcquisitionChannelRecord["channelType"]; reason: string; score: number }> {
  const channels = applyChannelOutcomes(input.channels, input.outcomes);
  const scored = channels
    .map((channel) => {
      const score =
        informationScore(channel) * 2 +
        personaScore(channel) +
        channel.historicalPerformance.valueAdjustment +
        timeFit(channel, input.gap.daysRemaining) -
        exposurePenalty(channel);
      return { channel, score };
    })
    .sort((left, right) => right.score - left.score)
    .map((item, index) => ({
      rank: index + 1,
      channelId: item.channel.channelId,
      channelType: item.channel.channelType,
      score: item.score,
      reason:
        item.channel.channelType === "founder_assisted_introduction"
          ? "Highest-information, lowest-exposure path to qualified tenant-rep evidence."
          : item.channel.channelType === "paid_acquisition"
            ? "Paid traffic is not selected: cost UNKNOWN, no ads authorization, impressions are not the objective."
            : `Ranked by evidence value, remaining ${input.gap.daysRemaining} days, and authorization friction — not impressions.`,
    }));
  return scored;
}
