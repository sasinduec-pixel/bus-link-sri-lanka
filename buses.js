// This is our "Local Database"

const busNetwork = [
    // --- FROM PANADURA (Starting Options) ---
    
    {
        routeNo: "100",
        name: "Panadura - Pettah",
        type: "NORMAL",
        frequency: "Every 5 mins",
        tags: ["comfort", "tourist_friendly", "easy_transfer"],
        description: "Starts here. You will get a seat.",
        stops: [
            "Panadura Stand",
            "Walana",
            "Old Bridge",
            "Moratuwa Stand", // Goes INSIDE the stand
            "Katubedda Junction",
            "Ratmalana",
            "Mt Lavinia"
        ]
    },
    {
        routeNo: "400", // Also covers 02, 32
        name: "Galle/Matara - Colombo",
        type: "INTERCITY",
        frequency: "Every 10 mins",
        tags: ["fast", "crowded"],
        description: "Coming from Galle. Very fast, but you might stand.",
        stops: [
            "Panadura Stand",
            "Walana",
            "Moratuwa Cross", // Stops on main road
            "Katubedda Junction", // <--- THE KEY TRANSFER POINT
            "Ratmalana"
        ]
    },
    {
        routeNo: "17",
        name: "Panadura - Kandy",
        type: "NORMAL",
        frequency: "Every 15 mins",
        tags: ["comfort", "long_distance"],
        description: "Good alternative if 100 is full.",
        stops: [
            "Panadura Stand",
            "Walana",
            "Moratuwa Stand",
            "Nugegoda",
            "Kandy"
        ]
    },

    // --- CONNECTION BUSES (The Second Leg) ---

    {
        routeNo: "151",
        name: "Moratuwa - Piliyandala",
        type: "NORMAL",
        frequency: "Every 10 mins",
        tags: ["feeder", "local", "easy_transfer"],
        description: "Starts at Moratuwa Stand. Easy to catch.",
        stops: [
            "Moratuwa Stand", // Connects with Bus 100
            "Katubedda",
            "University",
            "Piliyandala Clock Tower"
        ]
    },
    {
        routeNo: "255",
        name: "Mt Lavinia - Kottawa",
        type: "NORMAL",
        frequency: "Every 8 mins",
        tags: ["cross_town", "fast_connection"],
        description: "Passing bus. Catch at Katubedda for speed.",
        stops: [
            "Mt Lavinia",
            "Ratmalana",
            "Katubedda Junction", // <--- INTERSECTS HERE
            "University",
            "Piliyandala Clock Tower",
            "Kottawa"
        ]
    }
];

// Transfer Instructions
const transferHubs = {
    "Moratuwa Stand": {
        details: "Stay on the same side. Walk 10 meters inside the stand. Look for the 151 board on the left.",
        type: "easy"
    },
    "Katubedda Junction": {
        details: "Get off at the K-Zone/Arpico halt. You MUST cross the road to the other side to catch the 255 going to Piliyandala.",
        type: "hard"
    }
};