async function getOrganizationId() {
  try {
    const response = await fetch('https://www.eventbriteapi.com/v3/users/me/organizations/', {
      headers: {
        'Authorization': 'Bearer LHJLXPO2CBWINQXJPHX5',
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch organization data');
    }

    const data = await response.json();
    console.log('Organizations:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error:', error);
  }
}

getOrganizationId(); 