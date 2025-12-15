const prisma = require('../config/database');


exports.getAllTasks = async (req, res) => {
  res.json({ message: 'Get tasks - TODO' });
};


exports.getTaskById = async (req, res) => {
  res.json({ message: 'Get task - TODO' });
};


exports.createTask = async (req, res) => {
  res.json({ message: 'Create task - TODO' });
};


exports.updateTask = async (req, res) => {
  res.json({ message: 'Update task - TODO' });
};


exports.deleteTask = async (req, res) => {
  res.json({ message: 'Delete task - TODO' });
};
