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

export interface EventbriteAttendee {
  id: string;
  profile: {
    name: string;
    email: string;
    first_name: string;
    last_name: string;
  };
  status: string;
}

export async function getEventbriteAttendees(): Promise<EventbriteAttendee[]> {
  const allAttendees: EventbriteAttendee[] = [];
  let continuation: string | null = null;
  let page = 1;

  try {
    do {
      const url = new URL(`https://www.eventbriteapi.com/v3/events/${EVENTBRITE_EVENT_ID}/attendees/`);
      url.searchParams.append('status', 'attending,checked_in,completed,not_attending,unpaid');
      if (continuation) {
        url.searchParams.append('continuation', continuation);
      }

      console.log(`Fetching page ${page}...`);
      const response = await fetch(url.toString(), {
        headers: {
          'Authorization': `Bearer ${EVENTBRITE_API_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Eventbrite API error:', errorData);
        throw new Error(`Failed to fetch attendees from Eventbrite: ${errorData.error_description || 'Unknown error'}`);
      }

      const data = await response.json();
      
      // Log de depuración para ver los estados de los asistentes
      const attendeesByStatus = data.attendees.reduce((acc: any, attendee: any) => {
        acc[attendee.status] = (acc[attendee.status] || 0) + 1;
        return acc;
      }, {});
      console.log('Attendees by status on this page:', attendeesByStatus);
      
      allAttendees.push(...data.attendees);
      
      // Actualizar el token de continuación para la siguiente página
      continuation = data.pagination?.continuation || null;
      page++;
      
      console.log(`Total attendees so far: ${allAttendees.length}`);
      
    } while (continuation);

    console.log('Final summary:');
    console.log('Total attendees fetched:', allAttendees.length);
    const finalStatusCount = allAttendees.reduce((acc: any, attendee: any) => {
      acc[attendee.status] = (acc[attendee.status] || 0) + 1;
      return acc;
    }, {});
    console.log('Final status breakdown:', finalStatusCount);

    // Retornar solo los asistentes con estados válidos
    return allAttendees.filter(attendee => 
      ['Attending', 'Checked In', 'Completed'].includes(attendee.status)
    );
  } catch (error) {
    console.error('Error fetching Eventbrite attendees:', error);
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