export type ContextManifestEntry = {
  recordType: string;
  recordId: string;
  version: string;
  hash: string;
  organizationId: string;
  inclusionReason: string;
};

export function contextRecordCount(manifest: ContextManifestEntry[]): number {
  return manifest.length;
}
