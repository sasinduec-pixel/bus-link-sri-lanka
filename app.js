// app.js - Final Version: Smart Destination Matching & Detailed Timelines

// 🔴 TODO: PASTE YOUR SUPABASE KEYS HERE
const SUPABASE_URL = 'https://cmdboiegbphfemgehjuj.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNtZGJvaWVnYnBoZmVtZ2VoanVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxMTQ5ODQsImV4cCI6MjA4MDY5MDk4NH0.lLn70wlEjRFK0I4iaLKNY6p3pgfVl7U30Eeytsv6N6k';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let busNetwork = []; 
let currentRoutes = [];
let allStopsSet = new Set(); 

// --- 1. INITIALIZATION ---

window.onload = async function() {
    await fetchRoutesFromDB();
};

async function fetchRoutesFromDB() {
    console.log("🚀 Fetching routes...");
    const { data, error } = await supabase.from('routes').select('*');

    if (error) {
        console.error(error);
        alert("Failed to load routes. Please check internet connection.");
        return;
    }

    // Safety: Filter out empty skeleton routes to prevent crashes
    busNetwork = data.filter(route => Array.isArray(route.stops) && route.stops.length > 0);
    
    console.log(`✅ Loaded ${busNetwork.length} valid routes.`);
    populateStopsList();
    enableSearchUI();
}

function enableSearchUI() {
    const startInput = document.getElementById("start-location");
    const endInput = document.getElementById("end-location");
    const btn = document.getElementById("search-btn");

    if(startInput) {
        startInput.placeholder = "Type to search (e.g. Panadura)";
        startInput.disabled = false;
    }
    
    if(endInput) {
        endInput.placeholder = "Type to search (e.g. Kandy)";
        endInput.disabled = false;
    }

    if(btn) {
        btn.disabled = false;
        btn.innerHTML = "Find My Bus";
        btn.classList.remove("bg-gray-400");
        btn.classList.add("bg-blue-600", "hover:bg-blue-700");
    }
}

function populateStopsList() {
    allStopsSet.clear();
    busNetwork.forEach(bus => {
        bus.stops.forEach(stop => allStopsSet.add(stop));
    });
    const sortedStops = Array.from(allStopsSet).sort();
    
    const dataList = document.getElementById("stops-list");
    if(dataList) {
        dataList.innerHTML = "";
        sortedStops.forEach(stop => {
            const option = document.createElement("option");
            option.value = stop;
            dataList.appendChild(option);
        });
    }
}

// --- 2. INTERACTION ---

function handleSearch() {
    const start = document.getElementById("start-location").value.trim();
    const end = document.getElementById("end-location").value.trim();

    if (!start || !end) { alert("Please enter both points."); return; }
    if (!allStopsSet.has(start)) { alert(`"${start}" is not a valid stop. Please check spelling.`); return; }
    if (!allStopsSet.has(end)) { alert(`"${end}" is not a valid stop. Please check spelling.`); return; }

    const listContainer = document.getElementById("results-list");
    listContainer.innerHTML = '<div class="text-center p-4 text-gray-500"><i class="fas fa-spinner fa-spin mr-2"></i> Finding best route...</div>';

    setTimeout(() => {
        try {
            const routes = findRoute(start, end);
            renderResultsList(routes);
        } catch (error) {
            console.error(error);
            listContainer.innerHTML = `<div class="p-4 bg-red-100 text-red-700 rounded-lg text-center">App Error: ${error.message}</div>`;
        }
    }, 100); 
}

// --- 3. THE SMART LOGIC ---

