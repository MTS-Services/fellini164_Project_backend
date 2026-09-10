const WEEK_DAYS = [
  "SUNDAY",
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
];

const WEEK_DAY_ALIASES = {
  sun: "SUNDAY",
  sunday: "SUNDAY",
  mon: "MONDAY",
  monday: "MONDAY",
  tue: "TUESDAY",
  tues: "TUESDAY",
  tuesday: "TUESDAY",
  wed: "WEDNESDAY",
  wednesday: "WEDNESDAY",
  thu: "THURSDAY",
  thur: "THURSDAY",
  thurs: "THURSDAY",
  thursday: "THURSDAY",
  fri: "FRIDAY",
  friday: "FRIDAY",
  sat: "SATURDAY",
  saturday: "SATURDAY",
};

const MONTHS = {
  jan: 0,
  january: 0,
  feb: 1,
  february: 1,
  mar: 2,
  march: 2,
  apr: 3,
  april: 3,
  may: 4,
  jun: 5,
  june: 5,
  jul: 6,
  july: 6,
  aug: 7,
  august: 7,
  sep: 8,
  sept: 8,
  september: 8,
  oct: 9,
  october: 9,
  nov: 10,
  november: 10,
  dec: 11,
  december: 11,
};

function startOfDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date, days) {
  const d = startOfDay(date);
  d.setDate(d.getDate() + days);
  return d;
}

function toDateOnly(date) {
  const d = startOfDay(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function weekdayName(date) {
  return WEEK_DAYS[startOfDay(date).getDay()];
}

function targetDaysForRange(startDate, durationDays) {
  const days = [];
  const seen = new Set();
  for (let i = 0; i < durationDays; i += 1) {
    const name = weekdayName(addDays(startDate, i));
    if (!seen.has(name)) {
      seen.add(name);
      days.push(name);
    }
  }
  return days;
}

function nextWeekdayOnOrAfter(fromDate, weekday) {
  const target = WEEK_DAYS.indexOf(weekday);
  if (target < 0) return startOfDay(fromDate);
  const start = startOfDay(fromDate);
  const diff = (target - start.getDay() + 7) % 7;
  return addDays(start, diff);
}

function parseExplicitDate(text, today = new Date()) {
  const raw = String(text || "");
  const year = startOfDay(today).getFullYear();

  const iso = raw.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/);
  if (iso) {
    const d = startOfDay(new Date(`${iso[1]}-${iso[2]}-${iso[3]}T00:00:00`));
    if (!Number.isNaN(d.getTime())) return d;
  }

  const dmy = raw.match(/\b(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})\b/);
  if (dmy) {
    const day = Number(dmy[1]);
    const month = Number(dmy[2]) - 1;
    let y = Number(dmy[3]);
    if (y < 100) y += 2000;
    const d = startOfDay(new Date(y, month, day));
    if (!Number.isNaN(d.getTime()) && d.getDate() === day) return d;
  }

  const named = raw.match(
    /\b(?:on|from|starting|start(?:ing)?(?:\s+on)?)\s+(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]+)\s*,?\s*(20\d{2})?\b/i,
  );
  const namedAlt = raw.match(
    /\b(?:on|from|starting|start(?:ing)?(?:\s+on)?)\s+([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?\s*,?\s*(20\d{2})?\b/i,
  );
  const namedBare = raw.match(
    /\b(\d{1,2})(?:st|nd|rd|th)?\s+(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s*,?\s*(20\d{2})?\b/i,
  );

  const hit = named || namedAlt || namedBare;
  if (hit) {
    let day;
    let monthName;
    let y;
    if (named && hit === named) {
      day = Number(hit[1]);
      monthName = hit[2];
      y = hit[3] ? Number(hit[3]) : year;
    } else if (namedAlt && hit === namedAlt) {
      monthName = hit[1];
      day = Number(hit[2]);
      y = hit[3] ? Number(hit[3]) : year;
    } else {
      day = Number(hit[1]);
      monthName = hit[2];
      y = hit[3] ? Number(hit[3]) : year;
    }
    const month = MONTHS[String(monthName || "").toLowerCase()];
    if (month != null && day >= 1 && day <= 31) {
      const d = startOfDay(new Date(y, month, day));
      if (!Number.isNaN(d.getTime()) && d.getDate() === day) return d;
    }
  }

  return null;
}

function parseWeekday(text) {
  const raw = String(text || "").toLowerCase();
  const match = raw.match(
    /\b(?:from|starting|start(?:ing)?(?:\s+on)?|on|this|next)\s+(sunday|monday|tuesday|wednesday|thursday|friday|saturday|sun|mon|tue|tues|wed|thu|thur|thurs|fri|sat)\b/,
  );
  if (match) return WEEK_DAY_ALIASES[match[1]];

  const bare = raw.match(
    /\b(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/,
  );
  if (
    bare &&
    /\b(from|starting|start|on|this|next|week|days?)\b/.test(raw)
  ) {
    return WEEK_DAY_ALIASES[bare[1]];
  }
  return null;
}

function parseDurationDays(text) {
  const raw = String(text || "").toLowerCase();

  const weeks = raw.match(/\b(?:for\s+)?(\d+)\s+weeks?\b/);
  if (weeks) {
    const n = Number(weeks[1]);
    if (n >= 1 && n <= 12) return n * 7;
  }

  const days = raw.match(/\b(?:for\s+)?(\d+)\s+days?\b/);
  if (days) {
    const n = Number(days[1]);
    if (n >= 1 && n <= 90) return n;
  }

  if (
    /\b(for\s+)?(a\s+)?week\b/.test(raw) ||
    /\bthis week\b/.test(raw) ||
    /\bnext 7 days\b/.test(raw) ||
    /\bwhole week\b/.test(raw) ||
    /\bentire week\b/.test(raw) ||
    /\b7 days\b/.test(raw)
  ) {
    return 7;
  }

  return null;
}

/**
 * "for a week" → 7 days from today.
 * "from Monday for a week" / "from 2026-09-15 for a week" → 7 days from that start.
 */
function resolveHabitWeekSchedule(prompt, today = new Date()) {
  const todayStart = startOfDay(today);
  const durationDays = parseDurationDays(prompt);
  const explicitDate = parseExplicitDate(prompt, todayStart);
  const weekday = parseWeekday(prompt);

  if (!durationDays && !explicitDate && !weekday) {
    return null;
  }

  let start = todayStart;
  if (explicitDate) {
    start = explicitDate < todayStart ? todayStart : explicitDate;
  } else if (weekday) {
    start = nextWeekdayOnOrAfter(todayStart, weekday);
  }

  const days = durationDays || (explicitDate || weekday ? 1 : null);
  if (!days) return null;

  const end = addDays(start, days - 1);
  const targetDays = targetDaysForRange(start, days);

  return {
    startDate: start,
    endDate: end,
    startDateOnly: toDateOnly(start),
    endDateOnly: toDateOnly(end),
    durationDays: days,
    targetDays,
    label: `${toDateOnly(start)} → ${toDateOnly(end)} (${days} day${days === 1 ? "" : "s"})`,
  };
}

module.exports = {
  WEEK_DAYS,
  startOfDay,
  addDays,
  toDateOnly,
  weekdayName,
  resolveHabitWeekSchedule,
};
