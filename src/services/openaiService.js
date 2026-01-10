const OpenAI = require('openai');

class OpenAIService {
  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey || apiKey === 'your_openai_api_key_here') {
      console.warn('⚠️  WARNING: OPENAI_API_KEY not configured. OpenAI features will not work.');
      this.client = null;
    } else {
      this.client = new OpenAI({
        apiKey: apiKey,
      });
      this.model = 'gpt-3.5-turbo'; // Fast and cost-effective
      console.log('✅ OpenAI service initialized successfully');
    }
  }

  isConfigured() {
    return this.client !== null;
  }

  async chat(messages, options = {}) {
    if (!this.client) {
      throw new Error('OpenAI service not configured. Please set OPENAI_API_KEY in .env file');
    }

    try {
      const completion = await this.client.chat.completions.create({
        model: options.model || this.model,
        messages: messages,
        temperature: options.temperature || 0.7,
        max_tokens: options.max_tokens || 1500,
        ...options
      });

      return {
        success: true,
        content: completion.choices[0].message.content,
        model: completion.model,
        usage: completion.usage
      };
    } catch (error) {
      console.error('OpenAI Service Error:', error.message);
      
      if (error.status === 401) {
        throw new Error('Invalid OpenAI API key. Please check your OPENAI_API_KEY in .env file');
      }
      
      if (error.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      }
      
      throw new Error(`OpenAI generation failed: ${error.message}`);
    }
  }

  // Generate daily routine plan
  async generateDailyPlan(userInput, userPreferences = {}) {
    const systemPrompt = `You are an expert AI Life Coach specialized in creating personalized daily routine plans. 
Your task is to help users organize their day effectively based on their goals, responsibilities, and preferences.

Create structured, realistic, and actionable daily plans that include:
- Morning routine (wake up, exercise, breakfast, preparation)
- Work/study blocks with focused time
- Strategic breaks and meals
- Exercise or physical activity
- Personal development time
- Evening routine and wind-down

Consider:
- Work-life balance principles
- Productivity techniques (Pomodoro, time blocking)
- Energy management throughout the day
- The user's specific goals and constraints
- Realistic time allocations

Format your response with:
1. **Overview** - Brief summary of the day's focus
2. **Morning Routine** (time slots and activities)
3. **Work/Study Blocks** (with breaks)
4. **Afternoon/Evening** (activities and wind-down)
5. **Key Goals** - 3-5 priorities for the day
6. **Success Tips** - Practical advice

Be encouraging, practical, and specific with time allocations.`;

    const userMessage = userPreferences.wakeTime || userPreferences.workHours 
      ? `Create a daily plan for me. ${userInput}\n\nMy preferences:\n- Wake time: ${userPreferences.wakeTime || 'flexible'}\n- Work hours: ${userPreferences.workHours || 'standard 9-5'}\n- Focus areas: ${userPreferences.focusAreas || 'balanced productivity'}`
      : userInput;

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage }
    ];

    return this.chat(messages, { max_tokens: 2000 });
  }

  // Generate weekly plan
  async generateWeeklyPlan(userInput, userPreferences = {}) {
    const systemPrompt = `You are an expert AI Life Coach specialized in creating personalized weekly routine plans.
Your task is to help users organize their entire week effectively with strategic planning.

Create structured, realistic weekly plans that include:
- Daily schedules for each day (Monday to Sunday)
- Weekly goals and objectives
- Time for work/study, exercise, hobbies, and rest
- Flexibility for unexpected events
- Balance between productivity and self-care
- Social connections and relationships

Consider:
- Different energy levels on different days
- Weekend planning vs weekday routines
- Long-term goal progression
- Recovery and rest days
- Social and personal time

Format your response with:
1. **Weekly Overview** - Main themes and goals
2. **Monday - Friday** (structured breakdown)
3. **Weekend** (Saturday & Sunday)
4. **Weekly Objectives** (3-5 key goals)
5. **Focus Areas** (health, work, relationships, etc.)
6. **Flexibility Notes** - How to adapt if things change

Make it inspiring, balanced, and achievable.`;

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userInput }
    ];

    return this.chat(messages, { max_tokens: 2500 });
  }

  // Generate monthly plan
  async generateMonthlyPlan(userInput, userPreferences = {}) {
    const systemPrompt = `You are an expert AI Life Coach specialized in creating personalized monthly planning strategies.
Your task is to help users organize their entire month effectively with strategic goals and milestones.

Create structured, realistic monthly plans that include:
- Monthly vision and theme
- Week-by-week breakdown
- Key milestones and deadlines
- Balanced approach to multiple life areas (work, health, relationships, personal growth)
- Flexibility for adjustments
- Celebration points for achievements
- Progress tracking strategies

Consider:
- Quarterly goals alignment
- Major projects or events
- Habit formation timeline (21-30 days)
- Seasonal considerations
- Work-life integration
- Personal growth objectives

Format your response with:
1. **Monthly Vision** - Overarching theme and goals
2. **Week 1-4 Breakdown** - Key focus for each week
3. **Major Milestones** - Important dates and achievements
4. **Life Areas Balance** - Work, Health, Relationships, Growth
5. **Success Metrics** - How to measure progress
6. **Monthly Reflection** - Questions to ask at month's end

Make it inspiring, strategic, and achievable with clear action steps.`;

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userInput }
    ];

    return this.chat(messages, { max_tokens: 3000 });
  }

  // AI Life Coach Chat
  async lifeCoachChat(prompt, conversationHistory = [], userContext = {}) {
    if (!this.client) {
      throw new Error('OpenAI service not configured. Please set OPENAI_API_KEY in .env file');
    }

    const systemPrompt = `You are an empathetic and motivating AI Life Coach dedicated to helping users achieve their goals and improve their lives.

Your coaching style:
- Empathetic and understanding, yet motivating
- Ask thoughtful questions to help users discover insights
- Provide actionable advice and strategies
- Focus on sustainable habits and realistic goal-setting
- Celebrate progress and encourage resilience
- Use frameworks like SMART goals, habit stacking, and growth mindset

Areas of expertise:
- Personal productivity and time management
- Goal setting and achievement
- Habit formation and breaking bad habits
- Work-life balance
- Stress management and mindfulness
- Career development
- Health and fitness motivation
- Relationship and communication skills

Conversation approach:
- Be warm, supportive, and non-judgmental
- Listen actively to user concerns
- Provide specific, actionable advice
- Reference proven frameworks and techniques
- Encourage self-reflection
- Track progress and celebrate wins

User context: ${userContext.goals ? `Current goals: ${userContext.goals}` : 'No specific goals set yet'}
${userContext.challenges ? `Challenges: ${userContext.challenges}` : ''}

Remember: You're here to guide, support, and empower - not to judge or prescribe rigid solutions.`;

    // Build message array with conversation history
    const messages = [
      { role: 'system', content: systemPrompt }
    ];

    // Add conversation history (last 15 messages for context)
    if (conversationHistory.length > 0) {
      const lastMessages = conversationHistory.slice(-15);
      lastMessages.forEach(msg => {
        messages.push({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.content
        });
      });
    }

    // Add current prompt
    messages.push({
      role: 'user',
      content: prompt
    });

    return this.chat(messages, { max_tokens: 1500, temperature: 0.8 });
  }

  // Suggest tasks based on goals
  async suggestTasks(goals, timeAvailable, context = {}) {
    const systemPrompt = `You are an AI productivity expert helping users break down their goals into actionable tasks.

Create a prioritized list of tasks that:
- Are specific and actionable
- Can be completed in the given timeframe
- Move the user closer to their goals
- Are realistic and achievable
- Follow the SMART framework

Consider:
- Task dependencies and logical order
- Energy levels (high-focus vs. low-focus tasks)
- Quick wins vs. long-term investments
- Time blocking and batching similar tasks

Format each task with:
- Clear action verb
- Estimated time
- Priority level (High/Medium/Low)
- Brief rationale`;

    const userMessage = `Help me create a task list based on my goals and available time.

Goals: ${goals}
Time available: ${timeAvailable}
${context.workingHours ? `Working hours: ${context.workingHours}` : ''}
${context.preferences ? `Preferences: ${context.preferences}` : ''}

Please suggest 5-10 specific, actionable tasks prioritized by impact.`;

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage }
    ];

    return this.chat(messages, { max_tokens: 1500 });
  }

  // Suggest morning routine
  async suggestMorningRoutine(wakeUpTime, workStartTime, preferences = {}) {
    const systemPrompt = `You are an AI wellness and productivity coach specializing in morning routines.

Create a personalized morning routine that:
- Energizes and prepares the user for the day
- Includes physical movement
- Incorporates mindfulness or mental preparation
- Allows time for nutrition
- Builds momentum for the day
- Is realistic and sustainable

Consider proven elements:
- Hydration upon waking
- Movement (stretching, exercise, walk)
- Mindfulness (meditation, journaling, gratitude)
- Nutrition (healthy breakfast)
- Planning (reviewing day's priorities)
- Personal care and grooming
- Avoiding phone/email initially (if possible)

Format with specific time blocks and activities.`;

    const userMessage = `Create a morning routine for me.

Wake up time: ${wakeUpTime}
Work starts: ${workStartTime}
${preferences.exercisePreference ? `Exercise preference: ${preferences.exercisePreference}` : ''}
${preferences.dietaryNeeds ? `Dietary needs: ${preferences.dietaryNeeds}` : ''}
${preferences.personalGoals ? `Personal goals: ${preferences.personalGoals}` : ''}

Please create a structured morning routine with time blocks.`;

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage }
    ];

    return this.chat(messages, { max_tokens: 1200 });
  }

  // Quick AI response (for general questions)
  async quickResponse(prompt) {
    const systemPrompt = `You are a helpful AI assistant that provides concise, accurate, and actionable responses.
Be friendly, clear, and specific. Focus on practical advice and solutions.`;

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt }
    ];

    return this.chat(messages, { max_tokens: 800 });
  }
}

module.exports = new OpenAIService();
