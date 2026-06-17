-- Add paid status to expenses. Defaults true so all existing rows are "paid".
-- Unpaid (false) rows represent planned kid payments still "to pay" (לתשלום).
ALTER TABLE "expenses" ADD COLUMN "paid" boolean DEFAULT true NOT NULL;