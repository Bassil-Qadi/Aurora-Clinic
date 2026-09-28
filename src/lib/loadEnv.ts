import dotenv from "dotenv";

/**
 * Environment loader for the standalone scripts (seeding, maintenance).
 *
 * Next.js loads .env.local ahead of .env, but `dotenv/config` reads only
 * .env — so a project configured the documented way (`cp .env.example
 * .env.local`) would run fine in the app yet fail in every script with
 * "Please define the MONGODB_URI environment variable".
 *
 * Load both here, .env.local first. dotenv never overwrites a variable that
 * is already set, so .env.local wins and a real environment variable wins
 * over both.
 */
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });
