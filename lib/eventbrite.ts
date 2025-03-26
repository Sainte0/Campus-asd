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
  event_id: string;
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
  const EVENTBRITE_EVENT_ID_1 = process.env.EVENTBRITE_EVENT_ID_1;
  const EVENTBRITE_EVENT_ID_2 = process.env.EVENTBRITE_EVENT_ID_2;
  const EVENTBRITE_API_KEY = process.env.EVENTBRITE_API_KEY;

  if (!EVENTBRITE_EVENT_ID_1 || !EVENTBRITE_EVENT_ID_2 || !EVENTBRITE_API_KEY) {
    throw new Error('Faltan variables de entorno requeridas');
  }

  const attendees: EventbriteAttendee[] = [];

  // Obtener asistentes del primer evento
  const response1 = await fetch(
    `https://www.eventbriteapi.com/v3/events/${EVENTBRITE_EVENT_ID_1}/attendees/`,
    {
      headers: {
        'Authorization': `Bearer ${EVENTBRITE_API_KEY}`
      }
    }
  );

  if (!response1.ok) {
    throw new Error(`Error obteniendo asistentes del primer evento: ${response1.statusText}`);
  }

  const data1 = await response1.json();
  attendees.push(...data1.attendees.map((attendee: any) => ({
    ...attendee,
    event_id: EVENTBRITE_EVENT_ID_1
  })));

  // Obtener asistentes del segundo evento
  const response2 = await fetch(
    `https://www.eventbriteapi.com/v3/events/${EVENTBRITE_EVENT_ID_2}/attendees/`,
    {
      headers: {
        'Authorization': `Bearer ${EVENTBRITE_API_KEY}`
      }
    }
  );

  if (!response2.ok) {
    throw new Error(`Error obteniendo asistentes del segundo evento: ${response2.statusText}`);
  }

  const data2 = await response2.json();
  attendees.push(...data2.attendees.map((attendee: any) => ({
    ...attendee,
    event_id: EVENTBRITE_EVENT_ID_2
  })));

  return attendees;
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