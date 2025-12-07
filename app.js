// app.js - The Complete Logic for BusLink.lk

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

    const resultsArea = document.getElementById("results-area");
    resultsArea.innerHTML = '<div class="text-center p-4"><i class="fas fa-spinner fa-spin"></i> Calculating Route...</div>';

    setTimeout(() => {
        const routes = findRoute(start, end, mode);
        renderResults(routes, mode);
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

    // Direct Check
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
                
                // Direction Check
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
        // Locals prefer Katubedda over Moratuwa Stand for speed
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


// --- 4. RENDER HTML ---

function renderResults(routes, mode) {
    const container = document.getElementById("results-area");
    container.innerHTML = "";

    if (routes.error) {
        container.innerHTML = `<div class="p-4 bg-red-100 text-red-700 rounded-lg text-center">${routes.error}</div>`;
        return;
    }

    const topRoutes = routes.slice(0, 3);

    topRoutes.forEach((route, index) => {
        let html = "";
        const isBest = index === 0;
        const badge = isBest ? '<span class="bg-green-100 text-green-800 text-xs font-bold px-2 py-1 rounded float-right">BEST OPTION</span>' : '';

        if (route.type === "direct") {
            html = `
                <div class="bg-white p-4 rounded-xl shadow-md border-l-4 border-blue-500 relative">
                    ${badge}
                    <h3 class="font-bold text-gray-800">🚌 Direct Bus: ${route.bus.routeNo}</h3>
                    <p class="text-sm text-gray-500">${route.bus.name}</p>
                    <div class="mt-2 text-xs text-gray-600 bg-gray-50 p-2 rounded">
                        <i class="fas fa-info-circle"></i> ${route.bus.description}
                    </div>
                </div>
            `;
        } else {
            const transferInfo = transferHubs[route.transferAt] || { details: "Switch buses here.", type: "medium" };
            
            const touristTips = mode === "tourist" ? 
                `<div class="mt-3 p-2 bg-yellow-50 text-xs text-yellow-800 rounded border border-yellow-200">
                    <strong>👀 Tourist Tip:</strong><br>
                    At ${route.transferAt}: ${transferInfo.details}
                 </div>
                 <button onclick="openConductorModal('${route.transferAt}')" class="mt-2 w-full bg-blue-100 text-blue-600 text-xs font-bold py-2 rounded-lg hover:bg-blue-200 transition">
                    🗣️ Show Conductor Card
                 </button>` 
                : '';

            html = `
                <div class="bg-white p-4 rounded-xl shadow-md border-l-4 ${isBest ? 'border-green-500' : 'border-gray-300'} mb-4">
                    ${badge}
                    <div class="flex items-center justify-between mb-2">
                        <div class="text-sm font-bold text-gray-700">Option ${index + 1}</div>
                        <div class="text-xs text-gray-400">~1 hr</div>
                    </div>
                    
                    <div class="flex items-center mb-2">
                        <div class="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs mr-3">1</div>
                        <div>
                            <p class="font-bold text-sm">Bus ${route.leg1.routeNo}</p>
                            <p class="text-xs text-gray-500">Get off at ${route.transferAt}</p>
                        </div>
                    </div>

                    <div class="ml-4 border-l-2 border-dashed border-gray-300 pl-6 py-1 my-1">
                        <p class="text-xs text-gray-400 italic">Transfer: ${route.transferAt}</p>
                    </div>

                    <div class="flex items-center">
                        <div class="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-bold text-xs mr-3">2</div>
                        <div>
                            <p class="font-bold text-sm">Bus ${route.leg2.routeNo}</p>
                            <p class="text-xs text-gray-500">To Destination</p>
                        </div>
                    </div>

                    ${touristTips}
                </div>
            `;
        }
        container.innerHTML += html;
    });
}


// --- 5. MODAL CONTROLLER (Sinhala Translations) ---

function openConductorModal(locationName) {
    const modal = document.getElementById("conductor-modal");
    const sinhalaText = document.getElementById("modal-sinhala-text");
    const englishText = document.getElementById("modal-english-text");

    // Sinhala Dictionary
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