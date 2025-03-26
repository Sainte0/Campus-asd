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

  console.log('🔄 Obteniendo asistentes de Eventbrite...');
  console.log('📝 Variables de entorno configuradas:');
  console.log('- EVENTBRITE_EVENT_ID_1:', EVENTBRITE_EVENT_ID_1);
  console.log('- EVENTBRITE_EVENT_ID_2:', EVENTBRITE_EVENT_ID_2);
  console.log('- EVENTBRITE_API_KEY:', EVENTBRITE_API_KEY ? '✅' : '❌');

  const attendees: EventbriteAttendee[] = [];

  // Obtener asistentes del primer evento
  console.log('\n📝 Obteniendo asistentes del primer evento...');
  const response1 = await fetch(
    `https://www.eventbriteapi.com/v3/events/${EVENTBRITE_EVENT_ID_1}/attendees/?expand=profile,answers&status=attending`,
    {
      headers: {
        'Authorization': `Bearer ${EVENTBRITE_API_KEY}`
      }
    }
  );

  if (!response1.ok) {
    const errorText = await response1.text();
    console.error('❌ Error al obtener asistentes del primer evento:', errorText);
    throw new Error(`Error obteniendo asistentes del primer evento: ${response1.statusText}`);
  }

  const data1 = await response1.json();
  console.log(`✅ ${data1.attendees?.length || 0} asistentes encontrados en el primer evento`);
  
  attendees.push(...data1.attendees.map((attendee: any) => ({
    id: attendee.id,
    name: `${attendee.profile?.first_name || ''} ${attendee.profile?.last_name || ''}`.trim(),
    email: attendee.profile?.email || '',
    event_id: EVENTBRITE_EVENT_ID_1,
    answers: attendee.answers
  })));

  // Obtener asistentes del segundo evento
  console.log('\n📝 Obteniendo asistentes del segundo evento...');
  const response2 = await fetch(
    `https://www.eventbriteapi.com/v3/events/${EVENTBRITE_EVENT_ID_2}/attendees/?expand=profile,answers&status=attending`,
    {
      headers: {
        'Authorization': `Bearer ${EVENTBRITE_API_KEY}`
      }
    }
  );

  if (!response2.ok) {
    const errorText = await response2.text();
    console.error('❌ Error al obtener asistentes del segundo evento:', errorText);
    throw new Error(`Error obteniendo asistentes del segundo evento: ${response2.statusText}`);
  }

  const data2 = await response2.json();
  console.log(`✅ ${data2.attendees?.length || 0} asistentes encontrados en el segundo evento`);
  
  attendees.push(...data2.attendees.map((attendee: any) => ({
    id: attendee.id,
    name: `${attendee.profile?.first_name || ''} ${attendee.profile?.last_name || ''}`.trim(),
    email: attendee.profile?.email || '',
    event_id: EVENTBRITE_EVENT_ID_2,
    answers: attendee.answers
  })));

  console.log(`\n✅ Total de asistentes encontrados: ${attendees.length}`);
  return attendees;
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