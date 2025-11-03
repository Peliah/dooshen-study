import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

/**
 * Tool for generating personalized study plans
 * Creates daily or weekly study schedules based on content and preferences
 */
export const generateStudyPlanTool = createTool({
  id: 'generate-study-plan',
  description:
    'Generate personalized study plans (daily or weekly) based on document content, available time, and study preferences. Creates structured schedules with topics, review sessions, and break recommendations.',
  inputSchema: z.object({
    documentMetadata: z
      .object({
        chapters: z.array(z.string()).optional(),
        totalPages: z.number().optional(),
        topics: z.array(z.string()).optional(),
      })
      .optional()
      .describe('Document structure and content information'),
    studyHoursPerDay: z
      .number()
      .min(0.5)
      .max(12)
      .optional()
      .default(2)
      .describe('Available study hours per day'),
    targetCompletionDate: z
      .string()
      .optional()
      .describe('Target date to complete studying (ISO date string)'),
    studyDaysPerWeek: z
      .number()
      .int()
      .min(1)
      .max(7)
      .optional()
      .default(5)
      .describe('Number of days per week available for studying'),
    planType: z
      .enum(['daily', 'weekly'])
      .optional()
      .default('daily')
      .describe('Type of plan to generate'),
    studyStyle: z
      .enum(['distributed', 'intensive', 'balanced'])
      .optional()
      .default('balanced')
      .describe('Study style preference'),
    focusAreas: z
      .array(z.string())
      .optional()
      .describe('Specific topics or areas to focus on'),
    currentDate: z
      .string()
      .optional()
      .describe('Current date to start from (ISO date string, defaults to today)'),
  }),
  outputSchema: z.object({
    planType: z.string(),
    startDate: z.string(),
    endDate: z.string().optional(),
    schedule: z.array(
      z.object({
        date: z.string(),
        dayOfWeek: z.string(),
        sessions: z.array(
          z.object({
            time: z.string(),
            duration: z.number(),
            topic: z.string(),
            type: z.string().describe('e.g., "new-material", "review", "quiz"'),
            notes: z.string().optional(),
          })
        ),
        totalHours: z.number(),
        breaks: z
          .array(
            z.object({
              time: z.string(),
              duration: z.number(),
              reason: z.string(),
            })
          )
          .optional(),
      })
    ),
    totalDays: z.number(),
    totalHours: z.number(),
    recommendations: z.array(z.string()).optional(),
  }),
  execute: async ({ context, runtimeContext }) => {
    // Import mastra instance to access agents
    const { mastra } = await import('../index');
    const agent = mastra?.getAgent('studyBuddyAgent');
    
    if (!agent) {
      return await generateBasicStudyPlan(context);
    }

    const prompt = createStudyPlanPrompt(context);
    const response = await agent.generate(prompt);
    
    try {
      const jsonMatch = response.text.match(/```json\n([\s\S]*?)\n```/) || 
                       response.text.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[1] || jsonMatch[0]);
        return parsed;
      }
      
      return await generateBasicStudyPlan(context);
    } catch (error) {
      return await generateBasicStudyPlan(context);
    }
  },
});

/**
 * Create prompt for AI agent to generate study plan
 */
