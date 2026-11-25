import { database } from "@lastro/database";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { tanstackStartCookies } from "better-auth/tanstack-start";

const github =
  process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET
    ? { github: { clientId: process.env.GITHUB_CLIENT_ID, clientSecret: process.env.GITHUB_CLIENT_SECRET } }
    : {};

/** Email and password always; GitHub when the server has GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET. */
export const auth = betterAuth({
  baseURL: process.env.LASTRO_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  database: prismaAdapter(database(), { provider: "postgresql" }),
  emailAndPassword: { enabled: true, minPasswordLength: 10 },
  socialProviders: github,
  plugins: [tanstackStartCookies()],
});

export const githubEnabled = Object.keys(github).length > 0;
