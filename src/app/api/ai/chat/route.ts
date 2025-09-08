import { session } from '@descope/nextjs-sdk/server';
import { google } from '@ai-sdk/google';
import { streamText } from 'ai';

export async function POST(req: Request) {
  try {
    const sessionInfo = await session();

    if (!sessionInfo) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { messages } = await req.json();

    // System prompt for travel AI assistant
    const systemPrompt = `You are TravelAI, an intelligent travel planning assistant. You help users plan trips, find flights and hotels, and provide travel recommendations.

    Key capabilities:
    - Flight search and booking assistance
    - Hotel recommendations and booking
    - Destination insights and recommendations  
    - Itinerary planning and optimization
    - Weather information and travel tips
    - Google Calendar integration for trip management

    Guidelines:
    - Be helpful, friendly, and knowledgeable about travel
    - Provide specific, actionable advice
    - Ask clarifying questions when needed
    - Consider budget, preferences, and travel dates
    - Suggest alternatives when appropriate
    - Always prioritize user safety and comfort

    Current user: ${sessionInfo.token.name || sessionInfo.token.email}`;

    const result = await streamText({
      model: google('gemini-1.5-flash'),
      system: systemPrompt,
      messages,
      temperature: 0.7,
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error('Error in AI chat:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
