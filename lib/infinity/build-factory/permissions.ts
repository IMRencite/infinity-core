export const BUILD_FACTORY_PERMISSIONS = [
  "build.read",
  "build.workspace.write",
  "blueprint.read",
  "worker_result.write",
  "internal_artifact.write",
  "event.emit",
] as const;

export type BuildFactoryPermission = (typeof BUILD_FACTORY_PERMISSIONS)[number];