function createStudyPlanPrompt(context: any): string {
  const startDate = context.currentDate || new Date().toISOString().split('T')[0];
  const daysAvailable = context.targetCompletionDate
    ? Math.ceil(
        (new Date(context.targetCompletionDate).getTime() -
          new Date(startDate).getTime()) /
          (1000 * 60 * 60 * 24)
      )
    : 30; // Default 30 days

  return `Generate a ${context.planType} study plan with the following requirements:

Study Parameters:
- Available hours per day: ${context.studyHoursPerDay}
- Study days per week: ${context.studyDaysPerWeek}
- Total days available: ${daysAvailable}
- Study style: ${context.studyStyle}
- Start date: ${startDate}
${context.targetCompletionDate ? `- Target completion date: ${context.targetCompletionDate}` : ''}

Document Information:
${context.documentMetadata?.chapters ? `- Chapters: ${context.documentMetadata.chapters.join(', ')}` : ''}
${context.documentMetadata?.totalPages ? `- Total pages: ${context.documentMetadata.totalPages}` : ''}
${context.documentMetadata?.topics ? `- Topics: ${context.documentMetadata.topics.join(', ')}` : ''}

${context.focusAreas ? `Focus Areas: ${context.focusAreas.join(', ')}` : ''}

Requirements:
- Create ${context.planType === 'daily' ? 'daily' : 'weekly'} schedule
- Include review sessions (spaced repetition)
- Include breaks (5-10 min every hour, longer break every 2-3 hours)
- Distribute topics evenly
${context.studyStyle === 'distributed' ? '- Use spaced learning (review previous days)' : ''}
${context.studyStyle === 'intensive' ? '- Use intensive learning (more new material per day)' : ''}

Return as JSON with this structure:
{
  "planType": "${context.planType}",
  "startDate": "${startDate}",
  ${context.targetCompletionDate ? `"endDate": "${context.targetCompletionDate}",` : ''}
  "schedule": [
    {
      "date": "YYYY-MM-DD",
      "dayOfWeek": "Monday",
      "sessions": [
        {
          "time": "09:00",
          "duration": 1.5,
          "topic": "Chapter 1",
          "type": "new-material",
          "notes": "Focus on key concepts"
        }
      ],
      "totalHours": 2,
      "breaks": [
        {
          "time": "10:30",
          "duration": 10,
          "reason": "Short break"
        }
      ]
    }
  ],
  "totalDays": ${daysAvailable},
  "totalHours": ${context.studyHoursPerDay * context.studyDaysPerWeek * (daysAvailable / 7)},
  "recommendations": ["Study in quiet environment", "Take notes during sessions"]
}`;
}

/**
 * Generate basic study plan (fallback)
 */
async function generateBasicStudyPlan(context: any): Promise<any> {
  const startDate = context.currentDate || new Date().toISOString().split('T')[0];
  const days = context.targetCompletionDate
    ? Math.ceil(
        (new Date(context.targetCompletionDate).getTime() -
          new Date(startDate).getTime()) /
          (1000 * 60 * 60 * 24)
      )
    : 30;

  const schedule: Array<{
    date: string;
    dayOfWeek: string;
    sessions: Array<{
      time: string;
      duration: number;
      topic: string;
      type: string;
      notes?: string;
    }>;
    totalHours: number;
    breaks?: Array<{
      time: string;
      duration: number;
      reason: string;
    }>;
  }> = [];
  const start = new Date(startDate);
  
  const chapters = context.documentMetadata?.chapters || 
                   Array.from({ length: Math.ceil(days / 3) }, (_, i) => `Chapter ${i + 1}`);
  
  let chapterIndex = 0;
  for (let i = 0; i < days; i++) {
    const date = new Date(start);
    date.setDate(date.getDate() + i);
    
    // Skip weekends if studyDaysPerWeek < 7
    if (context.studyDaysPerWeek < 7) {
      const dayOfWeek = date.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        continue; // Skip weekends
      }
    }

    const sessions: Array<{
      time: string;
      duration: number;
      topic: string;
      type: string;
      notes?: string;
    }> = [];
    let totalHours = 0;
    let currentHour = 9; // Start at 9 AM
    
    // Create study sessions
    while (totalHours < context.studyHoursPerDay) {
      const sessionDuration = Math.min(1.5, context.studyHoursPerDay - totalHours);
      const topic = chapters[chapterIndex % chapters.length];
      
      sessions.push({
        time: `${String(currentHour).padStart(2, '0')}:00`,
        duration: sessionDuration,
        topic,
        type: i % 3 === 0 ? 'review' : 'new-material',
        notes: i % 3 === 0 ? 'Review previous material' : 'Focus on new concepts',
      });
      
      totalHours += sessionDuration;
      currentHour += Math.ceil(sessionDuration) + 0.5; // Add break time
      
      if (totalHours >= context.studyHoursPerDay) break;
    }

    schedule.push({
      date: date.toISOString().split('T')[0],
      dayOfWeek: date.toLocaleDateString('en-US', { weekday: 'long' }),
      sessions,
      totalHours: Math.round(totalHours * 10) / 10,
      breaks: [
        {
          time: `${String(currentHour - 1).padStart(2, '0')}:30`,
          duration: 15,
          reason: 'Mid-session break',
        },
      ],
    });

    chapterIndex++;
  }

  return {
    planType: context.planType,
    startDate,
    endDate: context.targetCompletionDate,
    schedule: schedule.slice(0, days),
    totalDays: schedule.length,
    totalHours: Math.round(schedule.reduce((sum, day) => sum + day.totalHours, 0) * 10) / 10,
    recommendations: [
      'Study in a quiet, distraction-free environment',
      'Take breaks to maintain focus',
      'Review previous material regularly',
      'Stay consistent with the schedule',
    ],
  };
}

