import { verifyExistingDirectResponseSuccessorLiveReadOnly } from "../lib/infinity/market-validation-experiment/cre-dr-successor-live-readonly-verify";

const result = await verifyExistingDirectResponseSuccessorLiveReadOnly();
const { hq, ...rest } = result;
process.stdout.write(
  `${JSON.stringify(
    {
      ...rest,
      hq: {
        ...hq,
        midRunPhases: hq.midRun.map((item) => item.phase),
      },
    },
    null,
    2,
  )}\n`,
);
