const EVENTBRITE_API_KEY = process.env.EVENTBRITE_API_KEY;
const EVENTBRITE_ORGANIZATION_ID = process.env.EVENTBRITE_ORGANIZATION_ID;
const EVENTBRITE_EVENT_ID = process.env.EVENTBRITE_EVENT_ID;

if (!EVENTBRITE_API_KEY) {
  throw new Error('Please define EVENTBRITE_API_KEY in your .env file');
}

if (!EVENTBRITE_ORGANIZATION_ID) {
  throw new Error('Please define EVENTBRITE_ORGANIZATION_ID in your .env file');
}

if (!EVENTBRITE_EVENT_ID) {
  throw new Error('Please define EVENTBRITE_EVENT_ID in your .env file');
}

interface EventbriteAnswer {
  question_id: string;
  answer: string;
}

interface EventbriteProfile {
  name: string;
  email: string;
  first_name: string;
  last_name: string;
  answers?: EventbriteAnswer[];
}

export interface EventbriteAttendee {
  id: string;
  name: string;
  email: string;
  answers?: Array<{
    question_id: string;
    answer: string;
  }>;
}

export interface EventbriteQuestion {
  id: string;
  text: string;
}

interface EventbriteResponse {
  attendees: EventbriteAttendee[];
  pagination: {
    has_more_items: boolean;
    continuation: string;
  };
}

export async function getEventbriteAttendees(): Promise<EventbriteAttendee[]> {
  console.log('🔄 Obteniendo asistentes de Eventbrite...');
  
  // Get questions first
  console.log('📝 Obteniendo preguntas del evento...');
  const questions = await getEventbriteQuestions();
  console.log('📋 Preguntas disponibles:', questions);

  const url = `https://www.eventbriteapi.com/v3/events/${process.env.EVENTBRITE_EVENT_ID}/attendees/?expand=profile,answers&status=attending`;
  console.log('🌐 Obteniendo asistentes desde:', url);

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${process.env.EVENTBRITE_API_KEY}`
    }
  });

  if (!response.ok) {
    console.error('❌ Error al obtener asistentes:', await response.text());
    throw new Error('Failed to fetch attendees');
  }

  const data = await response.json();
  const attendees = data.attendees;

  console.log(`✅ ${attendees.length} asistentes encontrados`);

  return attendees.map((attendee: any) => {
    console.log('📝 Respuestas del asistente:', attendee.answers);
    
    return {
      id: attendee.id,
      name: `${attendee.profile.first_name} ${attendee.profile.last_name}`.trim(),
      email: attendee.profile.email,
      answers: attendee.answers
    };
  });
}

export async function getEventbriteQuestions(): Promise<any[]> {
  const url = `https://www.eventbriteapi.com/v3/events/${process.env.EVENTBRITE_EVENT_ID}/questions/`;
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${process.env.EVENTBRITE_API_KEY}`
    }
  });

  if (!response.ok) {
    console.error('❌ Error al obtener preguntas:', await response.text());
    throw new Error('Failed to fetch questions');
  }

  const data = await response.json();
  return data.questions.map((q: any) => ({
    id: q.id,
    text: q.question.text
  }));
}

export async function syncEventbriteAttendees() {
  try {
    const attendees = await getEventbriteAttendees();
    return attendees;
  } catch (error) {
    console.error('Error syncing Eventbrite attendees:', error);
    throw error;
  }
} 