const prisma = require("../config/database");
const plannerService = require("./plannerService");

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const HABIT_TRACKER_WINDOW_DAYS = 10;
const HABIT_TRACKER_LIMIT = 3;
const SCHEDULE_LIMIT = 8;

class DashboardService {
  firstNameFromUser(user) {
    const fullName = user?.fullName?.trim();
    if (fullName) return fullName.split(/\s+/)[0];
    const emailName = user?.email?.split("@")[0];
    if (emailName) return emailName;
    return "there";
  }

  // Get the hour of the day in the given timezone
  hourInTimezone(date, timeZone) {
    const hourText = new Intl.DateTimeFormat("en-GB", {
      timeZone,
      hour: "2-digit",
      hour12: false,
    }).format(date);
    const hour = Number(hourText);
    return Number.isFinite(hour) ? hour % 24 : date.getHours();
  }

  greetingForHour(hour) {
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  }

  formatDurationLabel(totalMinutes) {
    const minutes = Math.max(0, Math.round(totalMinutes || 0));
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    if (hours > 0 && rest > 0) return `${hours}h ${rest}m`;
    if (hours > 0) return `${hours}h`;
    return `${rest}m`;
  }

  formatClock(time) {
    const minutes = plannerService.timeToMinutes(time);
    if (minutes == null) return null;
    const hours24 = Math.floor(minutes / 60);
    const mins = String(minutes % 60).padStart(2, "0");
    const suffix = hours24 >= 12 ? "PM" : "AM";
    const hours12 = hours24 % 12 || 12;
    return `${String(hours12).padStart(2, "0")}:${mins} ${suffix}`;
  }

  itemDurationMinutes(item) {
    const start = plannerService.timeToMinutes(item.startTime);
    const end = plannerService.timeToMinutes(item.endTime);
    if (start != null && end != null && end > start) return end - start;
    if (item.estimatedMinutes) {
      return Math.min(Math.max(item.estimatedMinutes, 5), 240);
    }
    return item.itemType === "HABIT" ? 15 : 30;
  }

  percent(completed, total) {
    if (!total) return 0;
    return Math.round((completed / total) * 100);
  }

  habitScoreLabel(percent) {
    if (percent >= 80) return "Great consistency";
    if (percent >= 50) return "Building consistency";
    if (percent > 0) return "Keep showing up";
    return "Start today";
  }

  goalProgressLabel(percent) {
    if (percent >= 70) return "On track";
    if (percent >= 40) return "Making progress";
    if (percent > 0) return "Needs attention";
    return "No active goals";
  }

  dailySubtitle(percent, completed, total) {
    if (!total) return "Plan your day to start building momentum.";
    if (percent >= 75) return "You're on a roll — keep it going.";
    if (completed > 0) return "Stay on track and build momentum today.";
    return "A great day starts with one completed item.";
  }

  categoryLabel(category) {
    if (!category) return "Personal";
    const map = {
      HEALTH: "Wellness",
      FITNESS: "Wellness",
      WELLNESS: "Wellness",
      CAREER: "Work",
      PRODUCTIVITY: "Work",
      PERSONAL: "Personal",
      EDUCATION: "Education",
      FINANCE: "Finance",
    };
    return map[category] || category;
  }

