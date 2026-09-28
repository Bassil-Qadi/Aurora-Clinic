import "./loadEnv";
import { connectDB } from "./db";
import Subscription from "../models/Subscription";
import Clinic from "../models/Clinic";
import { getPayPalSubscription } from "./paypal";

/**
 * Find and optionally clean up "phantom" subscriptions created by the old
 * checkout bug, where a clinic was marked `trialing` as soon as it was sent
 * to PayPal — before the payer approved anything.
 *
 *   npx tsx src/lib/auditPhantomSubscriptions.ts          # dry run (default)
 *   npx tsx src/lib/auditPhantomSubscriptions.ts --apply  # actually fix
 *
 * A subscription is a phantom when it has a paypalSubscriptionId whose real
 * status at PayPal is not ACTIVE/APPROVED. Genuine free trials started by
 * startFreeTrial() have no Subscription document and are never touched.
 */
const APPLY = process.argv.includes("--apply");

async function main() {
  await connectDB();

  const suspects = await Subscription.find({
    status: { $in: ["trialing", "active"] },
    paypalSubscriptionId: { $nin: ["", null] },
  }).lean();

  console.log(
    `Checking ${suspects.length} subscription(s) against PayPal…\n`
  );

  const phantoms: any[] = [];

  for (const sub of suspects as any[]) {
    let paypalStatus = "UNKNOWN";
    try {
      const details = await getPayPalSubscription(sub.paypalSubscriptionId);
      paypalStatus = details.status;
    } catch (err: any) {
      // 404 = the subscription never really existed at PayPal.
      paypalStatus = `ERROR (${err?.message})`;
    }

    const healthy = paypalStatus === "ACTIVE" || paypalStatus === "APPROVED";
    console.log(
      `${healthy ? "OK     " : "PHANTOM"}  clinic=${sub.clinicId}  local=${sub.status}  paypal=${paypalStatus}`
    );
    if (!healthy) phantoms.push(sub);
  }

  // Clinics marked trialing with no trial end date — the old bug's signature.
  const badClinics = await Clinic.find({
    subscriptionStatus: "trialing",
    $or: [{ trialEndsAt: { $exists: false } }, { trialEndsAt: null }],
  }).lean();

  console.log(
    `\n${phantoms.length} phantom subscription(s), ${badClinics.length} clinic(s) marked trialing with no trial end date.`
  );

  if (!APPLY) {
    console.log("\nDry run — nothing changed. Re-run with --apply to fix.");
    process.exit(0);
  }

  for (const sub of phantoms) {
    await Subscription.deleteOne({ _id: sub._id });
    await Clinic.updateOne(
      { _id: sub.clinicId, subscriptionPlanId: sub.planId },
      { $set: { subscriptionStatus: "none" }, $unset: { subscriptionPlanId: "" } }
    );
  }

  for (const clinic of badClinics as any[]) {
    await Clinic.updateOne(
      { _id: clinic._id },
      { $set: { subscriptionStatus: "none" } }
    );
  }

  console.log("\n✅ Cleanup applied.");
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Audit failed:", err);
  process.exit(1);
});
