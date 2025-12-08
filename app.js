// app.js - The Complete Logic for BusLink.lk (Dynamic Version)

// --- CONFIGURATION ---
// 🔴 TODO: PASTE YOUR SUPABASE KEYS HERE
const SUPABASE_URL = 'https://cmdboiegbphfemgehjuj.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNtZGJvaWVnYnBoZmVtZ2VoanVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxMTQ5ODQsImV4cCI6MjA4MDY5MDk4NH0.lLn70wlEjRFK0I4iaLKNY6p3pgfVl7U30Eeytsv6N6k';

// Initialize Supabase Client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Global Variables
let busNetwork = []; // This will be filled from the DB
let currentRoutes = [];
let allStopsSet = new Set(); 

// --- 1. INITIALIZATION ---

window.onload = async function() {
    await fetchRoutesFromDB();
};

async function fetchRoutesFromDB() {
    console.log("🚀 Fetching routes from Supabase...");
    
    const { data, error } = await supabase
        .from('routes')
        .select('*');

    if (error) {
        console.error("Error fetching routes:", error);
        alert("Failed to load routes. Please check your connection.");
        return;
    }

    // Success! Update the global network
    busNetwork = data;
    console.log(`✅ Loaded ${busNetwork.length} routes from Cloud.`);
    
    // Enable UI
    populateStopsList();
    enableSearchUI();
}

function enableSearchUI() {
    document.getElementById("start-location").placeholder = "Type to search (e.g. Panadura)";
    document.getElementById("start-location").disabled = false;
    
    document.getElementById("end-location").placeholder = "Type to search (e.g. Kandy)";
    document.getElementById("end-location").disabled = false;

    const btn = document.getElementById("search-btn");
    btn.disabled = false;
    btn.innerHTML = "Find My Bus";
    btn.classList.remove("bg-gray-400");
    btn.classList.add("bg-blue-600", "hover:bg-blue-700");
}

function populateStopsList() {
    allStopsSet.clear();
    
    busNetwork.forEach(bus => {
        if(bus.stops && Array.isArray(bus.stops)) {
            bus.stops.forEach(stop => allStopsSet.add(stop));
        }
    });

    const sortedStops = Array.from(allStopsSet).sort();
    const dataList = document.getElementById("stops-list");
    dataList.innerHTML = "";

    sortedStops.forEach(stop => {
        const option = document.createElement("option");
        option.value = stop;
        dataList.appendChild(option);
    });
}


// --- 2. INTERACTION ---

function handleSearch() {
    const start = document.getElementById("start-location").value.trim();
    const end = document.getElementById("end-location").value.trim();

    if (!start || !end) {
        alert("Please enter both a Start Point and a Destination.");
        return;
    }

    if (!allStopsSet.has(start) || !allStopsSet.has(end)) {
        alert("Stop not found in database. Please select from the list.");
        return;
    }

    const isLocalMode = document.getElementById("mode-toggle").checked; 
    const mode = isLocalMode ? "local" : "tourist";

    const listContainer = document.getElementById("results-list");
    listContainer.innerHTML = '<div class="text-center p-4 text-gray-500"><i class="fas fa-spinner fa-spin mr-2"></i> Finding best route...</div>';

    setTimeout(() => {
        const routes = findRoute(start, end, mode);
        renderResultsList(routes, mode);
    }, 400); 
}

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


// --- 3. THE LOGIC (Same as before, but using DB data) ---

function findRoute(startLocation, endLocation, mode) {
    if (startLocation === endLocation) return { error: "You are already there! 😊" };

    // Direct Bus Check
    const directBuses = busNetwork.filter(bus => 
        bus.stops.includes(startLocation) && bus.stops.includes(endLocation)
    );
    if (directBuses.length > 0) return formatDirectResult(directBuses, mode);

    // Transfer Check
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
    // Handle null tags gracefully
    const tagsA = busA.tags || [];
    const tagsB = busB.tags || [];

    if (mode === "local") {
        if (tagsA.includes("fast")) score += 20;
        if (tagsB.includes("fast")) score += 20;
        if (transferPoint === "Katubedda Junction") score += 15;
    }
    if (mode === "tourist") {
        if (tagsA.includes("comfort")) score += 30;
        const hub = transferHubs[transferPoint];
        if (hub && hub.type === "easy") score += 20;
    }
    return score;
}

