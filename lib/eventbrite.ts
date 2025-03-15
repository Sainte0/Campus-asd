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
    const response = await fetch(
      `https://www.eventbriteapi.com/v3/events/${process.env.EVENTBRITE_EVENT_ID}/attendees/`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.EVENTBRITE_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Error al obtener asistentes: ${response.status}`);
    }

    const data = await response.json() as EventbriteResponse;
    console.log(`✅ ${data.attendees.length} asistentes encontrados`);
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