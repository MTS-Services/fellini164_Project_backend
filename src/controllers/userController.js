const prisma = require('../config/database');


exports.getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        settings: true
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        avatar: true,
        role: true,
        subscriptionPlan: true,
        subscriptionStatus: true,
        onboardingCompleted: true,
        settings: true,
        createdAt: true
      }
    });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: user
    });
    
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user',
      error: error.message
    });
  }
};


exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, avatar } = req.body;
    
    const user = await prisma.user.update({
      where: { id },
      data: {
        firstName,
        lastName,
        avatar
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        avatar: true
      }
    });
    
    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: user
    });
    
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user',
      error: error.message
    });
  }
};


exports.getUserSettings = async (req, res) => {
  try {
    const { id } = req.params;
    
    let settings = await prisma.userSettings.findUnique({
      where: { userId: id }
    });
    
    // Create default settings if not exist
    if (!settings) {
      settings = await prisma.userSettings.create({
        data: { userId: id }
      });
    }
    
    res.status(200).json({
      success: true,
      data: settings
    });
    
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get settings',
      error: error.message
    });
  }
};


exports.updateUserSettings = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    const settings = await prisma.userSettings.upsert({
      where: { userId: id },
      update: updateData,
      create: {
        userId: id,
        ...updateData
      }
    });
    
    res.status(200).json({
      success: true,
      message: 'Settings updated successfully',
      data: settings
    });
    
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update settings',
      error: error.message
    });
  }
};


exports.deleteUser = async (req, res) => {
  res.json({ message: 'Delete user - TODO' });
};