function formatDirectResult(buses, mode) {
    let bestBus = buses[0];
    if (mode === "tourist") {
        const comfy = buses.find(b => (b.tags || []).includes("comfort"));
        if (comfy) bestBus = comfy;
    }
    return [{ type: "direct", bus: bestBus }];
}


// --- 4. RENDER LIST VIEW ---

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
            title = `Bus ${route.bus.route_no || route.bus.routeNo}`; // Handle DB snake_case vs JS camelCase
            subtitle = "Direct • No Transfer";
            icon = "fa-check-circle text-green-500";
        } else {
            title = `Bus ${route.leg1.route_no || route.leg1.routeNo} ➔ ${route.leg2.route_no || route.leg2.routeNo}`;
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
                    </div>
                </div>
            </div>
        `;
    });
    listContainer.innerHTML = html;
}


// --- 5. RENDER DETAIL VIEW ---

function openDetailView(index) {
    const route = currentRoutes[index];
    const detailView = document.getElementById("detail-view");
    const stepContainer = document.getElementById("detail-steps");
    const isLocalMode = document.getElementById("mode-toggle").checked;
    const mode = isLocalMode ? "local" : "tourist";

    detailView.classList.remove("hidden");
    setTimeout(() => { drawMap(route); }, 100);

    let html = "";
    // Normalize properties (DB might return route_no, local JS used routeNo)
    const getRouteNo = (b) => b.route_no || b.routeNo;

    if (route.type === "direct") {
        html += `
            <div class="bg-blue-50 p-4 rounded-xl border border-blue-200">
                <h3 class="font-bold text-blue-800"><i class="fas fa-bus"></i> Take Bus ${getRouteNo(route.bus)}</h3>
                <p class="text-sm text-blue-600">${route.bus.name}</p>
                <p class="text-xs text-gray-500 mt-2">${route.bus.description}</p>
            </div>`;
    } else {
        const transferInfo = transferHubs[route.transferAt] || { details: "Switch buses here.", type: "medium" };
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
                </div>`;
        }

        html += `
            <div class="relative pl-8 border-l-2 border-gray-300 pb-6">
                <div class="absolute -left-2.5 top-0 w-5 h-5 bg-blue-500 rounded-full border-4 border-white"></div>
                <h4 class="font-bold text-gray-800">Bus ${getRouteNo(route.leg1)}</h4>
                <p class="text-sm text-gray-600">${route.leg1.name}</p>
            </div>
            <div class="relative pl-8 border-l-2 border-gray-300 pb-6">
                <div class="absolute -left-2.5 top-0 w-5 h-5 bg-yellow-400 rounded-full border-4 border-white"></div>
                <h4 class="font-bold text-gray-800">Switch at ${route.transferAt}</h4>
                ${touristExtras}
            </div>
            <div class="relative pl-8 border-l-2 border-transparent">
                <div class="absolute -left-2.5 top-0 w-5 h-5 bg-green-500 rounded-full border-4 border-white"></div>
                <h4 class="font-bold text-gray-800">Bus ${getRouteNo(route.leg2)}</h4>
                <p class="text-sm text-gray-600">${route.leg2.name}</p>
                <p class="text-xs text-gray-500 mt-1">To Destination</p>
            </div>`;
    }
    stepContainer.innerHTML = html;
}

function goBack() { document.getElementById("detail-view").classList.add("hidden"); }
function closeModal() { document.getElementById("conductor-modal").classList.add("hidden"); }

// --- 6. MAP & EXTRAS ---
// (We keep this hardcoded for now because coordinates are static)

const transferHubs = {
    "Pettah": { details: "Main Hub. Check Private (Bastian Mawatha) or CTB stands.", type: "hard" },
    "Nugegoda": { details: "Hub for High Level & 120 route.", type: "easy" },
    "Borella": { details: "Major crossroad for 177, 154, 190.", type: "hard" },
    "Kurunegala": { details: "Main hub for all Northern/Eastern buses.", type: "easy" },
    "Makumbura (Kottawa)": { details: "Multimodal Center (MMC) for Highway Buses.", type: "easy" },
    "Moratuwa Stand": { details: "Walk inside the stand.", type: "easy" },
    "Katubedda Junction": { details: "Cross Galle road to K-Zone side.", type: "hard" },
};

