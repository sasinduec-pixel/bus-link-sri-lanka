// This is our "Local Database"

const busNetwork = [
    {
        routeNo: "100",
        name: "Panadura - Pettah",
        type: "NORMAL",
        frequency: "Every 5 mins",
        tags: ["comfort", "tourist_friendly", "easy_transfer"],
        description: "Starts here. You will get a seat.",
        stops: ["Panadura Stand","Walana","Old Bridge","Moratuwa Stand","Katubedda Junction","Ratmalana","Mt Lavinia"]
    },
    {
        routeNo: "400",
        name: "Galle/Matara - Colombo",
        type: "INTERCITY",
        frequency: "Every 10 mins",
        tags: ["fast", "crowded"],
        description: "Coming from Galle. Very fast, but you might stand.",
        stops: ["Panadura Stand","Walana","Moratuwa Cross","Katubedda Junction","Ratmalana"]
    },
    {
        routeNo: "17",
        name: "Panadura - Kandy",
        type: "NORMAL",
        frequency: "Every 15 mins",
        tags: ["comfort", "long_distance"],
        description: "Good alternative if 100 is full.",
        stops: ["Panadura Stand","Walana","Moratuwa Stand","Nugegoda","Kandy"]
    },
    {
        routeNo: "151",
        name: "Moratuwa - Piliyandala",
        type: "NORMAL",
        frequency: "Every 10 mins",
        tags: ["feeder", "local", "easy_transfer"],
        description: "Starts at Moratuwa Stand. Easy to catch.",
        stops: ["Moratuwa Stand","Katubedda","University","Piliyandala Clock Tower"]
    },
    {
        routeNo: "255",
        name: "Mt Lavinia - Kottawa",
        type: "NORMAL",
        frequency: "Every 8 mins",
        tags: ["cross_town", "fast_connection"],
        description: "Passing bus. Catch at Katubedda for speed.",
        stops: ["Mt Lavinia","Ratmalana","Katubedda Junction","University","Piliyandala Clock Tower","Kottawa"]
    }
];

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

const stopCoordinates = {
    "Panadura Stand": [6.7146, 79.9096],
    "Walana": [6.7231, 79.9048],
    "Old Bridge": [6.7383, 79.8943],
    "Moratuwa Stand": [6.7744, 79.8827],
    "Moratuwa Cross": [6.7761, 79.8860], 
    "Katubedda Junction": [6.7915, 79.8872],
    "Ratmalana": [6.8159, 79.8722],
    "Mt Lavinia": [6.8306, 79.8653],
    "University": [6.7956, 79.9009],
    "Piliyandala Clock Tower": [6.8016, 79.9227],
    "Kottawa": [6.8412, 79.9654],
    "Nugegoda": [6.8649, 79.8997],
    "Kandy": [7.2906, 80.6337]
};