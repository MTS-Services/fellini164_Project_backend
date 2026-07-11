const prisma = require('../config/database');


class WeeklyPlanTaskService {

    extractTasksFromContent(content, weekStartDate) {
        const tasks = [];
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

        // Parse the content to find each day's priorities
        days.forEach((day, index) => {
            const dayDate = new Date(weekStartDate);
            dayDate.setDate(dayDate.getDate() + index);

            // Match patterns like "**Monday's Top 3 Priorities:**" or "**Key Goals for Monday:**"
            const dayRegex = new RegExp(`\\*\\*(?:${day}'s Top \\d+ Priorities|Key Goals for ${day}):\\*\\*([^#]*)`, 'i');
            const match = content.match(dayRegex);

            if (match && match[1]) {
                const taskLines = match[1].trim().split('\n');

                taskLines.forEach(line => {
                    // Match numbered or bulleted lists: "1. Task" or "- Task"
                    const taskMatch = line.match(/^[\s]*(?:\d+\.|[-•*])\s*(.+)/);
                    if (taskMatch && taskMatch[1]) {
                        const taskTitle = taskMatch[1].trim();
                        if (taskTitle && taskTitle.length > 3) {
                            tasks.push({
                                title: taskTitle,
                                dayOfWeek: day,
                                scheduledDate: dayDate,
                                orderIndex: tasks.filter(t => t.dayOfWeek === day).length + 1
                            });
                        }
                    }
                });
            }
        });

        return tasks;
    }


    async createTasksForWeeklyPlan(userId, weeklyPlanId, weekStartDate, content, aiGenerated = true) {
        try {
            const extractedTasks = this.extractTasksFromContent(content, weekStartDate);

            if (extractedTasks.length === 0) {
                console.log('No tasks extracted from weekly plan content');
                return [];
            }

            const createdTasks = await prisma.task.createMany({
                data: extractedTasks.map(task => ({
                    userId,
                    weeklyPlanId,
                    title: task.title,
                    scheduledDate: task.scheduledDate,
                    status: 'TODO',
                    priority: 'MEDIUM',
                    aiGenerated,
                    source: aiGenerated ? 'FROM_PLAN' : 'MANUAL',
                    category: 'PRODUCTIVITY',
                    notes: `${task.dayOfWeek} - Task ${task.orderIndex}`
                }))
            });

            console.log(`✅ Created ${extractedTasks.length} tasks for weekly plan`);

            // Return the created tasks
            const tasks = await prisma.task.findMany({
                where: {
                    weeklyPlanId,
                    userId
                },
                orderBy: [
                    { scheduledDate: 'asc' }
                ]
            });

            return tasks;
        } catch (error) {
            console.error('Error creating tasks for weekly plan:', error);
            throw error;
        }
    }


    async getTasksForDay(weeklyPlanId, dayDate) {
        const startOfDay = new Date(dayDate);
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date(dayDate);
        endOfDay.setHours(23, 59, 59, 999);

        return await prisma.task.findMany({
            where: {
                weeklyPlanId,
                scheduledDate: {
                    gte: startOfDay,
                    lte: endOfDay
                }
            },
            orderBy: [
                { priority: 'desc' },
                { createdAt: 'asc' }
            ]
        });
    }


    async getTasksGroupedByDay(weeklyPlanId) {
        const tasks = await prisma.task.findMany({
            where: {
                weeklyPlanId
            },
            orderBy: [
                { scheduledDate: 'asc' },
                { priority: 'desc' }
            ]
        });

        const grouped = {};
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

        tasks.forEach(task => {
            const date = new Date(task.scheduledDate);
            const dayName = days[date.getDay() === 0 ? 6 : date.getDay() - 1]; // Adjust for Sunday = 0

            if (!grouped[dayName]) {
                grouped[dayName] = {
                    date: task.scheduledDate,
                    tasks: [],
                    completed: 0,
                    total: 0,
                    completionRate: 0
                };
            }

            grouped[dayName].tasks.push(task);
            grouped[dayName].total++;
            if (task.status === 'COMPLETED') {
                grouped[dayName].completed++;
            }
        });

        Object.keys(grouped).forEach(day => {
            const dayData = grouped[day];
            dayData.completionRate = dayData.total > 0
                ? Math.round((dayData.completed / dayData.total) * 100)
                : 0;
        });

        return grouped;
    }


    async calculateWeeklyCompletion(weeklyPlanId) {
        const tasks = await prisma.task.findMany({
            where: {
                weeklyPlanId
            },
            select: {
                status: true
            }
        });

        if (tasks.length === 0) {
            return 0;
        }

        const completed = tasks.filter(t => t.status === 'COMPLETED').length;
        return Math.round((completed / tasks.length) * 100);
    }


    async updateWeeklyPlanCompletion(weeklyPlanId) {
        const completionRate = await this.calculateWeeklyCompletion(weeklyPlanId);

        await prisma.weeklyPlan.update({
            where: { id: weeklyPlanId },
            data: { completionRate }
        });

        return completionRate;
    }

    async completeTask(taskId, userId) {
        const task = await prisma.task.update({
            where: {
                id: taskId,
                userId
            },
            data: {
                status: 'COMPLETED',
                completedAt: new Date()
            }
        });

        // Update weekly plan completion rate
        if (task.weeklyPlanId) {
            await this.updateWeeklyPlanCompletion(task.weeklyPlanId);
        }

        return task;
    }


    async addTaskToDay(userId, weeklyPlanId, dayDate, taskData) {
        const task = await prisma.task.create({
            data: {
                userId,
                weeklyPlanId,
                title: taskData.title,
                description: taskData.description,
                scheduledDate: new Date(dayDate),
                status: 'TODO',
                priority: taskData.priority || 'MEDIUM',
                category: taskData.category || 'PRODUCTIVITY',
                estimatedMinutes: taskData.estimatedMinutes,
                aiGenerated: false,
                source: 'MANUAL'
            }
        });

        return task;
    }


    async getDailySummary(weeklyPlanId) {
        const weeklyPlan = await prisma.weeklyPlan.findUnique({
            where: { id: weeklyPlanId }
        });

        if (!weeklyPlan) {
            throw new Error('Weekly plan not found');
        }

        const grouped = await this.getTasksGroupedByDay(weeklyPlanId);
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

        const summary = [];
        let currentDate = new Date(weeklyPlan.weekStartDate);

        days.forEach(day => {
            const dayData = grouped[day] || {
                date: currentDate,
                tasks: [],
                completed: 0,
                total: 0,
                completionRate: 0
            };

            summary.push({
                day,
                date: new Date(currentDate),
                tasksTotal: dayData.total,
                tasksCompleted: dayData.completed,
                completionRate: dayData.completionRate,
                tasks: dayData.tasks.map(t => ({
                    id: t.id,
                    title: t.title,
                    status: t.status,
                    priority: t.priority,
                    completedAt: t.completedAt
                }))
            });

            currentDate.setDate(currentDate.getDate() + 1);
        });

        return {
            weeklyPlanId,
            weekStartDate: weeklyPlan.weekStartDate,
            weekEndDate: weeklyPlan.weekEndDate,
            overallCompletionRate: weeklyPlan.completionRate,
            dailySummary: summary
        };
    }
}

module.exports = new WeeklyPlanTaskService();
