const fetchCoordinates = async (city) => {
  const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(city)}`);
  const data = await response.json();
  if (data.length > 0) {
    return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
  }
  return null;
};

let map;

const getMarkerColor = (departureDate) => {
  const today = new Date();
  const tripDate = new Date(departureDate);
  if (tripDate < today) {
    return 'gray'; // Past trips
  } else if (tripDate.toDateString() === today.toDateString()) {
    return 'red'; // Today's trips
  } else {
    return 'green'; // Upcoming trips
  }
};

// Function to create a half-elliptic line using Bezier curve
const createEllipticCurve = (departureCoord, destinationCoord) => {
  const midPoint = [
    (departureCoord[0] + destinationCoord[0]) / 2,
    (departureCoord[1] + destinationCoord[1]) / 2,
  ];
  const controlPoint1 = [
    midPoint[0],
    departureCoord[1] + (destinationCoord[1] - departureCoord[1]) / 4 + 5, // Adjust curvature
  ];
  const controlPoint2 = [
    midPoint[0],
    destinationCoord[1] - (destinationCoord[1] - departureCoord[1]) / 4 - 5,
  ];
  const latlngs = [
    'M', departureCoord,
    'C', controlPoint1, controlPoint2, destinationCoord,
  ];
  return L.curve(latlngs, { color: 'blue' });
};

const animateAirplane = (airplaneMarker, departureCoord, destinationCoord) => {
  return new Promise((resolve) => {
    let index = 0;
    const step = 0.001;  // Adjust speed
    const animation = () => {
      if (index < 1) {
        const lat = departureCoord[0] + (destinationCoord[0] - departureCoord[0]) * index;
        const lng = departureCoord[1] + (destinationCoord[1] - departureCoord[1]) * index;
        airplaneMarker.setLatLng([lat, lng]);
        index += step;
        requestAnimationFrame(animation);
      } else {
        resolve();  // Resolve the promise when animation completes
      }
    };
    animation();
  });
};

const plotTrips = async (trips) => {
  if (!map) {
    map = L.map('map').setView([20, 0], 2); // Initialize map only once
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
    }).addTo(map);
  }

  map.eachLayer((layer) => {
    if (layer !== map._layers[Object.keys(map._layers)[0]]) {
      map.removeLayer(layer);
    }
  });

  for (const trip of trips) {
    const departureCoord = await fetchCoordinates(trip.departure_city);
    const destinationCoord = await fetchCoordinates(trip.destination_city);
    const color = getMarkerColor(trip.departure_date);

    if (departureCoord && destinationCoord) {
      L.circleMarker(departureCoord, { color }).addTo(map)
        .bindPopup(`<b>${trip.departure_city}</b><br>Flight Number: ${trip.flight_number}<br>Airline: ${trip.airline}<br>Date: ${trip.departure_date}`);

      L.circleMarker(destinationCoord, { color }).addTo(map)
        .bindPopup(`<b>${trip.destination_city}</b><br>Flight Number: ${trip.flight_number}<br>Airline: ${trip.airline}<br>Date: ${trip.departure_date}`);

      const ellipticCurve = createEllipticCurve(departureCoord, destinationCoord);
      ellipticCurve.addTo(map);

      // Placeholder for SVG airplane
      const airplaneSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="30px" height="30px" viewBox="0 0 64 64" aria-hidden="true" role="img"><path xmlns="http://www.w3.org/2000/svg" d="M56.113 47.531l-17.446-7.797c.159-.216.319-.432.479-.652c.43-.59.886-1.211 1.393-1.821c2.317-.191 6.797-1.867 8.385-3.444c.147-.146.248-.441.313-.81L62 25.532l-10.129 2.85l1.031-5l3.354-1.278l-3.174.403l.398-1.929l1.645.41l3.652-2.604l-4.559-1.386l.025-.126l.684-3.314l-3.01 1.27l-.707.298L48.123 12l-3.553 1.123l1.822 4.035l-.352.147l-.297.536l-3.328 6.02l-1.657.211a.497.497 0 0 0-.304-.123s-5.814.764-7.992 2.804c-.416.39-.849.969-.881 2.114a832.807 832.807 0 0 0-7.795 2.382l-8.519-6.89v-5.618l-1.776 1.124l-1.776 5.617l4.064 8.357c-.382.132-.746.259-1.076.379c-4.909 1.769-5.94 3.753-7.133 6.051c-.708 1.363-1.44 2.772-3.27 4.619c-1.265 1.278-2.858 3.2-2.108 5.139C2.698 51.335 4.017 52 6.111 52c3.882 0 11.318-2.121 21.711-6.17l27.403 5.494l3.552-2.603v-6.387l-1.724 1.179l-.94 4.018m-.557-19.255l-6.238 3.653a8.101 8.101 0 0 0-.206-1.842l6.444-1.811m-13.679-3.44l-.539.975a3.74 3.74 0 0 0-.117-.892l.656-.083M35.69 38.404l-13.624 6.272l2.469.495C15.17 48.685 9.152 50.2 6.111 50.2c-3.028 0-3.109-1.5-.615-4.02c1.42-1.433 2.259-2.664 2.884-3.75l-.011.019c.813.954 2.003 1.57 3.347 1.57l.022-.002c.086-2.164.444-3.715.731-4.629a4.392 4.392 0 0 1-1.726-.839c-.786.842-1.237 1.764-1.794 2.83c1.178-2.258 1.869-3.861 6.314-5.463c7.062-2.545 27.104-8.379 27.104-8.379l4.795-8.672l.07.155l4.572 1.139L50 28.905l-1.237.348c-.093-.112-.195-.172-.308-.158c-2.243.294-6.317 1.62-8.327 3.69c-.414.426-.889 1.005-.889 2.246c0 .338.032.655.085.944c-.886 1.055-1.605 2.122-2.299 3.024l-1.335-.595M8.668 41.912l.044-.083c-.014.028-.028.056-.044.083" fill="#000000"/></svg>`;

      const airplaneDiv = L.divIcon({ html: airplaneSVG, className: 'airplane-icon', iconSize: [30, 30] });

      const airplaneMarker = L.marker(departureCoord, { icon: airplaneDiv }).addTo(map);
      
      // Wait for the animation to complete before plotting the next trip
      await animateAirplane(airplaneMarker, departureCoord, destinationCoord);
    }
  }
};

