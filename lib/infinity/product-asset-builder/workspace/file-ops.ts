import type { FileOperation } from "../constants";
import type { FileOpRecord } from "../types";
import { VentureSandbox } from "./sandbox";

export async function applyFileOperation(
  sandbox: VentureSandbox,
  operation: FileOperation,
  relativePath: string,
  content?: string,
  moveTo?: string,
): Promise<FileOpRecord> {
  switch (operation) {
    case "CREATE":
    case "PATCH": {
      if (content === undefined) throw new Error("content required for CREATE/PATCH");
      const result = operation === "CREATE"
        ? await sandbox.writeTextFile(relativePath, content)
        : await sandbox.patchTextFile(relativePath, () => content);
      return { operation, relativePath, contentHash: result.contentHash, byteSize: result.byteSize };
    }
    case "READ": {
      const text = await sandbox.readTextFile(relativePath);
      const hash = await import("node:crypto").then((c) =>
        c.createHash("sha256").update(text, "utf8").digest("hex"),
      );
      return { operation, relativePath, contentHash: hash, byteSize: Buffer.byteLength(text, "utf8") };
    }
    case "DELETE":
      await sandbox.deleteFile(relativePath);
      return { operation, relativePath };
    case "MOVE":
      if (!moveTo) throw new Error("moveTo required for MOVE");
      await sandbox.moveFile(relativePath, moveTo);
      return { operation, relativePath: `${relativePath} -> ${moveTo}` };
    default:
      throw new Error(`Unknown operation: ${operation}`);
  }
}
