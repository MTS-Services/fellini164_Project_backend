// Knowledge Base Seed Data for Fellini Support System
const knowledgeBaseData = [
  // Account & Authentication
  {
    category: 'account',
    question: 'How do I create a Fellini account?',
    answer: 'To create a Fellini account:\n1. Go to fellini.com and click "Sign Up"\n2. Enter your email and create a password\n3. Check your email for a verification link\n4. Click the verification link to activate your account\n5. Complete the onboarding process to set up your first goals',
    keywords: ['sign up', 'register', 'create account', 'new account'],
    priority: 10
  },
  {
    category: 'account',
    question: 'I didn\'t receive my verification email',
    answer: 'If you didn\'t receive your verification email:\n1. Check your spam/junk folder\n2. Make sure you entered the correct email address\n3. Click "Resend Verification Email" on the login page\n4. If still not received, contact support with your email address',
    keywords: ['verification', 'email not received', 'activation', 'confirm email'],
    priority: 9
  },
  {
    category: 'account',
    question: 'How do I reset my password?',
    answer: 'To reset your password:\n1. Go to the login page\n2. Click "Forgot Password?"\n3. Enter your email address\n4. Check your email for the reset link (check spam folder)\n5. Click the link and create a new password\n\nPassword must be at least 8 characters with letters and numbers.',
    keywords: ['password reset', 'forgot password', 'change password', 'locked out'],
    priority: 10
  },

  // Billing & Subscription
  {
    category: 'billing',
    question: 'What subscription plans are available?',
    answer: 'Fellini offers 4 subscription plans:\n\n**FREE** - $0/month\n- 20 AI messages/day\n- Basic daily planner\n- 1 habit tracker\n\n**STARTER** - $7.99/month\n- Unlimited AI chat\n- Daily automation\n- Unlimited tasks\n\n**PRO** - $17.99/month (Most Popular)\n- Everything in Starter\n- Weekly & monthly planning\n- AI productivity analysis\n- 3 AI personas\n\n**ULTIMATE** - $39.99/month\n- Everything in Pro\n- AI-generated Life Blueprint\n- AI voice coach\n- Priority support\n\nAll plans include a 7-day free trial!',
    keywords: ['pricing', 'plans', 'subscription', 'cost', 'price', 'free trial'],
    priority: 10
  },
  {
    category: 'billing',
    question: 'How do I upgrade my plan?',
    answer: 'To upgrade your subscription:\n1. Log in to your account\n2. Go to Settings > Subscription\n3. Click "Upgrade Plan"\n4. Select your desired plan\n5. Enter payment information\n6. Your upgrade is instant!\n\nWe accept credit cards, Apple Pay, Google Pay (via Stripe), and PayPal.',
    keywords: ['upgrade', 'change plan', 'switch plan', 'premium'],
    priority: 9
  },
  {
    category: 'billing',
    question: 'How do I cancel my subscription?',
    answer: 'To cancel your subscription:\n1. Log in to your account\n2. Go to Settings > Subscription\n3. Click "Manage Subscription"\n4. Click "Cancel Subscription"\n5. Confirm cancellation\n\nYour account will remain active until the end of your billing period. You can continue using all features until then. After cancellation, you\'ll be downgraded to the Free plan.',
    keywords: ['cancel', 'unsubscribe', 'stop subscription', 'end membership'],
    priority: 10
  },
  {
    category: 'billing',
    question: 'What payment methods do you accept?',
    answer: 'We accept:\n- Credit/Debit Cards (Visa, Mastercard, Amex)\n- Apple Pay\n- Google Pay\n- PayPal (monthly subscription or one-time payment)\n\nAll payments are processed securely through Stripe and PayPal. We never store your payment information.',
    keywords: ['payment', 'credit card', 'apple pay', 'google pay', 'paypal'],
    priority: 8
  },
  {
    category: 'billing',
    question: 'What is your refund policy?',
    answer: 'We offer a 30-day money-back guarantee for all paid plans. If you\'re not satisfied within the first 30 days, contact our support team for a full refund.\n\nFor refunds after 30 days, please contact support and we\'ll review on a case-by-case basis.\n\nNote: Refunds typically process within 5-7 business days.',
    keywords: ['refund', 'money back', 'guarantee', 'return'],
    priority: 8
  },

  // Features & Usage
  {
    category: 'features',
    question: 'How does the AI daily planner work?',
    answer: 'The AI Daily Planner creates personalized schedules based on your goals and preferences:\n\n1. Set your goals (health, productivity, habits, etc.)\n2. Tell AI your schedule, wake/sleep times, and priorities\n3. Click "Generate Daily Plan"\n4. AI creates a customized daily schedule\n5. Mark tasks as complete throughout the day\n6. AI adjusts future plans based on your progress\n\nYou can regenerate your plan anytime or manually adjust tasks.',
    keywords: ['daily plan', 'planner', 'schedule', 'how it works'],
    priority: 10
  },
  {
    category: 'features',
    question: 'Can I customize my AI coach personality?',
    answer: 'Yes! On PRO and ULTIMATE plans, you can choose different AI coach personalities:\n\n- Friendly Mentor (default)\n- Strict Coach\n- Therapist Coach\n- Productivity Expert\n- Fitness Coach\n\nTo change:\n1. Go to Settings > AI Preferences\n2. Select your preferred coach style\n3. AI will adapt its tone and recommendations\n\nULTIMATE plan users get access to ALL personalities and AI voice coach!',
    keywords: ['ai personality', 'coach style', 'ai tone', 'customize ai'],
    priority: 7
  },
  {
    category: 'features',
    question: 'How do habit trackers work?',
    answer: 'Habit trackers help you build consistent routines:\n\n1. Create a new habit (e.g., "Morning workout")\n2. Set frequency (daily, 3x/week, etc.)\n3. Choose reminder time\n4. Track completions each day\n5. View streak progress\n\nAI monitors your habits and:\n- Adjusts difficulty if too hard/easy\n- Suggests new habits based on goals\n- Celebrates milestones\n- Provides motivation when you miss days',
    keywords: ['habits', 'habit tracker', 'routines', 'streaks'],
    priority: 9
  },
  {
    category: 'features',
    question: 'What is the Life Blueprint feature?',
    answer: 'Life Blueprint (ULTIMATE plan only) is a comprehensive life planning system:\n\nAI analyzes your:\n- Long-term goals\n- Current lifestyle\n- Strengths and weaknesses\n- Time availability\n- Priorities\n\nThen creates a personalized roadmap covering:\n- Career development\n- Health & fitness\n- Relationships\n- Financial goals\n- Personal growth\n- Daily/weekly/monthly action steps\n\nYour blueprint updates as you progress and achieve milestones!',
    keywords: ['life blueprint', 'roadmap', 'long term planning', 'ultimate'],
    priority: 7
  },

  // Troubleshooting
  {
    category: 'troubleshooting',
    question: 'AI is not generating my plan',
    answer: 'If AI isn\'t generating your plan:\n\n1. Check your internet connection\n2. Refresh the page\n3. Make sure you\'ve set at least one goal\n4. Verify your account has AI message credits (Free plan limited to 20/day)\n5. Try logging out and back in\n6. Clear browser cache\n\nIf still not working, contact support with:\n- Your email address\n- Screenshot of the error\n- Browser and device info',
    keywords: ['not working', 'ai broken', 'plan not generating', 'error'],
    priority: 9
  },
  {
    category: 'troubleshooting',
    question: 'My tasks are not saving',
    answer: 'If tasks aren\'t saving:\n\n1. Check your internet connection\n2. Disable browser extensions (ad blockers can interfere)\n3. Try a different browser\n4. Clear cookies and cache\n5. Make sure you\'re logged in\n6. Check if you hit your plan limits (Free plan has restrictions)\n\nIf problem persists, contact support immediately.',
    keywords: ['tasks not saving', 'data lost', 'not saving', 'bug'],
    priority: 8
  },
  {
    category: 'troubleshooting',
    question: 'I\'m not receiving reminder notifications',
    answer: 'To fix notification issues:\n\n1. Go to Settings > Notifications\n2. Make sure reminders are enabled\n3. Check notification times are correct\n4. Allow browser notifications (check browser settings)\n5. For mobile: Check app notification permissions\n6. Verify email notifications aren\'t in spam\n\nEmail reminders should arrive at your scheduled times. If not receiving within 10 minutes, contact support.',
    keywords: ['notifications', 'reminders', 'not receiving', 'emails'],
    priority: 8
  },

  // Dashboard & Navigation
  {
    category: 'dashboard',
    question: 'How do I navigate the dashboard?',
    answer: 'Dashboard navigation guide:\n\n**Left Sidebar:**\n- Dashboard (overview)\n- Daily Plans\n- Weekly Plans (PRO+)\n- Monthly Plans (PRO+)\n- Habits\n- Tasks\n- AI Chat\n- Progress\n- Settings\n\n**Top Bar:**\n- Quick AI access\n- Notifications\n- User menu\n\n**Main Area:**\n- Current plan view\n- Task list\n- Quick actions\n- Progress charts',
    keywords: ['navigation', 'dashboard', 'how to use', 'interface', 'menu'],
    priority: 8
  },
  {
    category: 'dashboard',
    question: 'How do I view my progress?',
    answer: 'To view your progress:\n\n1. Click "Progress" in the left sidebar\n2. See your stats:\n   - Tasks completed\n   - Habit streaks\n   - Daily active days\n   - AI interactions\n   - Goals achieved\n\n3. View charts:\n   - Weekly activity\n   - Monthly trends\n   - Habit completion rates\n\n4. Export your data (PRO+ plans)\n\nPRO and ULTIMATE users get AI-generated weekly summaries!',
    keywords: ['progress', 'stats', 'analytics', 'tracking', 'reports'],
    priority: 7
  },

  // General
  {
    category: 'general',
    question: 'Is my data secure?',
    answer: 'Yes! We take security seriously:\n\n✅ All data encrypted in transit (SSL/TLS)\n✅ Passwords hashed (never stored in plain text)\n✅ Payments processed by Stripe/PayPal (PCI compliant)\n✅ Regular security audits\n✅ GDPR compliant\n✅ No data sold to third parties\n\nAI conversations are processed by OpenAI with privacy protections. You can export or delete your data anytime from Settings.',
    keywords: ['security', 'privacy', 'safe', 'data protection', 'encryption'],
    priority: 9
  },
  {
    category: 'general',
    question: 'Can I use Fellini on mobile?',
    answer: 'Yes! Fellini is fully responsive:\n\n**Mobile Web:** Access fellini.com from any mobile browser\n\n**Features:**\n- Full functionality\n- Touch-optimized interface\n- Mobile notifications\n- Works offline (limited)\n\n**Native Apps:** Coming soon! Join our waitlist to be notified when iOS and Android apps launch.',
    keywords: ['mobile', 'phone', 'app', 'ios', 'android', 'tablet'],
    priority: 8
  },
  {
    category: 'general',
    question: 'How do I contact support?',
    answer: 'We\'re here to help!\n\n**AI Support:** Chat with our AI assistant 24/7 (bottom-right corner)\n\n**Human Support:**\n- Email: support@fellini.com\n- Live Chat: Available 9 AM - 9 PM EST\n- Response time: Within 24 hours\n\n**Priority Support:** ULTIMATE plan users get priority responses within 4 hours!\n\n**Community:** Join our Discord server for tips and community support.',
    keywords: ['contact', 'support', 'help', 'email', 'chat'],
    priority: 10
  }
];

module.exports = knowledgeBaseData;
