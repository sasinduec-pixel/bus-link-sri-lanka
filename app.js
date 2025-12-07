// app.js - The Complete Logic for BusLink.lk

// Store current routes globally
let currentRoutes = [];

// --- 1. INITIALIZATION ---

window.onload = function() {
    populateDropdowns();
};

function populateDropdowns() {
    const allStops = new Set();
    busNetwork.forEach(bus => {
        bus.stops.forEach(stop => allStops.add(stop));
    });

    const sortedStops = Array.from(allStops).sort();
    
    const startSelect = document.getElementById("start-location");
    const endSelect = document.getElementById("end-location");

    startSelect.innerHTML = "";
    endSelect.innerHTML = "";

    sortedStops.forEach(stop => {
        const option1 = new Option(stop, stop);
        const option2 = new Option(stop, stop);
        startSelect.add(option1);
        endSelect.add(option2);
    });

    // Defaults
    startSelect.value = "Panadura Stand";
    endSelect.value = "Piliyandala Clock Tower";
}


// --- 2. INTERACTION ---

function handleSearch() {
    const start = document.getElementById("start-location").value;
    const end = document.getElementById("end-location").value;
    const isLocalMode = document.getElementById("mode-toggle").checked; 
    const mode = isLocalMode ? "local" : "tourist";

    const listContainer = document.getElementById("results-list");
    
    listContainer.innerHTML = '<div class="text-center p-4 text-gray-500"><i class="fas fa-spinner fa-spin mr-2"></i> Finding best route...</div>';

    setTimeout(() => {
        const routes = findRoute(start, end, mode);
        renderResultsList(routes, mode);
    }, 400); 
}

// Toggle UI update
document.getElementById("mode-toggle").addEventListener('change', function() {
    const label = document.getElementById("mode-text");
    if(this.checked) {
        label.innerText = "LOCAL MODE 🌶️";
        label.classList.remove("text-gray-500");
        label.classList.add("text-red-600");
    } else {
        label.innerText = "TOURIST MODE 🥥";
        label.classList.remove("text-red-600");
        label.classList.add("text-gray-500");
    }
});


// --- 3. THE LOGIC ---

function findRoute(startLocation, endLocation, mode) {
    if (startLocation === endLocation) return { error: "You are already there! 😊" };

    const directBuses = busNetwork.filter(bus => 
        bus.stops.includes(startLocation) && bus.stops.includes(endLocation)
    );
    if (directBuses.length > 0) return formatDirectResult(directBuses, mode);

    const startBuses = busNetwork.filter(bus => bus.stops.includes(startLocation));
    const endBuses = busNetwork.filter(bus => bus.stops.includes(endLocation));
    let validRoutes = [];

    startBuses.forEach(busA => {
        endBuses.forEach(busB => {
            const intersection = busA.stops.filter(stop => busB.stops.includes(stop));
            if (intersection.length > 0) {
                const transferPoint = intersection[0];
                const startIdx = busA.stops.indexOf(startLocation);
                const transIdxA = busA.stops.indexOf(transferPoint);
                const transIdxB = busB.stops.indexOf(transferPoint);
                const endIdx = busB.stops.indexOf(endLocation);

                if (transIdxA > startIdx && endIdx > transIdxB) {
                    validRoutes.push({
                        type: "transfer",
                        leg1: busA,
                        transferAt: transferPoint,
                        leg2: busB,
                        score: calculateScore(busA, busB, transferPoint, mode)
                    });
                }
            }
        });
    });

    if (validRoutes.length === 0) return { error: "No simple route found. Try a taxi!" };
    validRoutes.sort((a, b) => b.score - a.score);
    return validRoutes;
}

function calculateScore(busA, busB, transferPoint, mode) {
    let score = 50; 
    if (mode === "local") {
        if (busA.tags.includes("fast")) score += 20;
        if (busB.tags.includes("fast")) score += 20;
        if (busA.frequency.includes("5 mins")) score += 10;
        if (transferPoint === "Katubedda Junction") score += 15;
    }
    if (mode === "tourist") {
        if (busA.tags.includes("comfort")) score += 30;
        if (busA.tags.includes("tourist_friendly")) score += 10;
        const hub = transferHubs[transferPoint];
        if (hub) {
            if (hub.type === "easy") score += 20;
            if (hub.type === "hard") score -= 40; 
        }
    }
    return score;
}

function formatDirectResult(buses, mode) {
    let bestBus = buses[0];
    if (mode === "tourist") {
        const comfy = buses.find(b => b.tags.includes("comfort"));
        if (comfy) bestBus = comfy;
    }
    return [{ type: "direct", bus: bestBus }];
}


// --- 4. RENDER LIST VIEW (The Tiles) ---

