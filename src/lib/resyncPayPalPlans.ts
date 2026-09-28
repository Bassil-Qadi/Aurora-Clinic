import "./loadEnv";
import { connectDB } from "./db";
import SubscriptionPlan from "../models/SubscriptionPlan";
import Subscription from "../models/Subscription";
import {
  getPayPalPlan,
  createPayPalPlan,
  deactivatePayPalPlan,
  isPayPalConfigured,
} from "./paypal";

/**
 * Replace PayPal billing plans that carry a TRIAL billing cycle.
 *
 * The app grants its own free trial at registration (startFreeTrial), so a
 * trial cycle on the PayPal plan stacks a second free period on top and
 * pushes the first real charge out twice as far.
 *
 * PayPal billing plans are immutable, so fixing this means creating a
 * replacement plan (reusing the same product) and deactivating the old one.
 *
 *   npx tsx src/lib/resyncPayPalPlans.ts          # dry run (default)
 *   npx tsx src/lib/resyncPayPalPlans.ts --apply  # actually replace
 */
const APPLY = process.argv.includes("--apply");

async function main() {
  if (!isPayPalConfigured()) {
    console.error("PayPal is not configured.");
    process.exit(1);
  }

  await connectDB();

  console.log(
    `Mode: ${process.env.PAYPAL_MODE?.trim() || "sandbox"}  |  ${
      APPLY ? "APPLY" : "DRY RUN"
    }\n`
  );

  const plans = (await SubscriptionPlan.find({
    paypalPlanId: { $nin: ["", null] },
  })) as any[];

  if (!plans.length) {
    console.log("No plans with a PayPal plan ID.");
    process.exit(0);
  }

  for (const plan of plans) {
    const details = await getPayPalPlan(plan.paypalPlanId);
    const cycles = details.billing_cycles || [];
    const trial = cycles.find((c: any) => c.tenure_type === "TRIAL");

    if (!trial) {
      console.log(`OK       ${plan.name} — no trial cycle, leaving alone.`);
      continue;
    }

    const activeSubs = await Subscription.countDocuments({
      planId: plan._id,
      status: { $in: ["active", "trialing", "past_due"] },
    });

    console.log(
      `REPLACE  ${plan.name} — has ${trial.frequency.interval_count}-${trial.frequency.interval_unit} trial; ${activeSubs} active subscriber(s)`
    );
    console.log(`           old plan: ${plan.paypalPlanId}`);

    if (activeSubs > 0) {
      console.log(
        "           ⚠ existing subscribers keep billing on the old plan; only new checkouts use the replacement."
      );
    }

    if (!APPLY) continue;

    // Reuse the existing product so catalog history stays intact.
    const replacement = await createPayPalPlan({
      productId: plan.paypalProductId,
      name: plan.name,
      description: plan.description || `${plan.name} subscription plan`,
      price: plan.price,
      currency: plan.currency || "USD",
      interval: plan.interval || "MONTH",
      trialDays: 0,
    });

    const oldPlanId = plan.paypalPlanId;
    plan.paypalPlanId = replacement.id;
    await plan.save();

    await deactivatePayPalPlan(oldPlanId);

    console.log(`           new plan: ${replacement.id}  ✅ replaced`);
  }

  if (!APPLY) {
    console.log("\nDry run — nothing changed. Re-run with --apply.");
  } else {
    console.log("\n✅ Done.");
  }
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Failed:", err);
  process.exit(1);
});