const populateFilters = (trips) => {
  const airlines = [...new Set(trips.map(trip => trip.airline))];
  const departureCities = [...new Set(trips.map(trip => trip.departure_city))];

  const airlineSelect = document.getElementById('airline-select');
  const departureSelect = document.getElementById('departure-select');

  airlines.forEach(airline => {
    const option = document.createElement('option');
    option.value = airline;
    option.textContent = airline;
    airlineSelect.appendChild(option);
  });

  departureCities.forEach(city => {
    const option = document.createElement('option');
    option.value = city;
    option.textContent = city;
    departureSelect.appendChild(option);
  });
};

const filterTrips = (trips) => {
  const selectedAirline = document.getElementById('airline-select').value;
  const selectedDeparture = document.getElementById('departure-select').value;
  const startDate = document.getElementById('start-date').value;
  const endDate = document.getElementById('end-date').value;

  return trips.filter(trip => {
    const matchesAirline = !selectedAirline || trip.airline === selectedAirline;
    const matchesDeparture = !selectedDeparture || trip.departure_city === selectedDeparture;
    const matchesDate = (!startDate || new Date(trip.departure_date) >= new Date(startDate)) &&
                        (!endDate || new Date(trip.departure_date) <= new Date(endDate));
    return matchesAirline && matchesDeparture && matchesDate;
  });
};

document.getElementById('filter-button').addEventListener('click', () => {
  fetch('trips.json')
    .then(response => response.json())
    .then(trips => {
      const filteredTrips = filterTrips(trips);
      plotTrips(filteredTrips);
    })
    .catch(error => console.error('Error loading JSON:', error));
});

document.getElementById('all-trips').addEventListener('click', () => {
  fetch('trips.json')
    .then(response => response.json())
    .then(trips => {
      plotTrips(trips);
    })
    .catch(error => console.error('Error loading JSON:', error));
});

document.getElementById('upcoming-trips').addEventListener('click', () => {
  fetch('trips.json')
    .then(response => response.json())
    .then(trips => {
      const upcomingTrips = trips.filter(trip => new Date(trip.departure_date) >= new Date());
      plotTrips(upcomingTrips);
    })
    .catch(error => console.error('Error loading JSON:', error));
});

fetch('trips.json')
  .then(response => response.json())
  .then(trips => {
    populateFilters(trips);
    plotTrips(trips);
  })
  .catch(error => console.error('Error loading JSON:', error));