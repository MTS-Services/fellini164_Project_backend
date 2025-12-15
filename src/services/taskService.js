const prisma = require('../config/database');

class TaskService {
  // Get all tasks
  async getAllTasks(userId, filters = {}) {
    const where = { userId };
    
    if (filters.status) {
      where.status = filters.status;
    }
    
    if (filters.priority) {
      where.priority = filters.priority;
    }
    
    if (filters.category) {
      where.category = filters.category;
    }
    
    const tasks = await prisma.task.findMany({
      where,
      orderBy: [
        { priority: 'desc' },
        { dueDate: 'asc' }
      ]
    });
    
    return tasks;
  }
  
  // Get task by ID
  async getTaskById(taskId) {
    const task = await prisma.task.findUnique({
      where: { id: taskId }
    });
    
    if (!task) {
      throw new Error('Task not found');
    }
    
    return task;
  }
  
  // Create task
  async createTask(taskData) {
    const task = await prisma.task.create({
      data: {
        ...taskData,
        dueDate: taskData.dueDate ? new Date(taskData.dueDate) : null
      }
    });
    
    return task;
  }
  
  // Update task
  async updateTask(taskId, updateData) {
    if (updateData.dueDate) {
      updateData.dueDate = new Date(updateData.dueDate);
    }
    
    // If marking as completed, set completedAt
    if (updateData.status === 'COMPLETED' && !updateData.completedAt) {
      updateData.completedAt = new Date();
    }
    
    const task = await prisma.task.update({
      where: { id: taskId },
      data: updateData
    });
    
    return task;
  }
  
  // Delete task
  async deleteTask(taskId) {
    await prisma.task.delete({
      where: { id: taskId }
    });
  }
  
  // Get overdue tasks
  async getOverdueTasks(userId) {
    const tasks = await prisma.task.findMany({
      where: {
        userId,
        status: { not: 'COMPLETED' },
        dueDate: {
          lt: new Date()
        }
      },
      orderBy: { dueDate: 'asc' }
    });
    
    return tasks;
  }
  
  // Get task statistics
  async getTaskStats(userId) {
    const [total, completed, pending, overdue] = await Promise.all([
      prisma.task.count({ where: { userId } }),
      prisma.task.count({ where: { userId, status: 'COMPLETED' } }),
      prisma.task.count({ 
        where: { 
          userId, 
          status: { in: ['TODO', 'IN_PROGRESS'] } 
        } 
      }),
      prisma.task.count({
        where: {
          userId,
          status: { not: 'COMPLETED' },
          dueDate: { lt: new Date() }
        }
      })
    ]);
    
    return {
      total,
      completed,
      pending,
      overdue,
      completionRate: total > 0 ? (completed / total) * 100 : 0
    };
  }
}

module.exports = new TaskService();