function renderResultsList(routes, mode) {
    const listContainer = document.getElementById("results-list");
    const placeholder = document.getElementById("placeholder-text");
    if(placeholder) placeholder.classList.add("hidden");

    if (routes.error) {
        listContainer.innerHTML = `<div class="p-4 bg-red-100 text-red-700 rounded-lg text-center mt-4">${routes.error}</div>`;
        return;
    }

    currentRoutes = routes;

    let html = "";
    const topRoutes = routes.slice(0, 3);

    topRoutes.forEach((route, index) => {
        const isBest = index === 0;
        const badge = isBest ? '<span class="bg-green-100 text-green-800 text-xs font-bold px-2 py-1 rounded absolute top-4 right-4">BEST OPTION</span>' : '';
        const borderClass = isBest ? 'border-green-500' : 'border-gray-300';

        let title, subtitle, icon;
        if (route.type === "direct") {
            title = `Bus ${route.bus.routeNo}`;
            subtitle = "Direct • No Transfer";
            icon = "fa-check-circle text-green-500";
        } else {
            title = `Bus ${route.leg1.routeNo} ➔ ${route.leg2.routeNo}`;
            subtitle = `Switch at ${route.transferAt}`;
            icon = "fa-exchange-alt text-blue-500";
        }

        html += `
            <div onclick="openDetailView(${index})" class="bg-white p-4 rounded-xl shadow-md border-l-4 ${borderClass} relative cursor-pointer hover:bg-blue-50 transition active:scale-95">
                ${badge}
                <div class="flex items-center">
                    <div class="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mr-4">
                        <i class="fas ${icon} text-xl"></i>
                    </div>
                    <div>
                        <h3 class="font-bold text-gray-800 text-lg">${title}</h3>
                        <p class="text-sm text-gray-500">${subtitle}</p>
                        <p class="text-xs text-gray-400 mt-1">Tap for details <i class="fas fa-chevron-right ml-1"></i></p>
                    </div>
                </div>
            </div>
        `;
    });

    listContainer.innerHTML = html;
}


// --- 5. RENDER DETAIL VIEW (The Logic Update!) ---

function openDetailView(index) {
    const route = currentRoutes[index];
    const detailView = document.getElementById("detail-view");
    const stepContainer = document.getElementById("detail-steps");
    const isLocalMode = document.getElementById("mode-toggle").checked;
    const mode = isLocalMode ? "local" : "tourist";

    // Show Detail View
    detailView.classList.remove("hidden");
    
    // Draw Map with delay
    setTimeout(() => {
        drawMap(route);
    }, 100);

    let html = "";
    
    if (route.type === "direct") {
        // DIRECT BUS
        html += `
            <div class="bg-blue-50 p-4 rounded-xl border border-blue-200">
                <h3 class="font-bold text-blue-800"><i class="fas fa-bus"></i> Take Bus ${route.bus.routeNo}</h3>
                <p class="text-sm text-blue-600">${route.bus.name}</p>
                <p class="text-xs text-gray-500 mt-2">${route.bus.description}</p>
            </div>
        `;
    } else {
        // TRANSFER ROUTE
        const transferInfo = transferHubs[route.transferAt] || { details: "Switch buses here.", type: "medium" };
        
        // --- DIFFERENTIATE CONTENT BASED ON MODE ---

        // 1. TOURIST EXTRAS
        let touristExtras = "";
        if (mode === "tourist") {
            touristExtras = `
                <div class="bg-yellow-50 p-3 rounded-lg border border-yellow-200 mt-2 text-sm text-gray-700">
                    <i class="fas fa-info-circle mr-1 text-yellow-600"></i> ${transferInfo.details}
                </div>
                <div onclick="openConductorModal('${route.transferAt}')" class="mt-3 bg-white border-2 border-blue-100 p-3 rounded-xl flex items-center shadow-sm cursor-pointer hover:bg-blue-50 active:scale-95 transition">
                    <div class="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 mr-3">
                        <i class="fas fa-user-tie"></i>
                    </div>
                    <div>
                        <p class="font-bold text-blue-900 text-sm">Show Conductor Card</p>
                        <p class="text-xs text-blue-500">Tap to show Sinhala text</p>
                    </div>
                </div>
            `;
        } else {
            // Local Mode: Just show simple text if needed, or nothing
            touristExtras = `<p class="text-xs text-gray-400 mt-1 italic">Quick transfer.</p>`;
        }

        // STEP 1
        html += `
            <div class="relative pl-8 border-l-2 border-gray-300 pb-6">
                <div class="absolute -left-2.5 top-0 w-5 h-5 bg-blue-500 rounded-full border-4 border-white"></div>
                <h4 class="font-bold text-gray-800">Step 1: Bus ${route.leg1.routeNo}</h4>
                <p class="text-sm text-gray-600">Take ${route.leg1.name}</p>
            </div>
        `;

        // TRANSFER STEP
        html += `
            <div class="relative pl-8 border-l-2 border-gray-300 pb-6">
                <div class="absolute -left-2.5 top-0 w-5 h-5 bg-yellow-400 rounded-full border-4 border-white"></div>
                <h4 class="font-bold text-gray-800">Get off at ${route.transferAt}</h4>
                ${touristExtras} 
            </div>
        `;

        // STEP 2
        html += `
            <div class="relative pl-8 border-l-2 border-transparent">
                <div class="absolute -left-2.5 top-0 w-5 h-5 bg-green-500 rounded-full border-4 border-white"></div>
                <h4 class="font-bold text-gray-800">Step 2: Bus ${route.leg2.routeNo}</h4>
                <p class="text-sm text-gray-600">Take ${route.leg2.name}</p>
                <p class="text-xs text-gray-500 mt-1">To Destination</p>
            </div>
        `;
    }

    stepContainer.innerHTML = html;
}

