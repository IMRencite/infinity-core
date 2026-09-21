const FAVC1_CYCLE_KEY_EXCLUSION =
  /(?:^|[\s_-])(e2e|fixture|mock|simulation|capability[_-]?test|strong_in_policy|verification)(?:[\s_-]|$)|_test\b|test_/i;

export function isLegitimateFavc1CycleKey(cycleKey: string): boolean {
  return cycleKey.length > 0 && !FAVC1_CYCLE_KEY_EXCLUSION.test(cycleKey);
}

export function isVerificationVentureName(name: string): boolean {
  return FAVC1_CYCLE_KEY_EXCLUSION.test(name);
}
