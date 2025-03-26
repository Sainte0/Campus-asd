interface EventbriteAnswer {
  question_id: string;
  answer: string;
  text?: string;
}

interface EventbriteProfile {
  name: string;
  email: string;
  first_name: string;
  last_name: string;
  answers?: EventbriteAnswer[];
}

export interface EventbriteAttendee {
  event_id: string;
  profile: EventbriteProfile;
  answers: EventbriteAnswer[];
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
  if (!process.env.EVENTBRITE_API_KEY) {
    throw new Error('EVENTBRITE_API_KEY no está configurada');
  }

  if (!process.env.EVENTBRITE_EVENT_ID_1 || !process.env.EVENTBRITE_EVENT_ID_2) {
    throw new Error('EVENTBRITE_EVENT_ID_1 o EVENTBRITE_EVENT_ID_2 no están configurados');
  }

  const headers = {
    'Authorization': `Bearer ${process.env.EVENTBRITE_API_KEY}`,
    'Content-Type': 'application/json'
  };

  // Obtener asistentes del primer evento
  const response1 = await fetch(
    `https://www.eventbriteapi.com/v3/events/${process.env.EVENTBRITE_EVENT_ID_1}/attendees/?expand=profile,answers&status=attending`,
    { headers }
  );

  if (!response1.ok) {
    throw new Error(`Error al obtener asistentes del primer evento: ${response1.statusText}`);
  }

  const data1 = await response1.json();
  const attendees1 = data1.attendees || [];

  // Obtener asistentes del segundo evento
  const response2 = await fetch(
    `https://www.eventbriteapi.com/v3/events/${process.env.EVENTBRITE_EVENT_ID_2}/attendees/?expand=profile,answers&status=attending`,
    { headers }
  );

  if (!response2.ok) {
    throw new Error(`Error al obtener asistentes del segundo evento: ${response2.statusText}`);
  }

  const data2 = await response2.json();
  const attendees2 = data2.attendees || [];

  // Combinar los asistentes de ambos eventos
  return [...attendees1, ...attendees2];
}

export async function getEventbriteQuestions(): Promise<any[]> {
  const EVENTBRITE_EVENT_ID_1 = process.env.EVENTBRITE_EVENT_ID_1;
  const EVENTBRITE_API_KEY = process.env.EVENTBRITE_API_KEY;

  if (!EVENTBRITE_EVENT_ID_1 || !EVENTBRITE_API_KEY) {
    throw new Error('Faltan variables de entorno requeridas');
  }

  const url = `https://www.eventbriteapi.com/v3/events/${EVENTBRITE_EVENT_ID_1}/questions/`;
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${EVENTBRITE_API_KEY}`
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