// --- MERGE COORDINATES (Same as before) ---
// We need manualStops defined here because buses.js is gone
const manualStops = {
    "Pettah": [6.9338, 79.8540],
    "Galle Face": [6.9271, 79.8453],
    "Kollupitiya": [6.9147, 79.8512],
    "Liberty Plaza": [6.9125, 79.8525],
    "Bambalapitiya": [6.8906, 79.8554],
    "Wellawatte": [6.8732, 79.8606],
    "Dehiwala": [6.8511, 79.8659],
    "Mt Lavinia": [6.8306, 79.8653],
    "Ratmalana": [6.8159, 79.8722],
    "Katubedda Junction": [6.7915, 79.8872],
    "Moratuwa Stand": [6.7744, 79.8827],
    "Moratuwa Cross": [6.7761, 79.8860],
    "Panadura Stand": [6.7146, 79.9096],
    "Town Hall": [6.9211, 79.8654],
    "Eye Hospital": [6.9242, 79.8698],
    "Borella": [6.9331, 79.8824],
    "Ayurveda Junction": [6.9143, 79.8942],
    "Rajagiriya": [6.9093, 79.8986],
    "Welikada": [6.9056, 79.9042],
    "Battaramulla": [6.8887, 79.9174],
    "Koswatta": [6.9045, 79.9281],
    "Malabe": [6.9061, 79.9647],
    "Kaduwela": [6.9329, 79.9839],
    "Nugegoda": [6.8649, 79.8997],
    "Maharagama": [6.8480, 79.9265],
    "Kottawa": [6.8412, 79.9654],
    "Makumbura (Kottawa)": [6.8293, 79.9984],
    "Homagama": [6.8446, 80.0007],
    "Avissawella": [6.9543, 80.2046],
    "Piliyandala Clock Tower": [6.8016, 79.9227],
    "Kesbewa": [6.7845, 79.9405],
    "Horana": [6.7161, 80.0631],
    "Kandy Clock Tower": [7.2906, 80.6337],
    "Peradeniya": [7.2693, 80.5960],
    "Galle Fort": [6.0268, 80.2170],
    "Matara Stand": [5.9463, 80.5471],
    "Jaffna Stand": [9.6615, 80.0255],
    "Kurunegala": [7.4863, 80.3623],
    "Anuradhapura New Town": [8.3114, 80.4037]
};

const stopCoordinates = {
    ...(typeof autoGeneratedStops !== 'undefined' ? autoGeneratedStops : {}),
    ...manualStops
};


// --- MAP LOGIC ---

let mapInstance = null; 
let userMarker = null;

function drawMap(route) {
    if (typeof L === 'undefined') return;
    if (!mapInstance) {
        mapInstance = L.map('map').setView([6.9, 79.9], 10); 
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(mapInstance);
    }
    setTimeout(() => { mapInstance.invalidateSize(); }, 200);

    mapInstance.eachLayer((layer) => {
        if (layer instanceof L.Polyline || (layer instanceof L.Marker && layer !== userMarker)) {
            mapInstance.removeLayer(layer);
        }
    });

    let latlngs = [];
    const addPath = (bus, color) => {
        // Handle database array vs local array structure
        const stops = bus.stops || [];
        const pathCoords = stops
            .map(stop => stopCoordinates[stop]) 
            .filter(coord => coord !== undefined); 
        if (pathCoords.length > 0) {
            L.polyline(pathCoords, {color: color, weight: 5}).addTo(mapInstance);
            L.marker(pathCoords[0]).addTo(mapInstance).bindPopup(`<b>${bus.route_no || bus.routeNo} Start</b>`);
            latlngs = latlngs.concat(pathCoords);
        }
    };

    if (route.type === "direct") {
        addPath(route.bus, 'blue');
    } else {
        addPath(route.leg1, 'blue');
        addPath(route.leg2, 'red');
        if (stopCoordinates[route.transferAt]) {
            L.marker(stopCoordinates[route.transferAt]).addTo(mapInstance).bindPopup(`<b>Switch: ${route.transferAt}</b>`);
        }
    }

    if (latlngs.length > 0) {
        mapInstance.fitBounds(L.polyline(latlngs).getBounds(), {padding: [50, 50]});
    }
}

function enableGPS() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        if (!userMarker) {
            userMarker = L.marker([lat, lng]).addTo(mapInstance);
        } else {
            userMarker.setLatLng([lat, lng]);
        }
        mapInstance.setView([lat, lng], 13);
    });
}

function openConductorModal(locationName) {
    const modal = document.getElementById("conductor-modal");
    document.getElementById("modal-english-text").innerText = locationName;
    document.getElementById("modal-sinhala-text").innerText = `මට ${locationName} බහින්න ඕන.`; 
    modal.classList.remove("hidden");
}