  async getDashboard(userId) {
    const timeZone = await plannerService.resolveUserTimezone(userId);
    const now = new Date();
    const today = plannerService.getDayBounds(now, timeZone);
    const week = plannerService.getWeekBounds(now, timeZone);
    const habitWindowStart = new Date(today.start);
    habitWindowStart.setUTCDate(
      habitWindowStart.getUTCDate() - (HABIT_TRACKER_WINDOW_DAYS - 1),
    );

    const [user, todayItemsRaw, weekItemsRaw, tasksDueToday, habits, goals] =
      await Promise.all([
        prisma.user.findUnique({
          where: { id: userId },
          select: { id: true, fullName: true, email: true, avatar: true },
        }),
        prisma.plannerItem.findMany({
          where: { userId, date: { gte: today.start, lte: today.end } },
          include: plannerService.buildItemInclude(),
          orderBy: [
            { startTime: "asc" },
            { orderIndex: "asc" },
            { createdAt: "asc" },
          ],
        }),
        prisma.plannerItem.findMany({
          where: { userId, date: { gte: week.start, lte: week.end } },
          include: {
            task: { select: { estimatedMinutes: true } },
          },
        }),
        prisma.task.findMany({
          where: {
            userId,
            parentTaskId: null,
            status: { notIn: ["CANCELED"] },
            dueDate: { gte: today.start, lte: today.end },
          },
          select: { id: true, status: true },
        }),
        prisma.habit.findMany({
          where: { userId, status: "ACTIVE", isActive: true },
          select: {
            id: true,
            name: true,
            category: true,
            currentStreak: true,
            targetTimesPerDay: true,
            completions: {
              where: { date: { gte: habitWindowStart, lte: today.end } },
              select: { date: true },
            },
          },
          orderBy: { currentStreak: "desc" },
        }),
        prisma.goal.findMany({
          where: { userId, status: "ACTIVE" },
          select: { id: true, progress: true },
        }),
      ]);

    if (!user) {
      const error = new Error("User not found");
      error.statusCode = 404;
      throw error;
    }

    const todayItems = todayItemsRaw.map((item) =>
      plannerService.formatBoardItem(item),
    );

    const taskProgress = this.buildTaskProgress(todayItems, tasksDueToday);
    const focusMinutesToday = todayItems
      .filter((item) => item.isCompleted)
      .reduce((sum, item) => sum + this.itemDurationMinutes(item), 0);

    const habitsCompletedToday = habits.filter((habit) =>
      habit.completions.some(
        (row) => plannerService.toDateOnly(row.date, "UTC") === today.dateOnly,
      ),
    ).length;
    const habitScorePercent = this.percent(
      habitsCompletedToday,
      habits.length,
    );

    const goalPercent =
      goals.length > 0
        ? Math.round(
            goals.reduce((sum, goal) => sum + (goal.progress || 0), 0) /
              goals.length,
          )
        : 0;

    const firstName = this.firstNameFromUser(user);
    const greeting = this.greetingForHour(this.hourInTimezone(now, timeZone));

    return {
      date: today.dateOnly,
      greeting: {
        text: `${greeting}, ${firstName}!`,
        subtitle: this.dailySubtitle(
          taskProgress.percent,
          taskProgress.completed,
          taskProgress.total,
        ),
        firstName,
      },
      dailyProgress: {
        percent: taskProgress.percent,
        completed: taskProgress.completed,
        total: taskProgress.total,
        label: taskProgress.total
          ? `${taskProgress.completed} of ${taskProgress.total} tasks completed`
          : "No tasks scheduled today",
      },
      stats: {
        tasksToday: {
          completed: taskProgress.completed,
          total: taskProgress.total,
          label: `${taskProgress.completed}/${taskProgress.total} Completed`,
        },
        focusTime: {
          minutes: focusMinutesToday,
          label: `${this.formatDurationLabel(focusMinutesToday)} Today`,
        },
        habitScore: {
          percent: habitScorePercent,
          completedToday: habitsCompletedToday,
          activeHabits: habits.length,
          label: this.habitScoreLabel(habitScorePercent),
        },
        goalProgress: {
          percent: goalPercent,
          activeGoals: goals.length,
          label: this.goalProgressLabel(goalPercent),
        },
      },
      todaySchedule: todayItems.slice(0, SCHEDULE_LIMIT).map((item) => ({
        id: item.id,
        itemType: item.itemType,
        title: item.title,
        startTime: item.startTime,
        endTime: item.endTime,
        startTimeLabel: this.formatClock(item.startTime),
        durationMinutes: this.itemDurationMinutes(item),
        durationLabel: this.formatDurationLabel(this.itemDurationMinutes(item)),
        category: item.category,
        categoryLabel: this.categoryLabel(item.category),
        isCompleted: item.isCompleted,
        priority: item.priority,
        status: item.status,
      })),
      weeklyFocus: this.buildWeeklyFocus(weekItemsRaw, week),
      habits: this.buildHabitTracker(habits, today.dateOnly),
      insights: this.buildInsights({
        taskProgress,
        focusMinutesToday,
        habits,
        todayItems,
        weekItems: weekItemsRaw,
      }),
    };
  }

  buildTaskProgress(todayItems, tasksDueToday) {
    const plannerTasks = todayItems.filter((item) => item.itemType === "TASK");

    if (plannerTasks.length > 0) {
      const completed = plannerTasks.filter(
        (item) =>
          item.isCompleted || item.status === "COMPLETED",
      ).length;
      return {
        completed,
        total: plannerTasks.length,
        percent: this.percent(completed, plannerTasks.length),
      };
    }

    const total = tasksDueToday.length;
    const completed = tasksDueToday.filter(
      (task) => task.status === "COMPLETED",
    ).length;
    return {
      completed,
      total,
      percent: this.percent(completed, total),
    };
  }

