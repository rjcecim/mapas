document.addEventListener('DOMContentLoaded', () => {
    const stateSelect = document.getElementById('stateSelect');
    const citySearch = document.getElementById('citySearch');
    const clearSearchBtn = document.getElementById('clearSearchBtn');
    const checkboxContainer = document.getElementById('checkboxContainer');
    const selectAllBtn = document.getElementById('selectAllBtn');
    const generateMapBtn = document.getElementById('generateMapBtn');
    const downloadMapBtn = document.getElementById('downloadMapBtn');

    const geojsonFiles = {
        acre: 'geojson/acre.json',
        alagoas: 'geojson/alagoas.json',
        amapa: 'geojson/amapa.json',
        amazonas: 'geojson/amazonas.json',
        bahia: 'geojson/bahia.json',
        ceara: 'geojson/ceara.json',
        distritofederal: 'geojson/distritofederal.json',
        espiritosanto: 'geojson/espiritosanto.json',
        goias: 'geojson/goias.json',
        maranhao: 'geojson/maranhao.json',
        matogrosso: 'geojson/matogrosso.json',
        matogrossodosul: 'geojson/matogrossodosul.json',
        minasgerais: 'geojson/minasgerais.json',
        para: 'geojson/para.json',
        paraiba: 'geojson/paraiba.json',
        parana: 'geojson/parana.json',
        pernambuco: 'geojson/pernambuco.json',
        piaui: 'geojson/piaui.json',
        riodejaneiro: 'geojson/riodejaneiro.json',
        riograndedonorte: 'geojson/riograndedonorte.json',
        riograndedosul: 'geojson/riograndedosul.json',
        rondonia: 'geojson/rondonia.json',
        roraima: 'geojson/roraima.json',
        santacatarina: 'geojson/santacatarina.json',
        saopaulo: 'geojson/saopaulo.json',
        sergipe: 'geojson/sergipe.json',
        tocantins: 'geojson/tocantins.json'
    };

    let map = null;
    let geojsonDataPerState = {};

    const selectedCitiesPerState = {};
    Object.keys(geojsonFiles).forEach(state => {
        selectedCitiesPerState[state] = new Set();
    });

    const initializeMap = () => {
        map = L.map('map').setView([-15.793889, -47.882778], 5);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '© OpenStreetMap'
        }).addTo(map);
    };

    const loadGeoJSON = async (state) => {
        const filePath = geojsonFiles[state];
        if (!filePath) {
            alert('Arquivo GeoJSON para o estado selecionado não encontrado.');
            return;
        }

        try {
            const response = await fetch(filePath);
            if (!response.ok) {
                throw new Error(`Erro ao carregar GeoJSON: ${response.status}`);
            }
            const data = await response.json();
            geojsonDataPerState[state] = data;
            createCityCheckboxes(state, data);
            generateMapBtn.disabled = false;
            downloadMapBtn.disabled = false;
            citySearch.disabled = false;
            clearSearchBtn.disabled = false;
            citySearch.value = '';
            filterCities('');
        } catch (error) {
            console.error(error);
            alert('Falha ao carregar dados GeoJSON.');
        }
    };

    const createCityCheckboxes = (state, data) => {
        if (state !== stateSelect.value) return;
        checkboxContainer.innerHTML = '';
        if (!data || !data.features) return;
        const fragment = document.createDocumentFragment();
        data.features.forEach(feature => {
            const cityName = feature.properties.name;
            const div = document.createElement('div');
            div.className = 'form-check';
            const checkbox = document.createElement('input');
            checkbox.className = 'form-check-input';
            checkbox.type = 'checkbox';
            checkbox.value = cityName;
            checkbox.id = `checkbox-${state}-${cityName}`;
            if (selectedCitiesPerState[state].has(cityName)) {
                checkbox.checked = true;
            }
            checkbox.addEventListener('change', () => {
                if (checkbox.checked) {
                    selectedCitiesPerState[state].add(cityName);
                } else {
                    selectedCitiesPerState[state].delete(cityName);
                }
            });
            const label = document.createElement('label');
            label.className = 'form-check-label';
            label.htmlFor = `checkbox-${state}-${cityName}`;
            label.textContent = cityName;
            div.appendChild(checkbox);
            div.appendChild(label);
            fragment.appendChild(div);
        });
        checkboxContainer.appendChild(fragment);
    };

    const selectAllCities = () => {
        const state = stateSelect.value;
        if (!state || !geojsonDataPerState[state]) return;
        const checkboxes = checkboxContainer.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(cb => {
            if (!cb.checked) {
                cb.checked = true;
                selectedCitiesPerState[state].add(cb.value);
            }
        });
    };

    const generateMap = () => {
        if (map.hasLayer(L.geoJSON())) {
            map.eachLayer(layer => {
                if (layer instanceof L.GeoJSON) {
                    map.removeLayer(layer);
                }
            });
        }

        for (const state in geojsonDataPerState) {
            const data = geojsonDataPerState[state];
            L.geoJSON(data, {
                style: feature => {
                    let fillColor = '#ccccff';
                    if (selectedCitiesPerState[state].has(feature.properties.name)) {
                        if (state === 'para') {
                            fillColor = '#ff0000';
                        } else if (state === 'tocantins') {
                            fillColor = '#ffff00';
                        } else {
                            fillColor = '#00ff00';
                        }
                    }
                    return {
                        color: 'black',
                        weight: 1,
                        dashArray: '5, 5',
                        fillOpacity: 0.6,
                        fillColor: fillColor
                    };
                },
                onEachFeature: (feature, layer) => {
                    layer.bindTooltip(`Cidade: ${feature.properties.name}`);
                }
            }).addTo(map);
        }

        const allLayers = [];
        map.eachLayer(layer => {
            if (layer instanceof L.GeoJSON) {
                allLayers.push(layer);
            }
        });
        if (allLayers.length > 0) {
            const group = L.featureGroup(allLayers);
            map.fitBounds(group.getBounds());
        }
    };

    const filterCities = (searchTerm) => {
        const checkboxes = checkboxContainer.querySelectorAll('input[type="checkbox"]');
        let anyVisible = false;

        checkboxes.forEach(cb => {
            const label = cb.nextElementSibling;
            if (label.textContent.toLowerCase().includes(searchTerm.toLowerCase())) {
                cb.parentElement.style.display = 'block';
                anyVisible = true;
            } else {
                cb.parentElement.style.display = 'none';
            }
        });

        if (searchTerm !== '') {
            if (!anyVisible) {
                if (!document.getElementById('noResults')) {
                    const noResultsDiv = document.createElement('div');
                    noResultsDiv.id = 'noResults';
                    noResultsDiv.className = 'text-center text-muted mt-2';
                    noResultsDiv.textContent = 'Nenhuma cidade encontrada.';
                    checkboxContainer.appendChild(noResultsDiv);
                }
            } else {
                const noResultsDiv = document.getElementById('noResults');
                if (noResultsDiv) {
                    checkboxContainer.removeChild(noResultsDiv);
                }
            }
        } else {
            const noResultsDiv = document.getElementById('noResults');
            if (noResultsDiv) {
                checkboxContainer.removeChild(noResultsDiv);
            }
        }
    };

    const debounce = (func, delay) => {
        let debounceTimer;
        return function() {
            const context = this;
            const args = arguments;
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => func.apply(context, args), delay);
        };
    };

    const downloadMap = () => {
        const allSelectedCities = {};
        for (const state in selectedCitiesPerState) {
            if (selectedCitiesPerState[state].size > 0) {
                allSelectedCities[state] = Array.from(selectedCitiesPerState[state]);
            }
        }

        if (Object.keys(allSelectedCities).length === 0) {
            alert('Nenhuma cidade selecionada para gerar o mapa.');
            return;
        }

        const embeddedGeoJSON = {};
        for (const state in geojsonDataPerState) {
            embeddedGeoJSON[state] = geojsonDataPerState[state];
        }

        const mapHtml = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Mapa Selecionado</title>

    <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://unpkg.com/leaflet/dist/leaflet.css" />

    <style>
        body {
            font-family: 'Roboto', sans-serif;
        }
        #map { width: 100%; height: 100vh; }
    </style>
</head>
<body>
    <div id="map"></div>

    <script src="https://unpkg.com/leaflet/dist/leaflet.js"></script>

    <script>
        const embeddedGeoJSON = ${JSON.stringify(embeddedGeoJSON)};
        const selectedCitiesPerState = ${JSON.stringify(allSelectedCities)};

        const map = L.map('map').setView([-15.793889, -47.882778], 5);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '© OpenStreetMap'
        }).addTo(map);

        for (const state in embeddedGeoJSON) {
            const data = embeddedGeoJSON[state];
            L.geoJSON(data, {
                style: feature => {
                    let fillColor = '#ccccff';
                    if (selectedCitiesPerState[state].includes(feature.properties.name)) {
                        if (state === 'para') {
                            fillColor = '#ff0000';
                        } else if (state === 'tocantins') {
                            fillColor = '#ffff00';
                        } else {
                            fillColor = '#00ff00';
                        }
                    }
                    return {
                        color: 'black',
                        weight: 1,
                        dashArray: '5, 5',
                        fillOpacity: 0.6,
                        fillColor: fillColor
                    };
                },
                onEachFeature: (feature, layer) => {
                    layer.bindTooltip(\`Cidade: \${feature.properties.name}\`);
                }
            }).addTo(map);
        }

        const allLayers = [];
        map.eachLayer(layer => {
            if (layer instanceof L.GeoJSON) {
                allLayers.push(layer);
            }
        });
        if (allLayers.length > 0) {
            const group = L.featureGroup(allLayers);
            map.fitBounds(group.getBounds());
        }
    </script>
</body>
</html>
        `;

        const blob = new Blob([mapHtml], { type: 'text/html;charset=utf-8' });
        saveAs(blob, 'selected_cities_map.html');
    };

    stateSelect.addEventListener('change', (e) => {
        const state = e.target.value;
        if (state) {
            loadGeoJSON(state);
        }
    });

    selectAllBtn.addEventListener('click', selectAllCities);
    generateMapBtn.addEventListener('click', generateMap);
    downloadMapBtn.addEventListener('click', downloadMap);
    citySearch.addEventListener('input', debounce((e) => {
        const searchTerm = e.target.value.trim();
        filterCities(searchTerm);
    }, 300));
    clearSearchBtn.addEventListener('click', () => {
        citySearch.value = '';
        filterCities('');
    });

    initializeMap();
});