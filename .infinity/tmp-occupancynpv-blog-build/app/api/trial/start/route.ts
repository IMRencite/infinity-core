import { NextResponse } from "next/server";
import { durableStartProfessionalTrial, durableUser } from "../../../../lib/occupancynpv/durable";

export async function POST() {
  const session = await durableUser();
  if (!session) {
    return NextResponse.redirect(new URL("/occupancynpv/app/login?intent=trial", process.env.NEXT_PUBLIC_SITE_URL || "https://occupancynpv.com"), 303);
  }
  const granted = await durableStartProfessionalTrial();
  if (!granted.ok && granted.reason === "TRIAL_ALREADY_USED") {
    return NextResponse.redirect(new URL("/occupancynpv/app?trial=already", process.env.NEXT_PUBLIC_SITE_URL || "https://occupancynpv.com"), 303);
  }
  if (!granted.ok) {
    return NextResponse.redirect(new URL("/pricing?trial=failed", process.env.NEXT_PUBLIC_SITE_URL || "https://occupancynpv.com"), 303);
  }
  return NextResponse.redirect(new URL("/occupancynpv/app?trial=started", process.env.NEXT_PUBLIC_SITE_URL || "https://occupancynpv.com"), 303);
}
