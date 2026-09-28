import { loadServerEnvFromLocalFile, reloadVercelFromLocalFile } from "../lib/infinity/communication-provider/load-local-env";
import { VercelDomainBindingAdapter } from "../lib/infinity/commercialization/providers/vercel/domain-binding-adapter";

const id = process.argv[2];
if (!id?.startsWith("dpl_")) {
  console.error("usage: vercel-deployment-inspect <dpl_id>");
  process.exit(1);
}
async function main() {
  loadServerEnvFromLocalFile();
  reloadVercelFromLocalFile();
  const vercel = new VercelDomainBindingAdapter();
  const status = await vercel.getDeployment(id);
  console.log(JSON.stringify(status, null, 2));
}
void main();
