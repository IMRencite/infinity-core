import { redirect } from "next/navigation";

export const metadata = { robots: { index: false, follow: true } };

export default function Page() {
  redirect("/lease-comparison/how-do-free-rent-and-ti-allowances-affect-npv");
}