function goBack() {
    document.getElementById("detail-view").classList.add("hidden");
}


// --- 6. MODAL & MAP ---

function openConductorModal(locationName) {
    const modal = document.getElementById("conductor-modal");
    const sinhalaText = document.getElementById("modal-sinhala-text");
    const englishText = document.getElementById("modal-english-text");

    const sinhalaNames = {
        "Moratuwa Stand": "මොරටුව ස්ටෑන්ඩ් එකෙන්",
        "Moratuwa Cross": "මොරටුව කුරුස හන්දියෙන්",
        "Katubedda Junction": "කටුබැද්ද හන්දියෙන්",
        "Piliyandala Clock Tower": "පිළියන්දල ඔරලෝසු කණුවෙන්",
        "Panadura Stand": "පානදුර ස්ටෑන්ඩ් එකෙන්",
        "Kottawa": "කොට්ටාවෙන්",
        "Mt Lavinia": "ගල්කිස්සෙන්",
        "Ratmalana": "රත්මලානෙන්",
        "Walana": "වලානෙන්",
        "Old Bridge": "පරණ පාලමෙන්",
        "University": "කැම්පස් එකෙන්"
    };

    const translation = sinhalaNames[locationName] || locationName;
    sinhalaText.innerText = `මට ${translation} බහින්න ඕන.`;
    englishText.innerText = locationName;
    modal.classList.remove("hidden");
}

function closeModal() {
    document.getElementById("conductor-modal").classList.add("hidden");
}

let mapInstance = null; 
let userMarker = null;

function drawMap(route) {
    if (typeof L === 'undefined') return;

    if (!mapInstance) {
        mapInstance = L.map('map').setView([6.7744, 79.8827], 13); 
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap'
        }).addTo(mapInstance);
    }
    
    setTimeout(() => { mapInstance.invalidateSize(); }, 200);

    mapInstance.eachLayer((layer) => {
        if (layer instanceof L.Polyline || (layer instanceof L.Marker && layer !== userMarker)) {
            mapInstance.removeLayer(layer);
        }
    });

    let latlngs = [];
    const addPath = (bus, color) => {
        const pathCoords = bus.stops
            .map(stop => stopCoordinates[stop]) 
            .filter(coord => coord !== undefined); 
        if (pathCoords.length > 0) {
            L.polyline(pathCoords, {color: color, weight: 5}).addTo(mapInstance);
            L.marker(pathCoords[0]).addTo(mapInstance).bindPopup(`<b>Start</b><br>${bus.routeNo}`);
            L.marker(pathCoords[pathCoords.length - 1]).addTo(mapInstance).bindPopup(`<b>End</b><br>${bus.routeNo}`);
            latlngs = latlngs.concat(pathCoords);
        }
    };

    if (route.type === "direct") {
        addPath(route.bus, 'blue');
    } else {
        addPath(route.leg1, 'blue');
        addPath(route.leg2, 'red');
        const transferCoord = stopCoordinates[route.transferAt];
        if (transferCoord) {
            L.marker(transferCoord).addTo(mapInstance).bindPopup(`<b>Switch Here!</b><br>${route.transferAt}`);
        }
    }

    if (latlngs.length > 0) {
        mapInstance.fitBounds(L.polyline(latlngs).getBounds(), {padding: [50, 50]});
    }
}

function enableGPS() {
    if (!navigator.geolocation) { alert("GPS not supported"); return; }
    const button = document.querySelector("#map-container button i");
    button.classList.remove("fa-crosshairs");
    button.classList.add("fa-spinner", "fa-spin");

    navigator.geolocation.getCurrentPosition((position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        button.classList.remove("fa-spinner", "fa-spin");
        button.classList.add("fa-crosshairs");

        if (userMarker) {
            userMarker.setLatLng([lat, lng]);
        } else {
            const blueDotIcon = L.divIcon({
                className: 'css-icon',
                html: '<div class="gps-pulse"></div><div style="background:#3B82F6; width:12px; height:12px; border-radius:50%; border:2px solid white; box-shadow:0 0 5px rgba(0,0,0,0.3);"></div>',
                iconSize: [20, 20],
                iconAnchor: [10, 10]
            });
            userMarker = L.marker([lat, lng], {icon: blueDotIcon}).addTo(mapInstance);
        }
        mapInstance.setView([lat, lng], 15);
    }, () => {
        button.classList.remove("fa-spinner", "fa-spin");
        button.classList.add("fa-crosshairs");
        alert("GPS Error");
    });
}