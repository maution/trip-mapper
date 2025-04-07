fetch('trips.json')
  .then(response => response.json())
  .then(trips => {
    const tbody = document.querySelector('#itinerary-table tbody');

    trips.forEach(trip => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${trip.flight_number}</td>
        <td>${trip.airline}</td>
        <td>${trip.departure_date}</td>
        <td>${trip.departure_city}</td>
        <td>${trip.destination_city}</td>
      `;
      tbody.appendChild(row);
    });
  })
  .catch(error => console.error('Error loading JSON:', error));