function findRoute(startLocation, endLocation) {
    if (startLocation === endLocation) return { error: "You are already there! 😊" };

    let validRoutes = [];

    // 1. DIRECT BUS CHECK
    const directBuses = busNetwork.filter(bus => 
        bus.stops.includes(startLocation) && bus.stops.includes(endLocation)
    );

    if (directBuses.length > 0) {
        directBuses.forEach(bus => {
            const startIdx = bus.stops.indexOf(startLocation);
            const endIdx = bus.stops.indexOf(endLocation);
            
            let direction = "Forward";
            if (startIdx > endIdx) direction = "Return Trip"; 

            // SCORING LOGIC
            let score = 100; // Base score for direct bus
            
            // Bonus: If the bus is going EXACTLY to the user's destination
            // (e.g. User wants "Ambalangoda", Bus is "Colombo-Ambalangoda")
            if (bus.destination === endLocation) {
                score += 50; 
            }

            validRoutes.push({
                type: "direct",
                bus: bus,
                direction: direction,
                userStart: startLocation,
                userEnd: endLocation,
                score: score
            });
        });
        
        // Sort by Score (Higher is better)
        validRoutes.sort((a, b) => b.score - a.score);
        return validRoutes;
    }

    // 2. TRANSFER CHECK (Only if no direct bus)
    const startBuses = busNetwork.filter(bus => bus.stops.includes(startLocation));
    const endBuses = busNetwork.filter(bus => bus.stops.includes(endLocation));

    startBuses.forEach(busA => {
        endBuses.forEach(busB => {
            // Find shared stops
            const intersection = busA.stops.filter(stop => busB.stops.includes(stop));
            
            if (intersection.length > 0) {
                const transferPoint = intersection[0]; 
                
                validRoutes.push({
                    type: "transfer",
                    leg1: busA,
                    transferAt: transferPoint,
                    leg2: busB,
                    userStart: startLocation,
                    userEnd: endLocation,
                    score: 50
                });
            }
        });
    });

    if (validRoutes.length === 0) return { error: "No route found. Try searching for a major town nearby." };
    
    // Deduplicate logic
    const uniqueMap = new Map();
    const uniqueList = [];
    validRoutes.forEach(r => {
        const key = r.type === 'direct' ? r.bus.route_no : `${r.leg1.route_no}-${r.leg2.route_no}`;
        if(!uniqueMap.has(key)) {
            uniqueMap.set(key, true);
            uniqueList.push(r);
        }
    });

    return uniqueList;
}

// --- 4. RENDER UI ---

function renderResultsList(routes) {
    const listContainer = document.getElementById("results-list");
    
    if (routes.error) {
        listContainer.innerHTML = `<div class="p-4 bg-yellow-100 text-yellow-800 rounded-lg text-center">${routes.error}</div>`;
        return;
    }

    currentRoutes = routes;
    let html = "";
    
    routes.slice(0, 15).forEach((route, index) => {
        const isBest = index === 0;
        const borderClass = isBest ? 'border-green-500' : 'border-gray-300';
        const bestBadge = isBest ? '<span class="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded absolute top-3 right-3">BEST MATCH</span>' : '';
        
        let title, subtitle, icon;
        
        if (route.type === "direct") {
            title = `Bus ${route.bus.route_no}`;
            
            // Name Display Logic
            let boardName = route.bus.name;
            // If we have specific Origin/Dest data, show "Towards [Dest]"
            if(route.bus.destination) {
                if(route.direction === "Forward") {
                    boardName = `Towards <b class="text-gray-800">${route.bus.destination}</b>`;
                } else {
                    // Return trip usually goes to Origin
                    boardName = `Towards <b class="text-gray-800">${route.bus.origin || "Colombo"}</b>`;
                }
            }

            let badge = "";
            if (route.direction === "Return Trip") {
                badge = `<span class="bg-red-100 text-red-600 text-[10px] font-bold px-1.5 py-0.5 rounded ml-2">RETURN TRIP</span>`;
            }

            subtitle = `
                <div class="text-gray-600 text-sm mt-1">${boardName} ${badge}</div>
                <div class="text-blue-600 text-xs mt-2 font-medium"><i class="fas fa-map-marker-alt mr-1"></i> Get off at ${route.userEnd}</div>
            `;
            icon = "fa-bus text-blue-600";
        } else {
            title = `Bus ${route.leg1.route_no} ➔ ${route.leg2.route_no}`;
            subtitle = `<div class="text-gray-500 text-sm mt-1">Switch at <b>${route.transferAt}</b></div>`;
            icon = "fa-exchange-alt text-gray-400";
        }

        html += `
            <div onclick="openDetailView(${index})" class="relative bg-white p-4 rounded-xl shadow-md border-l-4 ${borderClass} cursor-pointer hover:bg-blue-50 transition active:scale-95 mb-3">
                ${bestBadge}
                <div class="flex items-center justify-between">
                    <div class="flex items-center w-full">
                        <div class="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mr-3 shrink-0">
                            <i class="fas ${icon} text-lg"></i>
                        </div>
                        <div class="w-full pr-2">
                            <h3 class="font-bold text-gray-800 text-lg">${title}</h3>
                            ${subtitle}
                        </div>
                    </div>
                    <i class="fas fa-chevron-right text-gray-300"></i>
                </div>
            </div>
        `;
    });
    listContainer.innerHTML = html;
}

