import { CANONICAL_INFINITY_REPO, CANONICAL_PACKAGE_NAME, type RepositoryRootEvidence } from "./types";

export function wrongParentInfinityDirectoryFixture(): RepositoryRootEvidence {
  return {
    cwd: "C:\\Users\\Antivist\\Desktop\\Infinity",
    gitRevParse: null,
    intendedRoot: CANONICAL_INFINITY_REPO,
    packageJsonExists: false,
    packageName: null,
    tsconfigExists: false,
    nextConfigDiscoverable: false,
  };
}

export function verifiedInfinityCoreFixture(): RepositoryRootEvidence {
  return {
    cwd: CANONICAL_INFINITY_REPO,
    gitRevParse: CANONICAL_INFINITY_REPO,
    intendedRoot: CANONICAL_INFINITY_REPO,
    packageJsonExists: true,
    packageName: CANONICAL_PACKAGE_NAME,
    tsconfigExists: true,
    nextConfigDiscoverable: true,
  };
}
