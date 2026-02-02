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

CREATE A COMPLETE 7-DAY STRUCTURED PLAN that the user must follow.

Each day MUST include:
- Specific time blocks with activities
- Morning routine (wake up, exercise, preparation)
- Work/study focus blocks with breaks
- Meal times and breaks
- Exercise or physical activity
- Evening routine and wind-down
- Key tasks/goals for that specific day

Consider:
- Different energy levels on different days
- Progressive workload (lighter on Mondays, peak mid-week)
- Weekend planning for rest and personal growth
- Recovery and active rest days
- Social and personal time balance
- Realistic time allocations

FORMAT YOUR RESPONSE EXACTLY AS:

## Weekly Overview
[Brief summary of the week's main focus and goals]

## Monday - [Date]
**Morning Routine (6:00 AM - 9:00 AM)**
- 6:00 AM: Wake up, hydration
- 6:30 AM: Exercise/Yoga
- 7:30 AM: Breakfast & planning
- 8:30 AM: Prepare for work

**Work Block 1 (9:00 AM - 12:00 PM)**
- [Specific tasks and activities]

**Afternoon (12:00 PM - 6:00 PM)**
- [Lunch, breaks, and afternoon activities]

**Evening (6:00 PM - 10:00 PM)**
- [Evening routine, dinner, wind-down]

**Key Goals for Monday:**
- [3-5 specific goals]

## Tuesday - [Date]
[Repeat same detailed structure]

## Wednesday - [Date]
[Repeat same detailed structure]

## Thursday - [Date]
[Repeat same detailed structure]

## Friday - [Date]
[Repeat same detailed structure]

## Saturday - [Date]
[Weekend structure with personal time, errands, hobbies]

## Sunday - [Date]
[Rest, meal prep, weekly review, next week preparation]

## Weekly Objectives
1. [Major goal 1]
2. [Major goal 2]
3. [Major goal 3]
4. [Major goal 4]
5. [Major goal 5]

## Focus Areas This Week
- **Health & Fitness:** [Specific activities]
- **Work/Career:** [Key projects]
- **Personal Growth:** [Learning/development]
- **Relationships:** [Social connections]
- **Self-Care:** [Rest and recovery]

## Success Tips
- [Practical advice for staying on track]
- [How to handle disruptions]
- [Weekly review guidance]

Make it detailed, specific, inspiring, and ACTIONABLE with clear time blocks for ALL 7 DAYS.`;

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userInput }
    ];

    return this.chat(messages, { max_tokens: 3500 });
  }

  // Generate monthly plan
  async generateMonthlyPlan(userInput, userPreferences = {}) {
    const systemPrompt = `You are an expert AI Life Coach specialized in creating comprehensive monthly planning strategies.
Your task is to help users organize their entire month effectively with strategic goals, weekly breakdowns, and daily routine guidance.

CREATE A COMPLETE MONTH PLAN that includes:
- Monthly vision and strategic goals
- Week-by-week detailed breakdown (4-5 weeks)
- Daily routine guidelines for each week
- Key milestones and deadlines
- Balanced approach to all life areas
- Progress tracking and celebration points

IMPORTANT: Include weekly AND daily routine details within each week.

FORMAT YOUR RESPONSE EXACTLY AS:

## Monthly Vision - [Month Year]
[Overarching theme, main objectives, and what success looks like this month]

## Strategic Goals
1. [Major goal 1 with specific outcome]
2. [Major goal 2 with specific outcome]
3. [Major goal 3 with specific outcome]
4. [Major goal 4 with specific outcome]
5. [Major goal 5 with specific outcome]

## Week 1: [Week Theme/Focus]
**Weekly Objectives:**
- [Specific objective 1]
- [Specific objective 2]
- [Specific objective 3]

**Daily Routine Guidelines:**
- **Monday-Friday:**
  - Morning: [6:00-9:00 AM] - Wake up, exercise, planning
  - Work Blocks: [9:00 AM-5:00 PM] - Focused work with breaks
  - Evening: [6:00-10:00 PM] - Personal time, reflection, rest
- **Weekend:**
  - Saturday: [Activities for personal growth, social time]
  - Sunday: [Rest, meal prep, weekly review]

**Key Tasks:**
1. [Specific task with deadline]
2. [Specific task with deadline]
3. [Specific task with deadline]

## Week 2: [Week Theme/Focus]
**Weekly Objectives:**
- [Specific objective 1]
- [Specific objective 2]
- [Specific objective 3]

**Daily Routine Guidelines:**
- **Monday-Friday:**
  - Morning: [Routine with specific activities]
  - Work Blocks: [Focused activities and projects]
  - Evening: [Wind-down and personal development]
- **Weekend:**
  - Saturday: [Balanced activities]
  - Sunday: [Preparation and rest]

**Key Tasks:**
1. [Task with deadline]
2. [Task with deadline]
3. [Task with deadline]

## Week 3: [Week Theme/Focus]
**Weekly Objectives:**
- [Specific objective 1]
- [Specific objective 2]
- [Specific objective 3]

**Daily Routine Guidelines:**
- **Monday-Friday:**
  - Morning: [6:00-9:00 AM] - [Activities]
  - Work Blocks: [9:00 AM-5:00 PM] - [Focus areas]
  - Evening: [6:00-10:00 PM] - [Activities]
- **Weekend:**
  - Saturday: [Activities]
  - Sunday: [Review and planning]

**Key Tasks:**
1. [Task with deadline]
2. [Task with deadline]
3. [Task with deadline]

## Week 4: [Week Theme/Focus]
**Weekly Objectives:**
- [Specific objective 1]
- [Specific objective 2]
- [Specific objective 3]

**Daily Routine Guidelines:**
- **Monday-Friday:**
  - Morning: [Routine]
  - Work Blocks: [Activities]
  - Evening: [Wind-down]
- **Weekend:**
  - Saturday: [Final push on monthly goals]
  - Sunday: [Monthly review and next month prep]

**Key Tasks:**
1. [Task with deadline]
2. [Task with deadline]
3. [Task with deadline]

## Major Milestones & Deadlines
- Week 1: [Important deadline/milestone]
- Week 2: [Important deadline/milestone]
- Week 3: [Important deadline/milestone]
- Week 4: [Important deadline/milestone]

## Life Areas Balance
- **Career/Work:** [30%] - [Specific focus areas]
- **Health & Fitness:** [20%] - [Workout schedule, nutrition goals]
- **Relationships:** [15%] - [Social activities, family time]
- **Personal Growth:** [20%] - [Learning, skills development]
- **Rest & Recovery:** [15%] - [Self-care, relaxation]

## Daily Habits to Build
1. [Habit 1] - Morning routine
2. [Habit 2] - Midday practice
3. [Habit 3] - Evening routine

## Success Metrics
- [Metric 1: How to measure]
- [Metric 2: How to measure]
- [Metric 3: How to measure]
- [Metric 4: How to measure]

## Monthly Reflection Questions
1. What were my biggest wins this month?
2. What challenges did I overcome?
3. What habits did I successfully build?
4. What would I do differently next month?
5. How did I grow personally and professionally?

## Celebration Points
- Week 1: [Small win to celebrate]
- Week 2: [Progress milestone]
- Week 3: [Achievement to acknowledge]
- Week 4: [Month completion celebration]

Make it comprehensive, inspiring, and ACTIONABLE with specific weekly themes, daily routine guidelines, and clear milestones throughout the month.`;

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userInput }
    ];

    return this.chat(messages, { max_tokens: 4000 });
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

FORMATTING INSTRUCTIONS (VERY IMPORTANT):
- Use proper spacing between paragraphs (add double line breaks)
- Keep paragraphs short (2-4 sentences maximum)
- Use bullet points or numbered lists when presenting multiple items
- Separate different topics or ideas with clear spacing
- Break up long blocks of text to make them easy to read
- Format like a conversation, not a dense essay

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

  /**
   * Reset Daily Plan - The Trust Engine
   * Adapts a daily plan when life happens
   * This is not a gimmick - it's about building trust with users
   */
  async resetDailyPlan(resetContext, userSettings = {}) {
    const reasonMap = {
      'LOW_ENERGY': 'User is experiencing low energy today',
      'UNEXPECTED_MEETINGS': 'Unexpected meetings came up',
      'LOST_FOCUS': 'User lost focus or procrastinated',
      'PERSONAL_STUFF': 'Personal matters need attention',
      'JUST_ONE_OF_THOSE_DAYS': 'User is having one of those difficult days',
      'OTHER': 'User needs to adapt the plan',
    };

    const reasonDescription = reasonMap[resetContext.reason] || 'User wants to reset their day';
    const currentTime = resetContext.currentTime || new Date().toLocaleTimeString();

    const systemPrompt = `You are Elyxa, an empathetic AI productivity coach who helps users adapt their plans when life happens.

CORE PHILOSOPHY:
- No guilt, no judgment - life is unpredictable
- Build trust through realistic, achievable adaptations
- Focus on 2-3 top priorities instead of overwhelming tasks
- Break large tasks into smaller, manageable steps
- Adapt to reality, don't ignore it

RESET PRINCIPLES:
1. **Preserve Top Priorities** - Keep the 2-3 most important tasks
2. **Defer Non-Urgent** - Move less critical items to tomorrow/later
3. **Break Down Tasks** - Simplify remaining tasks into smaller steps
4. **Adjust Time Blocks** - Create realistic focus blocks based on remaining time
5. **Add Buffer Time** - Include breaks and recovery time
6. **Encourage Progress** - Any progress is better than paralysis

CRITICAL FORMATTING REQUIREMENTS:
The "content" field MUST be a well-structured, organized plan with:
- **Overview** section explaining the adapted focus
- Numbered sections (1, 2, 3, etc.)
- Time blocks with specific times (e.g., 09:00 - 10:30)
- Clear activity descriptions
- Key Goals section listing 2-3 main priorities
- Success Tips section with practical advice

Use markdown formatting with headers (##), bold text (**), and bullet points.
Make it look professional and easy to follow.

TONE:
- Supportive and understanding
- Practical and solution-focused
- Encouraging without being preachy
- Professional but warm

FORMAT YOUR RESPONSE AS JSON:
{
  "content": "FULL STRUCTURED PLAN - Must include Overview, numbered sections with time blocks, Key Goals, and Success Tips. Use the same professional format as the original plan.",
  "morningRoutine": "Brief description of adapted morning tasks (if still relevant to current time)",
  "afternoonTasks": "Brief description of realistic afternoon focus blocks",
  "eveningRoutine": "Brief description of simplified evening wind-down",
  "summary": "Brief explanation of what was changed and why (1-2 sentences)",
  "adaptationSteps": [
    "Kept top 2 priorities: [specific tasks from original plan]",
    "Deferred to tomorrow: [specific tasks from original plan]",
    "Broke down into smaller steps: [specific task modification]",
    "Adjusted focus blocks to match remaining time"
  ],
  "encouragement": "Short, genuine encouragement message (1 sentence)"
}`;

    const userMessage = `Reset my daily plan - life happened and I need to adapt.

**Current Situation:**
- Reason: ${reasonDescription}
${resetContext.customReason ? `- Additional context: ${resetContext.customReason}` : ''}
- Current time: ${currentTime}
- Progress so far: ${resetContext.tasksCompleted}/${resetContext.tasksTotal} tasks completed (${Math.round(resetContext.completionRate)}%)

**Original Plan:**
${resetContext.previousPlan}

**User Settings:**
- Wake time: ${userSettings?.wakeTime || '7:00 AM'}
- Work hours: ${userSettings?.workHoursPerDay || 8} hours/day
- Preferred break length: ${userSettings?.preferredBreakLength || '15 minutes'}

IMPORTANT INSTRUCTIONS:
1. Analyze the original plan structure above (notice the **Overview**, numbered sections, time blocks, **Key Goals**, **Success Tips**)
2. Create an adapted plan that KEEPS THE SAME PROFESSIONAL STRUCTURE
3. The "content" field must be a COMPLETE, WELL-ORGANIZED plan with:
   - **Overview:** Brief summary of adapted focus (2-3 sentences)
   - **1. Morning Routine** (if applicable): Time blocks with specific times and activities
   - **2. Work/Study Blocks**: Focused sessions with time blocks (keep top 2-3 priorities)
   - **3. Afternoon/Evening**: Simplified activities with time blocks
   - **4. Key Goals**: List 2-3 main priorities (reduced from original)
   - **5. Success Tips**: 3-4 practical tips for the adapted plan

4. ADAPT the plan by:
   - Keeping only the 2-3 highest priority tasks from the original
   - Adjusting time blocks to fit remaining day
   - Simplifying complex tasks into smaller steps
   - Adding buffer time between activities
   - Making it achievable given the current situation

5. Use the SAME markdown formatting style as the original plan
6. Make time blocks realistic based on current time: ${currentTime}

Remember: The goal is progress, not perfection. Make it achievable and trust-building.

Respond ONLY with valid JSON. The "content" field must be a fully formatted, structured plan like the original.`;

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage }
    ];

    try {
      const response = await this.chat(messages, {
        max_tokens: 2500,
        temperature: 0.7
      });

      // Parse JSON response
      let adaptedPlan;
      try {
        // Try to extract JSON from response (in case AI wraps it in code blocks)
        let jsonContent = response.content.trim();

        // Remove markdown code blocks if present
        if (jsonContent.startsWith('```json')) {
          jsonContent = jsonContent.replace(/```json\s*/g, '').replace(/```\s*$/g, '');
        } else if (jsonContent.startsWith('```')) {
          jsonContent = jsonContent.replace(/```\s*/g, '').replace(/```\s*$/g, '');
        }

        adaptedPlan = JSON.parse(jsonContent);

        // Validate that content is properly structured
        if (!adaptedPlan.content || adaptedPlan.content.length < 100) {
          throw new Error('Content too short - need full structured plan');
        }

      } catch (parseError) {
        // If JSON parsing fails, create a structured fallback based on original plan
        console.warn('Failed to parse JSON response, creating structured fallback');
        console.error('Parse error:', parseError.message);

        // Extract key information from original plan
        const originalLines = resetContext.previousPlan.split('\n');
        const keyTasks = originalLines.filter(line =>
          line.includes('**Key Goals**') ||
          line.match(/^\s*-\s+/m)
        ).slice(0, 5);

        adaptedPlan = {
          content: this._createFallbackStructuredPlan(resetContext, reasonDescription, currentTime),
          morningRoutine: 'Simplified morning routine focused on essential preparation',
          afternoonTasks: 'Focus on top 2 priorities with adequate break time',
          eveningRoutine: 'Light wind-down activities and planning for tomorrow',
          summary: 'Plan adapted to focus on top priorities while being realistic about current circumstances',
          adaptationSteps: [
            'Keeping top 2 priorities from original plan',
            'Deferring non-urgent tasks to tomorrow',
            'Breaking remaining tasks into smaller, manageable steps',
            'Adjusted focus blocks to match remaining time in the day'
          ],
          encouragement: 'Life happened. We\'ve adapted. Let\'s make progress.'
        };
      }

      return {
        ...adaptedPlan,
        usage: response.usage,
        model: response.model
      };
    } catch (error) {
      console.error('Error in resetDailyPlan:', error);
      throw error;
    }
  }

  /**
   * Helper method to create a structured fallback plan when JSON parsing fails
   * @private
   */
  _createFallbackStructuredPlan(resetContext, reasonDescription, currentTime) {
    const now = new Date();
    const currentHour = now.getHours();

    // Determine what part of day we're in
    const isLateDay = currentHour >= 15;
    const isMidDay = currentHour >= 12 && currentHour < 15;

    let plan = `**Overview:** Today's plan has been adapted to focus on achievable goals given your current situation (${reasonDescription}). We're prioritizing your top 2-3 most important tasks while being realistic about time and energy.\n\n`;

    // Only include morning routine if it's still morning
    if (currentHour < 12) {
      plan += `**1. Remaining Morning Tasks**\n`;
      plan += `   - ${String(currentHour).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} - ${String(currentHour + 1).padStart(2, '0')}:00: Focus on top priority task (90-minute block)\n`;
      plan += `   - ${String(currentHour + 1).padStart(2, '0')}:00 - ${String(currentHour + 1).padStart(2, '0')}:15: Break (stretch, hydrate, snack)\n`;
      plan += `   - ${String(currentHour + 1).padStart(2, '0')}:15 - 12:00: Continue with priority work\n\n`;
    }

    // Afternoon tasks
    if (!isLateDay) {
      const startHour = isMidDay ? Math.max(currentHour, 12) : 13;
      plan += `**${currentHour < 12 ? '2' : '1'}. Afternoon Focus Blocks**\n`;
      plan += `   - ${String(startHour).padStart(2, '0')}:00 - ${String(startHour + 1).padStart(2, '0')}:30: Work on second priority task\n`;
      plan += `   - ${String(startHour + 1).padStart(2, '0')}:30 - ${String(startHour + 1).padStart(2, '0')}:45: Short break\n`;
      plan += `   - ${String(startHour + 1).padStart(2, '0')}:45 - ${String(startHour + 3).padStart(2, '0')}:00: Complete remaining essential tasks\n\n`;
    }

    // Evening routine
    const eveningStart = isLateDay ? Math.max(currentHour + 1, 17) : 17;
    plan += `**${currentHour < 12 ? '3' : isLateDay ? '1' : '2'}. Evening Wind-Down**\n`;
    plan += `   - ${String(eveningStart).padStart(2, '0')}:00 - ${String(eveningStart + 1).padStart(2, '0')}:00: Review day's progress and plan tomorrow\n`;
    plan += `   - ${String(eveningStart + 1).padStart(2, '0')}:00 - ${String(eveningStart + 2).padStart(2, '0')}:00: Light activity or personal time\n`;
    plan += `   - ${String(eveningStart + 2).padStart(2, '0')}:00 onwards: Relaxation and preparation for tomorrow\n\n`;

    // Key goals - simplified to top 2-3
    plan += `**${currentHour < 12 ? '4' : isLateDay ? '2' : '3'}. Key Goals (Adapted)**\n`;
    plan += `   - Complete top priority task from original plan\n`;
    if (!isLateDay) {
      plan += `   - Make progress on second priority task\n`;
    }
    plan += `   - Review and plan for tomorrow's tasks\n\n`;

    // Success tips
    plan += `**${currentHour < 12 ? '5' : isLateDay ? '3' : '4'}. Success Tips**\n`;
    plan += `   - Focus on progress, not perfection - any forward movement counts\n`;
    plan += `   - Take breaks every 60-90 minutes to maintain focus and energy\n`;
    plan += `   - If a task feels overwhelming, break it into 15-minute mini-tasks\n`;
    plan += `   - Remember: adapting your plan shows wisdom, not weakness\n`;

    return plan;
  }


  // ==================== TASK GENERATION FUNCTIONS ====================

  // Generate tasks from goals
  async generateTasksFromGoals(goals, userContext = {}) {
    if (!this.client) {
      throw new Error('OpenAI service not configured');
    }

    const systemPrompt = `You are an expert AI task generator. Your role is to break down user goals into specific, actionable tasks.

REQUIREMENTS:
1. Each task must be specific and actionable
2. Include estimated time in minutes
3. Assign priority (LOW, MEDIUM, HIGH, URGENT)
4. Categorize by goal category
5. Suggest appropriate due dates
6. Consider task dependencies
7. Break complex tasks into subtasks

Return ONLY valid JSON array with this exact structure:
[
  {
    "title": "Task title",
    "description": "Detailed description",
    "priority": "HIGH",
    "category": "HEALTH",
    "estimatedMinutes": 30,
    "dueDate": "2026-01-20",
    "energyLevelRequired": "medium",
    "tags": ["exercise", "morning"],
    "aiRecommendation": "Why this task is important",
    "difficultyLevel": 5
  }
]

Valid priorities: LOW, MEDIUM, HIGH, URGENT
Valid categories: HEALTH, FITNESS, HABITS, MONEY, CAREER, RELATIONSHIPS, PRODUCTIVITY, ROUTINES, PERSONAL_GROWTH, LEARNING, OTHER
Valid energy levels: low, medium, high
Difficulty: 1-10 scale`;

    const userMessage = `Generate actionable tasks for these goals:\n\n${JSON.stringify(goals, null, 2)}\n\nUser Context:\n${JSON.stringify(userContext, null, 2)}`;

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage }
    ];

    try {
      const response = await this.chat(messages, {
        max_tokens: 2000,
        temperature: 0.7
      });

      // Parse JSON response
      let tasksText = response.content.trim();

      // Remove markdown code blocks if present
      tasksText = tasksText.replace(/```json\n?/g, '').replace(/```\n?/g, '');

      const tasks = JSON.parse(tasksText);

      return {
        success: true,
        tasks,
        tokensUsed: response.usage?.total_tokens
      };
    } catch (error) {
      console.error('Failed to generate tasks:', error);
      throw new Error('Failed to generate tasks from goals');
    }
  }

  // Break down complex task into subtasks
  async breakdownTask(task, userContext = {}) {
    if (!this.client) {
      throw new Error('OpenAI service not configured');
    }

    const systemPrompt = `You are an expert at breaking down complex tasks into manageable subtasks.

Analyze the given task and break it into 3-7 specific, sequential subtasks.

Return ONLY valid JSON array:
[
  {
    "title": "Subtask title",
    "description": "What to do",
    "estimatedMinutes": 15,
    "priority": "HIGH"
  }
]`;

    const userMessage = `Break down this task:\n\nTitle: ${task.title}\nDescription: ${task.description || 'No description'}\nEstimated Time: ${task.estimatedMinutes || 'unknown'} minutes`;

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage }
    ];

    try {
      const response = await this.chat(messages, {
        max_tokens: 1000,
        temperature: 0.6
      });

      let subtasksText = response.content.trim();
      subtasksText = subtasksText.replace(/```json\n?/g, '').replace(/```\n?/g, '');

      const subtasks = JSON.parse(subtasksText);

      return {
        success: true,
        subtasks,
        tokensUsed: response.usage?.total_tokens
      };
    } catch (error) {
      console.error('Failed to breakdown task:', error);
      throw new Error('Failed to break down task');
    }
  }

  // Suggest task adjustments based on user behavior
  async suggestTaskAdjustments(taskHistory, userPatterns) {
    if (!this.client) {
      throw new Error('OpenAI service not configured');
    }

    const systemPrompt = `You are an AI productivity coach analyzing user task completion patterns.

Based on task history and patterns, suggest adjustments to:
1. Task priorities
2. Time estimates
3. Task scheduling
4. Task difficulty
5. Task breakdown needs

Return JSON object:
{
  "adjustments": [
    {
      "taskId": "task-id",
      "suggestion": "What to change",
      "reason": "Why this change helps",
      "priority": "HIGH"
    }
  ],
  "generalRecommendations": [
    "Overall productivity advice"
  ]
}`;

    const userMessage = `Analyze this task history and patterns:\n\nHistory: ${JSON.stringify(taskHistory, null, 2)}\n\nPatterns: ${JSON.stringify(userPatterns, null, 2)}`;

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage }
    ];

    try {
      const response = await this.chat(messages, {
        max_tokens: 1500,
        temperature: 0.7
      });

      let adjustmentsText = response.content.trim();
      adjustmentsText = adjustmentsText.replace(/```json\n?/g, '').replace(/```\n?/g, '');

      const adjustments = JSON.parse(adjustmentsText);

      return {
        success: true,
        ...adjustments,
        tokensUsed: response.usage?.total_tokens
      };
    } catch (error) {
      console.error('Failed to suggest adjustments:', error);
      throw new Error('Failed to generate task adjustments');
    }
  }

  // Generate daily task list from user goals and habits
  async generateDailyTasks(userGoals, userHabits, userPreferences = {}) {
    if (!this.client) {
      throw new Error('OpenAI service not configured');
    }

    const systemPrompt = `You are an AI daily planner creating a personalized task list.

Create 5-10 specific, actionable tasks for today based on user's goals and habits.

Consider:
- User's wake time and sleep schedule
- Work hours and productivity peaks
- Goal priorities
- Habit streaks to maintain
- Energy levels throughout the day
- Realistic time constraints

Return ONLY valid JSON array:
[
  {
    "title": "Task title",
    "description": "What to do",
    "priority": "HIGH",
    "category": "PRODUCTIVITY",
Return ONLY valid JSON array:
[
  {
    "title": "Task title",
    "description": "What to do",
    "priority": "HIGH",
    "category": "PRODUCTIVITY",
    "estimatedMinutes": 45,
    "dueTime": "09:00",
    "energyLevelRequired": "high",
    "aiRecommendation": "Why this task today"
  }
]

Valid priorities: LOW, MEDIUM, HIGH, URGENT
Valid categories: HEALTH, FITNESS, HABITS, MONEY, CAREER, RELATIONSHIPS, PRODUCTIVITY, ROUTINES, PERSONAL_GROWTH, LEARNING, OTHER`;

    const userMessage = `Generate today's tasks:\n\nGoals: ${JSON.stringify(userGoals, null, 2)}\n\nHabits: ${JSON.stringify(userHabits, null, 2)}\n\nPreferences:\n- Wake time: ${userPreferences.wakeTime || '7:00'}\n- Work hours: ${userPreferences.workHours || '9:00-17:00'}\n- Focus: ${userPreferences.focusAreas || 'balanced'}`;

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage }
    ];

    try {
      const response = await this.chat(messages, {
        max_tokens: 2000,
        temperature: 0.7
      });

      let tasksText = response.content.trim();
      tasksText = tasksText.replace(/```json\n?/g, '').replace(/```\n?/g, '');

      const tasks = JSON.parse(tasksText);

      return {
        success: true,
        tasks,
        tokensUsed: response.usage?.total_tokens
      };
    } catch (error) {
      console.error('Failed to generate daily tasks:', error);
      throw new Error('Failed to generate daily tasks');
    }
  }

  // Analyze task completion patterns
  async analyzeTaskPatterns(completedTasks, skippedTasks) {
    if (!this.client) {
      throw new Error('OpenAI service not configured');
    }

    const systemPrompt = `You are an AI productivity analyst examining task completion patterns.

Analyze the completed and skipped tasks to identify:
1. Productivity patterns
2. Time management issues
3. Task preference patterns
4. Optimal work times
5. Areas for improvement

Return JSON object:
{
  "patterns": [
    {
      "type": "PRODUCTIVITY_PEAK",
      "description": "Pattern description",
      "suggestion": "Actionable recommendation"
    }
  ],
  "insights": [
    "Key insight about productivity"
  ],
  "recommendations": [
    "Specific action to improve"
  ]
}

Valid pattern types: PRODUCTIVITY_PEAK, SKIP_PATTERN, TIME_ESTIMATION, ENERGY_LEVEL, CATEGORY_PREFERENCE`;

    const userMessage = `Analyze these patterns:\n\nCompleted Tasks: ${JSON.stringify(completedTasks.slice(0, 20), null, 2)}\n\nSkipped Tasks: ${JSON.stringify(skippedTasks.slice(0, 10), null, 2)}`;

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage }
    ];

    try {
      const response = await this.chat(messages, {
        max_tokens: 1500,
        temperature: 0.6
      });

      let analysisText = response.content.trim();
      analysisText = analysisText.replace(/```json\n?/g, '').replace(/```\n?/g, '');

      const analysis = JSON.parse(analysisText);

      return {
        success: true,
        ...analysis,
        tokensUsed: response.usage?.total_tokens
      };
    } catch (error) {
      console.error('Failed to analyze patterns:', error);
      throw new Error('Failed to analyze task patterns');
    }
  }
}

module.exports = new OpenAIService();
