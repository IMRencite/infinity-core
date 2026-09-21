import { redirect } from "next/navigation";
import { durableUser } from "../../../../../lib/occupancynpv/durable";

export default async function OccupancynpvCheckoutCompletePage() {
  const session = await durableUser();
  if (!session) redirect("/occupancynpv/app/login");
  redirect("/occupancynpv/app");
}
