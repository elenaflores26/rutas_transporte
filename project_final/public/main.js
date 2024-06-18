document.addEventListener('DOMContentLoaded', () => {
    let map = L.map('mi_mapa').setView([19.9433, -99.5506], 14);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    let partidaInput = document.getElementById('partida');
    let destinoInput = document.getElementById('destino');
    let agregarUbicacionBtn = document.getElementById('agregarUbicacion');
    let calcularRutaBtn = document.getElementById('calcularRuta');
    let resolverBtn = document.getElementById('resolver');
    let infoRutaSection = document.getElementById('infoRuta');
    let loader = document.getElementById('loader');
    let volverBtn = document.getElementById('volver');

    let partida = null;
    let destino = null;
    let ubicacionesAdicionales = [];
    let rutaCalculada = null;
    let permitirUbicacionesAdicionales = false;

    function onMapClick(e) {
        if (!partida) {
            partida = e.latlng;
            partidaInput.value = `${partida.lat.toFixed(6)}, ${partida.lng.toFixed(6)}`;
            agregarMarcador(partida, 'Partida');
        } else if (!destino) {
            destino = e.latlng;
            destinoInput.value = `${destino.lat.toFixed(6)}, ${destino.lng.toFixed(6)}`;
            agregarMarcador(destino, 'Destino');
        } else if (permitirUbicacionesAdicionales) {
            let nuevaUbicacion = e.latlng;
            ubicacionesAdicionales.push(nuevaUbicacion);
            agregarMarcador(nuevaUbicacion, `Adicional ${ubicacionesAdicionales.length}`);
        }
    }

    map.on('click', onMapClick);

    function agregarMarcador(latlng, tipo) {
        L.marker(latlng).addTo(map).bindPopup(tipo).openPopup();
    }

    agregarUbicacionBtn.addEventListener('click', function() {
        if (partida && destino) {
            permitirUbicacionesAdicionales = true;
            mostrarMensaje('Haz clic en el mapa para agregar una nueva ubicación.');
        } else {
            mostrarMensaje('Selecciona primero la ubicación de partida y destino.', true);
        }
    });

    function mostrarMensaje(mensaje, esError = false) {
        let mensajeElement = document.createElement('div');
        mensajeElement.textContent = mensaje;
        mensajeElement.classList.add('mensaje');
        if (esError) {
            mensajeElement.classList.add('error');
        }
    
        document.getElementById('mi_mapa').insertAdjacentElement('beforebegin', mensajeElement);
        setTimeout(function() {
            mensajeElement.remove();
        }, 3000); 
    }

    calcularRutaBtn.addEventListener('click', function() {
        if (partida && destino) {
            calcularYMostrarRuta();
        } else {
            alert('Selecciona ambos puntos en el mapa.');
        }
    });

    function mostrarLoader(mostrar) {
        loader.style.display = mostrar ? 'block' : 'none';
    }

    function calcularYMostrarRuta() {
        mostrarLoader(true);

        let puntos = [
            { lat: partida.lat, lng: partida.lng },
            ...ubicacionesAdicionales.map(ubic => ({ lat: ubic.lat, lng: ubic.lng })),
            { lat: destino.lat, lng: destino.lng }
        ];

        let puntosQuery = puntos.map(p => `point=${p.lat},${p.lng}`).join('&');
        let vehicle = 'car';
        let locale = 'es';
        let apiKey = 'e0df8b1b-835c-4d82-ac82-32f42d832017';

        let url = `https://graphhopper.com/api/1/route?${puntosQuery}&vehicle=${vehicle}&locale=${locale}&key=${apiKey}`;

        console.log('URL de solicitud:', url);

        fetch(url)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`No se pudo obtener la ruta de GraphHopper. Código de respuesta: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                mostrarLoader(false);
                console.log('Respuesta de la API de GraphHopper:', data);

                if (data.paths && data.paths.length > 0) {
                    const rutaCodificada = data.paths[0].points;
                    const coordinates = decodePolyline(rutaCodificada);
                    mostrarRutaEnMapa(coordinates);
                    rutaCalculada = data;
                    resolverBtn.style.display = 'block';
                } else {
                    throw new Error('No se encontraron coordenadas válidas en la respuesta de GraphHopper.');
                }
            })
            .catch(error => {
                mostrarLoader(false);
                alert('Error al calcular la ruta: ' + error.message);
                console.error('Error:', error);
            });
    }

    function mostrarRutaEnMapa(coordinates) {
        map.eachLayer(layer => {
            if (layer instanceof L.Polyline) {
                map.removeLayer(layer);
            }
        });

        const ruta = coordinates.map(coord => [coord[0], coord[1]]);
        L.polyline(ruta, { color: 'blue' }).addTo(map);
    }

    resolverBtn.addEventListener('click', function() {
        if (rutaCalculada) {
            mostrarInformacionRuta(rutaCalculada);
            infoRutaSection.style.display = 'block';
            resolverBtn.style.display = 'none';
            volverBtn.style.display = 'block';
        } else {
            alert('Primero calcula la ruta antes de resolver.');
        }
    });

    volverBtn.addEventListener('click', function() {
        partida = null;
        destino = null;
        ubicacionesAdicionales = [];
        rutaCalculada = null;
        permitirUbicacionesAdicionales = false;
        partidaInput.value = '';
        destinoInput.value = '';
        infoRutaSection.style.display = 'none';
        resolverBtn.style.display = 'none';
        volverBtn.style.display = 'none';
        map.eachLayer(layer => {
            if (layer instanceof L.Marker || layer instanceof L.Polyline) {
                map.removeLayer(layer);
            }
        });
    });

    function mostrarInformacionRuta(data) {
        let distanciaMetros = data.paths[0].distance;
        let distanciaKilometros = (distanciaMetros / 1000).toFixed(2);
    
        let tiempoSegundos = data.paths[0].time;
        let tiempoMinutos = Math.round(tiempoSegundos / 1000 / 60);
        let horas = Math.floor(tiempoMinutos / 60);
        let minutos = tiempoMinutos % 60;
        let tiempoFormato = horas > 0 ? `${horas} horas y ${minutos} minutos` : `${minutos} minutos`;
    
        document.getElementById('ubicacionPartida').textContent = `Ubicación de partida: ${partidaInput.value}`;
        document.getElementById('ubicacionDestino').textContent = `Ubicación de destino: ${destinoInput.value}`;
        document.getElementById('distanciaMetros').textContent = `Distancia: ${distanciaMetros} metros`;
        document.getElementById('distanciaKilometros').textContent = `Distancia: ${distanciaKilometros} kilómetros`;
        document.getElementById('tiempoCamino').textContent = `Tiempo estimado: ${tiempoFormato}`;
    }    
});
