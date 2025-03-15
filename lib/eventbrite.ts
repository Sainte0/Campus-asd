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

interface EventbriteAttendee {
  id: string;
  profile: EventbriteProfile;
  status: string;
}

interface EventbriteResponse {
  attendees: EventbriteAttendee[];
  pagination: {
    has_more_items: boolean;
    continuation: string;
  };
}

export async function getEventbriteAttendees(): Promise<EventbriteAttendee[]> {
  try {
    console.log('🔄 Obteniendo asistentes de Eventbrite...');
    
    // Primero obtener las preguntas del evento
    console.log('📝 Obteniendo preguntas del evento...');
    const questionsUrl = `https://www.eventbriteapi.com/v3/events/${process.env.EVENTBRITE_EVENT_ID}/questions/`;
    const questionsResponse = await fetch(questionsUrl, {
      headers: {
        'Authorization': `Bearer ${process.env.EVENTBRITE_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (questionsResponse.ok) {
      const questionsData = await questionsResponse.json();
      console.log('📋 Preguntas disponibles:', JSON.stringify(questionsData.questions.map((q: any) => ({
        id: q.id,
        text: q.question.text,
        type: q.question.type
      })), null, 2));
    }

    // Obtener asistentes
    const url = `https://www.eventbriteapi.com/v3/events/${process.env.EVENTBRITE_EVENT_ID}/attendees/`;
    console.log('🌐 Obteniendo asistentes desde:', url);
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${process.env.EVENTBRITE_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error response:', errorText);
      throw new Error(`Error al obtener asistentes: ${response.status} - ${errorText}`);
    }

    const data = await response.json() as EventbriteResponse;
    console.log(`✅ ${data.attendees.length} asistentes encontrados`);
    
    // Log de cada asistente y sus respuestas
    data.attendees.forEach(attendee => {
      console.log('\n👤 Asistente:', attendee.profile.email);
      console.log('📝 Respuestas:', JSON.stringify(attendee.profile.answers?.map(a => ({
        question_id: a.question_id,
        answer: a.answer
      })), null, 2));
    });
    
    return data.attendees;
  } catch (error) {
    console.error('❌ Error al obtener asistentes de Eventbrite:', error);
    throw error;
  }
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