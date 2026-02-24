-- Add stripeCheckoutSessionId column to Payment table
ALTER TABLE "Payment" ADD COLUMN "stripeCheckoutSessionId" TEXT;

-- Add unique constraint
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_stripeCheckoutSessionId_key" UNIQUE ("stripeCheckoutSessionId");
