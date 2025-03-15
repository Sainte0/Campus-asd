import fetch from 'node-fetch';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config({ path: '.env.local' });

async function simulateEventbriteOrder() {
  try {
    // Simular una orden de Eventbrite
    const mockOrder = {
      action: 'order.placed',
      order_id: 'test-order-' + Date.now(),
      attendee: {
        profile: {
          name: 'Estudiante Nuevo',
          email: 'nuevo@estudiante.com',
          first_name: 'Estudiante',
          last_name: 'Nuevo'
        },
        id: 'test-attendee-' + Date.now(),
        event_id: process.env.EVENTBRITE_EVENT_ID,
        status: 'Attending'
      }
    };

    console.log('Simulando orden de Eventbrite:', mockOrder);

    // Llamar al webhook local
    const response = await fetch('http://localhost:3000/api/webhook/eventbrite', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(mockOrder)
    });

    const result = await response.json();
    console.log('Respuesta del webhook:', result);

  } catch (error) {
    console.error('Error:', error);
  }
}

simulateEventbriteOrder(); 