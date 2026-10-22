-- Notification Preferences (Settings toggles)
ALTER TABLE "UserSettings" ADD COLUMN IF NOT EXISTS "habitReminders" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "UserSettings" ADD COLUMN IF NOT EXISTS "alerts" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "UserSettings" ADD COLUMN IF NOT EXISTS "productUpdates" BOOLEAN NOT NULL DEFAULT true;