function openDetailView(index) {
    const route = currentRoutes[index];
    const container = document.getElementById("detail-steps");
    document.getElementById("detail-view").classList.remove("hidden");

    let html = "";

    if (route.type === "direct") {
        const fullStops = route.bus.stops;
        const sIdx = fullStops.indexOf(route.userStart);
        const eIdx = fullStops.indexOf(route.userEnd);
        
        let intermediateStops = [];

        // SLICING LOGIC
        if (route.direction === "Forward") {
            // Forward: Slice normally
            if (sIdx !== -1 && eIdx !== -1 && eIdx > sIdx) {
                intermediateStops = fullStops.slice(sIdx + 1, eIdx);
            }
        } else {
            // Return: Slice and Reverse
            if (sIdx !== -1 && eIdx !== -1 && sIdx > eIdx) {
                intermediateStops = fullStops.slice(eIdx + 1, sIdx).reverse();
            }
        }

        // 1. Boarding
        html += renderTimelineStep(route.bus.route_no, route.userStart, `Board Bus Here`, "blue", true);
        
        // 2. Passing Stops
        if(intermediateStops.length > 0) {
            // Don't show ALL stops if there are 50. Show summary.
            const maxShow = 5;
            
            intermediateStops.slice(0, maxShow).forEach(stopName => {
                html += renderPassingStep(stopName);
            });

            if (intermediateStops.length > maxShow) {
                html += renderPassingStep(`... and ${intermediateStops.length - maxShow} more stops`);
            }
        }

        // 3. Drop Off
        html += renderTimelineStep(route.bus.route_no, route.userEnd, "Get off here. Journey Complete.", "red", false);
    
    } else {
        // Transfer Logic
        html += renderTimelineStep(route.leg1.route_no, route.userStart, "Start Journey", "blue", true);
        html += `
            <div class="relative pl-8 pb-8">
                <div class="absolute left-[15px] top-0 bottom-0 w-0.5 bg-gray-200"></div>
                <div class="absolute left-[6px] top-0 w-5 h-5 bg-yellow-400 rounded-full border-4 border-white shadow-sm z-10"></div>
                <h4 class="font-bold text-gray-800">Transfer at ${route.transferAt}</h4>
                <p class="text-xs text-gray-500">Switch buses here.</p>
                <button onclick="openConductorModal('${route.transferAt}')" class="mt-2 bg-yellow-100 text-yellow-800 text-xs font-bold px-3 py-2 rounded-lg border border-yellow-200 w-full text-left">
                    <i class="fas fa-language mr-1"></i> Show Conductor Card
                </button>
            </div>
        `;
        html += renderTimelineStep(route.leg2.route_no, route.userEnd, "You arrived!", "red", false);
    }

    container.innerHTML = html;
}

function renderTimelineStep(routeNo, locationName, instruction, color, showLine) {
    const colorClasses = { blue: "bg-blue-600", green: "bg-green-500", red: "bg-red-600" };
    return `
        <div class="relative pl-8 pb-8 ${!showLine ? 'last-item' : ''}">
            <div class="timeline-line" style="${!showLine ? 'display:none' : ''}"></div>
            <div class="absolute left-[6px] top-0 w-5 h-5 ${colorClasses[color]} rounded-full border-4 border-white shadow-sm z-10"></div>
            <h4 class="font-bold text-gray-800 text-lg">${locationName}</h4>
            <div class="flex items-center mt-1">
                <span class="bg-gray-100 text-gray-600 text-xs font-bold px-2 py-0.5 rounded mr-2">Bus ${routeNo}</span>
                <span class="text-sm text-gray-500">${instruction}</span>
            </div>
        </div>
    `;
}

function renderPassingStep(stopName) {
    return `
        <div class="relative pl-8 pb-6">
            <div class="timeline-line"></div>
            <div class="absolute left-[11px] top-1.5 w-2.5 h-2.5 bg-gray-300 rounded-full border-2 border-white z-10"></div>
            <p class="text-sm text-gray-400 font-medium">Passing ${stopName}</p>
        </div>
    `;
}

function goBack() { document.getElementById("detail-view").classList.add("hidden"); }
function closeModal() { document.getElementById("conductor-modal").classList.add("hidden"); }
function openConductorModal(locationName) {
    const modal = document.getElementById("conductor-modal");
    if(modal) {
        document.getElementById("modal-english-text").innerText = locationName;
        document.getElementById("modal-sinhala-text").innerText = `මට ${locationName} බහින්න ඕන.`; 
        modal.classList.remove("hidden");
    }
}