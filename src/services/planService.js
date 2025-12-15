const prisma = require('../config/database');

class PlanService {
  // Get daily plans
  async getDailyPlans(userId, filters = {}) {
    const where = { userId };
    
    if (filters.date) {
      where.date = new Date(filters.date);
    }
    
    if (filters.status) {
      where.status = filters.status;
    }
    
    const plans = await prisma.dailyPlan.findMany({
      where,
      orderBy: { date: 'desc' }
    });
    
    return plans;
  }
  
  // Create daily plan
  async createDailyPlan(planData) {
    const plan = await prisma.dailyPlan.create({
      data: {
        ...planData,
        date: new Date(planData.date)
      }
    });
    
    return plan;
  }
  
  // Get weekly plans
  async getWeeklyPlans(userId, filters = {}) {
    const where = { userId };
    
    if (filters.status) {
      where.status = filters.status;
    }
    
    const plans = await prisma.weeklyPlan.findMany({
      where,
      orderBy: { weekStartDate: 'desc' }
    });
    
    return plans;
  }
  
  // Create weekly plan
  async createWeeklyPlan(planData) {
    const plan = await prisma.weeklyPlan.create({
      data: {
        ...planData,
        weekStartDate: new Date(planData.weekStartDate),
        weekEndDate: new Date(planData.weekEndDate)
      }
    });
    
    return plan;
  }
  
  // Get monthly plans
  async getMonthlyPlans(userId, filters = {}) {
    const where = { userId };
    
    if (filters.status) {
      where.status = filters.status;
    }
    
    const plans = await prisma.monthlyPlan.findMany({
      where,
      orderBy: { monthStartDate: 'desc' }
    });
    
    return plans;
  }
  
  // Create monthly plan
  async createMonthlyPlan(planData) {
    const plan = await prisma.monthlyPlan.create({
      data: {
        ...planData,
        monthStartDate: new Date(planData.monthStartDate),
        monthEndDate: new Date(planData.monthEndDate)
      }
    });
    
    return plan;
  }
  
  // Update plan completion
  async updatePlanCompletion(planId, planType, completionData) {
    const model = planType === 'daily' ? prisma.dailyPlan 
                : planType === 'weekly' ? prisma.weeklyPlan 
                : prisma.monthlyPlan;
    
    const plan = await model.update({
      where: { id: planId },
      data: completionData
    });
    
    return plan;
  }
}

module.exports = new PlanService();
