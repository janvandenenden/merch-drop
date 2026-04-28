import { createAuthClient } from "better-auth/client";
import { emailOTPClient, inferAdditionalFields } from "better-auth/client/plugins";
import type { auth } from "./auth";

export const authClient = createAuthClient({
  plugins: [emailOTPClient(), inferAdditionalFields<typeof auth>()],
});