  buildWeeklyFocus(weekItems, week) {
    const days = [];
    const cursor = new Date(week.start);

    for (let i = 0; i < 7; i += 1) {
      const date = plannerService.toDateOnly(cursor, "UTC");
      const minutes = weekItems
        .filter((item) => plannerService.toDateOnly(item.date, "UTC") === date)
        .reduce((sum, item) => {
          const estimatedMinutes = item.task?.estimatedMinutes || null;
          return (
            sum +
            this.itemDurationMinutes({
              startTime: item.startTime,
              endTime: item.endTime,
              estimatedMinutes,
              itemType: item.itemType,
            })
          );
        }, 0);

      days.push({
        day: WEEKDAY_LABELS[i],
        date,
        minutes,
        hours: Math.round((minutes / 60) * 10) / 10,
      });
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    return {
      range: "THIS_WEEK",
      startDate: plannerService.toDateOnly(week.start, "UTC"),
      endDate: plannerService.toDateOnly(week.end, "UTC"),
      days,
    };
  }

  buildHabitTracker(habits, todayDateOnly) {
    return habits.slice(0, HABIT_TRACKER_LIMIT).map((habit) => {
      const uniqueDays = new Set(
        habit.completions.map((row) =>
          plannerService.toDateOnly(row.date, "UTC"),
        ),
      );
      const current = uniqueDays.size;
      const target = HABIT_TRACKER_WINDOW_DAYS;
      const completedToday = uniqueDays.has(todayDateOnly);

      return {
        id: habit.id,
        name: habit.name,
        category: habit.category,
        current,
        target,
        label: `${current}/${target}`,
        percent: this.percent(current, target),
        streak: habit.currentStreak || 0,
        completedToday,
      };
    });
  }

  buildInsights({
    taskProgress,
    focusMinutesToday,
    habits,
    todayItems,
    weekItems,
  }) {
    const insights = [];

    if (taskProgress.completed > 0) {
      insights.push({
        type: "MOMENTUM",
        title: "Momentum",
        message: `Great momentum! You've completed ${taskProgress.completed} task${
          taskProgress.completed === 1 ? "" : "s"
        } today. Keep it going!`,
      });
    } else if (taskProgress.total > 0) {
      insights.push({
        type: "MOMENTUM",
        title: "Momentum",
        message:
          "Your day is ready. Complete the first task to build momentum.",
      });
    } else {
      insights.push({
        type: "MOMENTUM",
        title: "Momentum",
        message: "Schedule a few tasks today to start a productive streak.",
      });
    }

    const peak = this.resolveFocusPeak(todayItems, weekItems, focusMinutesToday);
    insights.push({
      type: "FOCUS_PEAK",
      title: "Focus peak",
      message: peak,
    });

    const topStreak = habits.reduce(
      (max, habit) => Math.max(max, habit.currentStreak || 0),
      0,
    );
    if (topStreak >= 5) {
      insights.push({
        type: "CONSISTENCY",
        title: "Consistency",
        message:
          "Consistency builds results. You're maintaining strong habits. Stay consistent!",
      });
    } else if (habits.length > 0) {
      insights.push({
        type: "CONSISTENCY",
        title: "Consistency",
        message:
          "Small daily habits compound. Check in on one habit to keep your streak alive.",
      });
    } else {
      insights.push({
        type: "CONSISTENCY",
        title: "Consistency",
        message: "Add a simple daily habit to start building consistency.",
      });
    }

    return insights;
  }

  resolveFocusPeak(todayItems, weekItems, focusMinutesToday) {
    const buckets = { morning: 0, afternoon: 0, evening: 0 };
    const source = todayItems.length ? todayItems : weekItems;

    for (const item of source) {
      const start = plannerService.timeToMinutes(item.startTime);
      if (start == null) continue;
      const minutes = this.itemDurationMinutes({
        startTime: item.startTime,
        endTime: item.endTime,
        estimatedMinutes: item.estimatedMinutes || item.task?.estimatedMinutes,
        itemType: item.itemType,
      });
      if (start < 12 * 60) buckets.morning += minutes;
      else if (start < 17 * 60) buckets.afternoon += minutes;
      else buckets.evening += minutes;
    }

    const peakEntry = Object.entries(buckets).sort((a, b) => b[1] - a[1])[0];
    if (peakEntry && peakEntry[1] > 0) {
      return `Your highest productivity is usually in the ${peakEntry[0]}.`;
    }
    if (focusMinutesToday > 0) {
      return "You're putting in focused time today — protect your next deep-work block.";
    }
    return "Block a morning focus session to get your best work done first.";
  }
}

module.exports = new DashboardService();
