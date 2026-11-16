// Centro aproximado do Vale do Aço
const mapa = L.map('mapa').setView([-19.5, -42.6], 11);

L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; OpenStreetMap'
}).addTo(mapa);

// Focos de exemplo (depois virão de um backend)
const focos = [
  { lat: -19.47, lng: -42.54, intensidade: 4, descricao: 'Mata próxima à rodovia' },
  { lat: -19.55, lng: -42.65, intensidade: 2, descricao: 'Capim seco' }
];

const cores = ['', '#fcc419', '#ff922b', '#f76707', '#e03131', '#a61e4d'];

focos.forEach(f => {
  L.circleMarker([f.lat, f.lng], {
    radius: 6 + f.intensidade * 3,
    color: cores[f.intensidade],
    fillOpacity: 0.6
  }).addTo(mapa).bindPopup(`<b>Nível ${f.intensidade}</b><br>${f.descricao}`);
});


