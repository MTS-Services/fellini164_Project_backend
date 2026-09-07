-- Manual apply (if you are not using prisma migrate):
--   psql "$DATABASE_URL" -f prisma/sql/add_habit_time_slots.sql
-- Same SQL as prisma/migrations/20260907000000_habit_time_slots/migration.sql

CREATE TABLE IF NOT EXISTS "habit_time_slots" (
    "id" TEXT NOT NULL,
    "habitId" TEXT NOT NULL,
    "fromTime" TEXT NOT NULL,
    "toTime" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "habit_time_slots_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "habit_time_slots_habitId_orderIndex_key" ON "habit_time_slots"("habitId", "orderIndex");
CREATE INDEX IF NOT EXISTS "habit_time_slots_habitId_idx" ON "habit_time_slots"("habitId");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'habit_time_slots_habitId_fkey'
    ) THEN
        ALTER TABLE "habit_time_slots"
        ADD CONSTRAINT "habit_time_slots_habitId_fkey"
        FOREIGN KEY ("habitId") REFERENCES "Habit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

ALTER TABLE "HabitCompletion" ADD COLUMN IF NOT EXISTS "timeSlotId" TEXT;
CREATE INDEX IF NOT EXISTS "HabitCompletion_timeSlotId_idx" ON "HabitCompletion"("timeSlotId");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'HabitCompletion_timeSlotId_fkey'
    ) THEN
        ALTER TABLE "HabitCompletion"
        ADD CONSTRAINT "HabitCompletion_timeSlotId_fkey"
        FOREIGN KEY ("timeSlotId") REFERENCES "habit_time_slots"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

ALTER TABLE "PlannerItem" ADD COLUMN IF NOT EXISTS "habitTimeSlotId" TEXT;
CREATE INDEX IF NOT EXISTS "PlannerItem_habitTimeSlotId_idx" ON "PlannerItem"("habitTimeSlotId");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'PlannerItem_habitTimeSlotId_fkey'
    ) THEN
        ALTER TABLE "PlannerItem"
        ADD CONSTRAINT "PlannerItem_habitTimeSlotId_fkey"
        FOREIGN KEY ("habitTimeSlotId") REFERENCES "habit_time_slots"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

INSERT INTO "habit_time_slots" ("id", "habitId", "fromTime", "toTime", "orderIndex", "createdAt", "updatedAt")
SELECT
    gen_random_uuid()::text,
    h."id",
    h."reminderTime",
    to_char(
        (to_timestamp(h."reminderTime", 'HH24:MI') + INTERVAL '30 minutes'),
        'HH24:MI'
    ),
    0,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "Habit" h
WHERE h."reminderTime" IS NOT NULL
  AND btrim(h."reminderTime") <> ''
  AND NOT EXISTS (
      SELECT 1 FROM "habit_time_slots" s WHERE s."habitId" = h."id"
  );
