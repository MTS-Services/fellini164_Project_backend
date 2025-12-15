const { format, addDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } = require('date-fns');

// Format date
exports.formatDate = (date, formatString = 'yyyy-MM-dd') => {
  return format(new Date(date), formatString);
};

// Get date range for week
exports.getWeekRange = (date = new Date()) => {
  return {
    start: startOfWeek(date, { weekStartsOn: 1 }),
    end: endOfWeek(date, { weekStartsOn: 1 })
  };
};

// Get date range for month
exports.getMonthRange = (date = new Date()) => {
  return {
    start: startOfMonth(date),
    end: endOfMonth(date)
  };
};

// Add days to date
exports.addDaysToDate = (date, days) => {
  return addDays(new Date(date), days);
};

// Check if date is today
exports.isToday = (date) => {
  const today = new Date();
  const checkDate = new Date(date);
  return (
    checkDate.getDate() === today.getDate() &&
    checkDate.getMonth() === today.getMonth() &&
    checkDate.getFullYear() === today.getFullYear()
  );
};
