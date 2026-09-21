export type CollectingRoomLabel = "COLLECTING" | "PRESENT_IDLE";

export type CollectingRoomPresence = {
  validationStation: CollectingRoomLabel;
  signalIntelligence: CollectingRoomLabel;
  deploymentDepot: "PRESENT_IDLE";
  creationLab: "PRESENT_IDLE";
  fakeActiveWork: false;
};

export function inspectCollectingHqPresence(input: {
  experimentState: string;
  acquisitionTaskExecuting?: boolean;
  successorGenerating?: boolean;
}): CollectingRoomPresence {
  const collecting = input.experimentState === "COLLECTING" && !input.acquisitionTaskExecuting;
  return {
    validationStation: collecting ? "COLLECTING" : "PRESENT_IDLE",
    signalIntelligence: collecting ? "COLLECTING" : "PRESENT_IDLE",
    deploymentDepot: "PRESENT_IDLE",
    creationLab: input.successorGenerating ? "PRESENT_IDLE" : "PRESENT_IDLE",
    fakeActiveWork: false,
  };
}
