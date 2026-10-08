// 1. Centralised State & Data Structures
let state = {
    heat: 0n,
    totalHeatEarned: 0n,
    clickPower: 1n,
    biomassMultiplier: 1n,
    mutationPoints: 0n,
    unlockedSkills: [],
    storyIndex: 0,
    upgrades: {
        bacteria: { count: 0n, cost: 50n, output: 2n },
        tubeWorms: { count: 0n, cost: 500n, output: 15n }
    }
};

const storyMilestones = [
    { threshold: 0n, text: "A spark in the dark. The water is freezing, but the rock is warm. Grow." },
    { threshold: 100n, text: "Chemosynthesis achieved. The first cells divide. You are no longer alone." },
    { threshold: 5000n, text: "An oasis forms. Tube worms anchor to the basalt. The ecosystem thrives, but space is limited." },
    { threshold: 100000n, text: "The vent is dying. Condense your mass. Mutate. Prepare to drift in the current." }
];

const skillNodes = {
    "double_click": { cost: 1n, requires: [] },
    "heat_efficiency": { cost: 2n, requires: ["double_click"] },
    "cheaper_bacteria": { cost: 3n, requires: ["double_click"] }
};

// 2. Core Mechanics
function generateHeatClick() {
    let currentClick = state.clickPower;
    
    if (state.unlockedSkills.includes("double_click")) {
        currentClick *= 2n;
    }
    
    const generated = currentClick * state.biomassMultiplier;
    state.heat += generated;
    state.totalHeatEarned += generated;
    updateUI();
}

function calculatePassiveHeat() {
    let passive = 0n;
    passive += state.upgrades.bacteria.count * state.upgrades.bacteria.output;
    passive += state.upgrades.tubeWorms.count * state.upgrades.tubeWorms.output;
    
    let multiplier = state.biomassMultiplier;
    
    if (state.unlockedSkills.includes("heat_efficiency")) {
        multiplier *= 2n;
    }
    
    return passive * multiplier;
}

function buyUpgrade(upgradeKey) {
    let upgrade = state.upgrades[upgradeKey];
    let currentCost = upgrade.cost;
    
    if (upgradeKey === "bacteria" && state.unlockedSkills.includes("cheaper_bacteria")) {
        currentCost = (currentCost * 80n) / 100n;
    }

    if (state.heat >= currentCost) {
        state.heat -= currentCost;
        upgrade.count += 1n;
        upgrade.cost = (upgrade.cost * 115n) / 100n; 
        updateUI();
    }
}

// 3. Progression Systems
function unlockSkill(skillId) {
    const skill = skillNodes[skillId];
    if (!skill || state.unlockedSkills.includes(skillId)) return;
    
    const hasPrerequisites = skill.requires.every(req => state.unlockedSkills.includes(req));
    
    if (hasPrerequisites && state.mutationPoints >= skill.cost) {
        state.mutationPoints -= skill.cost;
        state.unlockedSkills.push(skillId);
        updateUI();
    }
}

function prestige() {
    const prestigeThreshold = 100000n;
    if (state.totalHeatEarned < prestigeThreshold) return;

    let newBiomass = state.totalHeatEarned / 50000n; 
    let newMutationPoints = 1n + (state.totalHeatEarned / 200000n);

    state = {
        heat: 0n,
        totalHeatEarned: 0n,
        clickPower: 1n,
        biomassMultiplier: state.biomassMultiplier + newBiomass,
        mutationPoints: state.mutationPoints + newMutationPoints,
        unlockedSkills: state.unlockedSkills,
        storyIndex: state.storyIndex,
        upgrades: {
            bacteria: { count: 0n, cost: 50n, output: 2n },
            tubeWorms: { count: 0n, cost: 500n, output: 15n }
        }
    };
    updateUI();
}

function checkStory() {
    if (state.storyIndex >= storyMilestones.length) return;
    
    let nextMilestone = storyMilestones[state.storyIndex];
    
    if (state.totalHeatEarned >= nextMilestone.threshold) {
        // Link this to your DOM, e.g., document.getElementById('storyLog').innerText = nextMilestone.text;
        console.log(nextMilestone.text); 
        state.storyIndex++;
        checkStory(); 
    }
}

// 4. Saving & Loading with BigInt Serialization
function saveGame() {
    const serialized = JSON.stringify(state, (key, value) => 
        typeof value === 'bigint' ? value.toString() + 'n' : value
    );
    localStorage.setItem('abyssalSave', serialized);
    localStorage.setItem('lastSaveTime', Date.now().toString());
}

function loadGame() {
    const saved = localStorage.getItem('abyssalSave');
    if (saved) {
        state = JSON.parse(saved, (key, value) => {
            if (typeof value === 'string' && value.endsWith('n')) {
                return BigInt(value.slice(0, -1));
            }
            return value;
        });
        
        const lastTime = parseInt(localStorage.getItem('lastSaveTime') || Date.now());
        // Calculate seconds elapsed while offline
        const secondsOffline = BigInt(Math.floor((Date.now() - lastTime) / 1000));
        const offlineEarnings = calculatePassiveHeat() * secondsOffline;
        
        state.heat += offlineEarnings;
        state.totalHeatEarned += offlineEarnings;
    }
}

function updateUI() {
    // Target your HTML elements here to display state values
    // document.getElementById('heatDisplay').innerText = "Heat: " + state.heat.toString();
}

// 5. Initialization & Game Loop
loadGame();

setInterval(() => {
    let passiveHeat = calculatePassiveHeat();
    if (passiveHeat > 0n) {
        state.heat += passiveHeat;
        state.totalHeatEarned += passiveHeat;
    }
    checkStory();
    updateUI();
}, 1000);

setInterval(saveGame, 10000); // Auto-save every 10 seconds
