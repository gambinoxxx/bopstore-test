import { serve } from "inngest/next";
import { inngest } from "@/inngest/functions";
import { syncUserCreation, syncUserUpdation, syncUserDeletion } from "@/inngest/functions";  
// Create an API that serves zero functions
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    syncUserCreation,
    syncUserUpdation,
    syncUserDeletion
  ],
});