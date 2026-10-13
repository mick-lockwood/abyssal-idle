const entityConfig = {
    bacteria:  { name: "Chemosynthetic Bacteria", baseCost: 10n, baseOutput: 1n, baseTime: 2000, managerCost: 1000n, managerName: "Bacterial Hive Mind" },
    sponges:   { name: "Deep Sea Sponges", baseCost: 150n, baseOutput: 10n, baseTime: 4000, managerCost: 15000n, managerName: "Current Filterer" },
    tubeWorms: { name: "Tube Worm Colony", baseCost: 1000n, baseOutput: 60n, baseTime: 6000, managerCost: 100000n, managerName: "Root Network" },
    vent:      { name: "Thermal Vent", baseCost: 40000n, baseOutput: 540n, baseTime: 12000, managerCost: 1000000n, managerName: "Pressure Regulator" },
    chimney:   { name: "Hydrothermal Chimney", baseCost: 500000n, baseOutput: 4000n, baseTime: 24000, managerCost: 10000000n, managerName: "Mineral Excavator" },
    magma:     { name: "Magma Chamber", baseCost: 1500000n, baseOutput: 12000n, baseTime: 48000, managerCost: 50000000n, managerName: "Core Tapper" },
    plume:     { name: "Mantle Plume", baseCost: 20000000n, baseOutput: 80000n, baseTime: 96000, managerCost: 500000000n, managerName: "Tectonic Injector" },
    rift:      { name: "Abyssal Rift", baseCost: 300000000n, baseOutput: 1000000n, baseTime: 192000, managerCost: 10000000000n, managerName: "Planetary AI" }
};

const cashUpgrades = [
    { id: "upg_bac1", name: "Thermal Adaptation", desc: "Bacteria output x3", cost: 10000n, target: "bacteria", multiplier: 3n },
    { id: "upg_spo1", name: "Porous Structures", desc: "Sponges output x3", cost: 50000n, target: "sponges", multiplier: 3n },
    { id: "upg_tub1", name: "Deep Roots", desc: "Tube Worms output x3", cost: 500000n, target: "tubeWorms", multiplier: 3n },
    { id: "upg_ven1", name: "Reinforced Walls", desc: "Thermal Vent output x3", cost: 5000000n, target: "vent", multiplier: 3n },
    { id: "upg_all1", name: "Geothermal Infusion", desc: "All outputs x2", cost: 25000000n, target: "all", multiplier: 2n },
    { id: "upg_chi1", name: "Rapid Extraction", desc: "Chimney output x3", cost: 100000000n, target: "chimney", multiplier: 3n },
    { id: "upg_mag1", name: "Superheated Core", desc: "Magma Chamber output x4", cost: 500000000n, target: "magma", multiplier: 4n },
    { id: "upg_all2", name: "Planetary Sync", desc: "All outputs x3", cost: 5000000000n, target: "all", multiplier: 3n }
];

const skillNodes = {
    "heat_efficiency": { cost: 2n, requires: [] },
    "cheaper_bacteria": { cost: 2n, requires: [] },
    "biomass_boost": { cost: 5n, requires: ["heat_efficiency"] },
    "manager_discount": { cost: 10n, requires: [] }
};

let state = {
    saveVersion: 5, 
    heat: 0n,
    totalHeatEarned: 0n,
    totalBiomassClaimed: 0n,
    biomassMultiplier: 1n,
    mutationPoints: 0n,
    unlockedSkills: [],
    storyIndex: 0,
    purchasedUpgrades: [],
    prestigeCount: 0n,
    upgrades: {}
};

let surgeActive = false;
let surgeCooldown = 0;
let lastTick = Date.now();
let buyMode = '1'; 

const storyMilestones = [
    { threshold: 0n, text: "A spark in the dark. The water is freezing, but the rock is warm. Grow." },
    { threshold: 1000n, text: "Chemosynthesis achieved. The first cells divide. You are no longer alone." },
    { threshold: 50000n, text: "An oasis forms. Tube worms anchor to the basalt. The ecosystem thrives, but space is limited." },
    { threshold: 1000000n, text: "The vent is dying. Condense your mass. Mutate. Prepare to drift in the current." },
    { threshold: 50000000n, text: "Drifting complete. The spores settle on a new, highly volatile ridge." }
];

function initUI() {
    const storeDiv = document.getElementById('businessStore');
    const managerDiv = document.getElementById('managerStore');
    const upgradeDiv = document.getElementById('upgradeStore');
    
    let storeHTML = "";
    let managerHTML = "";
    
    Object.keys(entityConfig).forEach(key => {
        let conf = entityConfig[key];
        storeHTML += `
            <div class="business-card">
                <div class="business-header">
                    <strong>${conf.name}</strong>
                    <span id="${key}Count" class="level-badge">Lvl 0</span>
                </div>
                <div class="progress-row">
                    <div class="progress-bar" id="bar_${key}" onclick="triggerCycle('${key}', event)">
                        <div class="progress-fill" id="fill_${key}"></div>
                        <span class="progress-text" id="time_${key}">${(conf.baseTime/1000).toFixed(1)}s</span>
                    </div>
                    <button id="btn_${key}" class="buy-btn" onclick="buyUpgrade('${key}')">
                        Buy <span id="qty_${key}">x1</span><br><span id="cost_${key}">${formatStatic(conf.baseCost)}</span>
                    </button>
                </div>
                <div class="business-stats">
                    <span id="output_${key}" class="output-text">Output: 0</span>
                    <span id="ops_${key}" style="color: var(--success); font-size: 0.8rem; font-weight: bold;">0.0/s</span>
                    <span id="milestone_${key}" class="milestone-text">Next Boost: Lvl 25</span>
                </div>
            </div>
        `;
        
        managerHTML += `
            <div class="manager-card" id="managerCard_${key}">
                <div>
                    <strong>${conf.managerName}</strong><br>
                    <span style="color: var(--text-muted); font-size: 0.85rem;">Automates ${conf.name}.</span><br>
                    <span class="text-accent" id="manCost_${key}" style="font-size: 0.85rem;">Cost: ${formatStatic(conf.managerCost)} Heat</span>
                </div>
                <button id="btn_manager_${key}" class="manager-buy-btn" onclick="buyManager('${key}')">Hire</button>
            </div>
        `;
    });
    
    let upgHTML = "";
    cashUpgrades.forEach(u => {
        upgHTML += `
            <div class="upgrade-card" id="upgradeCard_${u.id}">
                <div>
                    <strong>${u.name}</strong><br>
                    <span style="color: var(--text-muted); font-size: 0.85rem;">${u.desc}</span><br>
                    <span class="text-accent" style="font-size: 0.85rem;">Cost: ${formatStatic(u.cost)} Heat</span>
                </div>
                <button id="btn_upg_${u.id}" class="upgrade-buy-btn" onclick="buyCashUpgrade('${u.id}')">Research</button>
            </div>
        `;
    });
    
    storeDiv.innerHTML = storeHTML;
    managerDiv.innerHTML = managerHTML;
    upgradeDiv.innerHTML = upgHTML;
}

function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active-tab'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    document.getElementById(tabId).classList.add('active-tab');
    document.getElementById('btn_' + tabId).classList.add('active');
}

function setBuyMode(mode) {
    buyMode = mode;
    document.querySelectorAll('.toggle-btn').forEach(el => el.classList.remove('active-toggle'));
    document.getElementById('buy_' + mode).classList.add('active-toggle');
    updateUI();
}

function activateSurge() {
    if (surgeCooldown <= 0) {
        surgeActive = true;
        surgeCooldown = 120; 
        setTimeout(() => {
            surgeActive = false;
            updateUI();
        }, 10000);
        updateUI();
    }
}

function triggerCycle(key, event) {
    let upg = state.upgrades[key];
    if (upg.count > 0n && !upg.isRunning) {
        upg.isRunning = true;
        upg.timeRemaining = getActualTime(key);
        if (event) spawnFloatingText(event, "Running!");
    }
}

function spawnFloatingText(event, text) {
    const element = document.createElement('div');
    element.innerText = text;
    element.className = 'floating-text';
    element.style.left = (event.clientX - 10) + 'px';
    element.style.top = (event.clientY - 20) + 'px';
    document.body.appendChild(element);
    setTimeout(() => { element.remove(); }, 800);
}

// --- Math Functions ---

// Newton's method for BigInt square root
function bigIntSqRt(n) {
    if (n < 0n) return -1n;
    if (n === 0n) return 0n;
    let x0 = n / 2n;
    if (x0 !== 0n) {
        let x1 = (x0 + n / x0) / 2n;
        while (x1 < x0) {
            x0 = x1;
            x1 = (x0 + n / x0) / 2n;
        }
        return x0;
    }
    return 1n;
}

function calculatePendingBiomass() {
    let baseDivisor = 1000000000000n; 
    
    // By re-arranging the formula, we prevent BigInt from truncating to zero too early.
    // Formula: Biomass = sqrt( (LifetimeHeat * 22500) / 1 Trillion )
    let innerMath = (state.totalHeatEarned * 22500n) / baseDivisor;
    
    let calculatedTotal = bigIntSqRt(innerMath);
    let pending = calculatedTotal - (state.totalBiomassClaimed || 0n);
    
    return pending > 0n ? pending : 0n;
}

function getActualTime(key) {
    let upg = state.upgrades[key];
    let conf = entityConfig[key];
    let divs = 1;
    if (upg.count >= 50n) divs *= 2;
    if (upg.count >= 100n) divs *= 2;
    if (upg.count >= 200n) divs *= 2;
    return Math.max(50, Math.floor(conf.baseTime / divs));
}

function getMilestoneMultiplier(level) {
    let mult = 1n;
    const thresholds = [25n, 50n, 100n, 150n, 200n, 250n, 300n, 400n, 500n];
    thresholds.forEach(t => {
        if (level >= t) mult *= 2n;
    });
    return mult;
}

function calculatePayout(key) {
    let upg = state.upgrades[key];
    let conf = entityConfig[key];
    if (upg.count === 0n) return 0n;

    let multiplier = getMilestoneMultiplier(upg.count);
    multiplier *= state.biomassMultiplier;
    
    let storyBonus = 100n + (BigInt(state.storyIndex) * 25n);
    multiplier = (multiplier * storyBonus) / 100n;
    
    cashUpgrades.forEach(u => {
        if (state.purchasedUpgrades.includes(u.id)) {
            if (u.target === key || u.target === "all") multiplier *= u.multiplier;
        }
    });
    
    if (state.unlockedSkills.includes("heat_efficiency")) multiplier *= 2n;
    if (state.unlockedSkills.includes("biomass_boost")) multiplier *= 5n;
    if (surgeActive) multiplier *= 3n; 
    
    return upg.count * conf.baseOutput * multiplier;
}

function formatDynamic(num) {
    let n = typeof num === 'bigint' ? Number(num) : num;
    if (n >= 1e15) return (n / 1e15).toExponential(2);
    if (n >= 1e12) return (n / 1e12).toFixed(2) + "T";
    if (n >= 1e9) return (n / 1e9).toFixed(2) + "B";
    if (n >= 1e6) return (n / 1e6).toFixed(2) + "M";
    return Math.floor(n).toLocaleString('en-AU');
}

function formatStatic(num) {
    let n = typeof num === 'bigint' ? num : BigInt(Math.floor(Number(num)));
    return n.toLocaleString('en-AU');
}

function getBulkCostInfo(key) {
    let upg = state.upgrades[key];
    let tempCost = upg.cost;
    let totalCost = 0n;
    let itemsToBuy = 0n;
    
    let targetAmount = 1n;
    if (buyMode === '10') targetAmount = 10n;
    else if (buyMode === 'Next') {
        const thresholds = [25n, 50n, 100n, 150n, 200n, 250n, 300n, 400n, 500n];
        let nextMilestone = thresholds.find(t => t > upg.count);
        if (!nextMilestone) nextMilestone = upg.count + 100n;
        targetAmount = nextMilestone - upg.count;
    } else if (buyMode === 'Max') {
        targetAmount = 9999n;
    }

    for(let i = 0n; i < targetAmount; i++) {
        let actualCost = tempCost;
        if (key === "bacteria" && state.unlockedSkills.includes("cheaper_bacteria")) {
            actualCost = (tempCost * 80n) / 100n;
        }

        if (buyMode === 'Max' && state.heat < (totalCost + actualCost)) break;

        totalCost += actualCost;
        itemsToBuy++;
        tempCost = (tempCost * 115n) / 100n;
    }
    
    if (itemsToBuy === 0n && (buyMode === 'Max' || buyMode === 'Next')) {
        let fallbackCost = tempCost;
        if (key === "bacteria" && state.unlockedSkills.includes("cheaper_bacteria")) fallbackCost = (tempCost * 80n) / 100n;
        return { count: 0n, cost: fallbackCost };
    }

    return { count: itemsToBuy, cost: totalCost };
}

// --- Purchasing Actions ---

function buyUpgrade(key) {
    let bulkInfo = getBulkCostInfo(key);
    if (bulkInfo.count === 0n || state.heat < bulkInfo.cost) return;

    state.heat -= bulkInfo.cost;
    let upg = state.upgrades[key];

    for(let i = 0n; i < bulkInfo.count; i++) {
        upg.count++;
        upg.cost = (upg.cost * 115n) / 100n;
    }
    updateUI();
}

function buyManager(key) {
    let upg = state.upgrades[key];
    let conf = entityConfig[key];
    
    let actualManagerCost = conf.managerCost;
    if (state.unlockedSkills.includes("manager_discount")) {
        actualManagerCost = actualManagerCost / 2n;
    }

    if (!upg.automated && state.heat >= actualManagerCost) {
        state.heat -= actualManagerCost;
        upg.automated = true;
        if (!upg.isRunning && upg.count > 0n) {
            upg.isRunning = true;
            upg.timeRemaining = getActualTime(key);
        }
        updateUI();
    }
}

function buyCashUpgrade(id) {
    let upg = cashUpgrades.find(u => u.id === id);
    if (upg && state.heat >= upg.cost && !state.purchasedUpgrades.includes(id)) {
        state.heat -= upg.cost;
        state.purchasedUpgrades.push(id);
        updateUI();
    }
}

function unlockSkill(skillId) {
    const skill = skillNodes[skillId];
    if (!skill || state.unlockedSkills.includes(skillId)) return;
    
    const hasPrerequisites = skill.requires.every(req => state.unlockedSkills.includes(req));
    
    if (hasPrerequisites && state.mutationPoints >= BigInt(skill.cost)) {
        state.mutationPoints -= BigInt(skill.cost);
        state.unlockedSkills.push(skillId);
        updateUI();
    }
}

function prestige() {
    let pendingBiomass = calculatePendingBiomass();
    if (pendingBiomass <= 0n) return;

    let newMutationPoints = pendingBiomass / 100n;

    state = {
        saveVersion: 5,
        heat: 0n,
        totalHeatEarned: state.totalHeatEarned, 
        totalBiomassClaimed: (state.totalBiomassClaimed || 0n) + pendingBiomass,
        biomassMultiplier: state.biomassMultiplier + pendingBiomass,
        mutationPoints: state.mutationPoints + newMutationPoints,
        unlockedSkills: state.unlockedSkills,
        storyIndex: state.storyIndex,
        purchasedUpgrades: [],
        prestigeCount: (state.prestigeCount || 0n) + 1n,
        upgrades: {}
    };
    
    Object.keys(entityConfig).forEach(key => {
        state.upgrades[key] = {
            count: key === 'bacteria' ? 1n : 0n,
            cost: entityConfig[key].baseCost,
            timeRemaining: 0,
            isRunning: false,
            automated: false
        };
    });
    
    switchTab('tab_store');
    updateUI();
}

// --- Systems & Formatting ---

function renderStoryLogs() {
    const container = document.getElementById('storyLogContainer');
    container.innerHTML = '';
    for(let i = 0; i < state.storyIndex; i++) {
        const newLog = document.createElement('div');
        newLog.className = 'story-entry';
        newLog.innerHTML = `<strong>Log ${i + 1} - ${formatStatic(storyMilestones[i].threshold)} Heat Req.</strong><br>${storyMilestones[i].text}`;
        container.appendChild(newLog);
    }
}

function checkStory() {
    if (state.storyIndex >= storyMilestones.length) return;
    let nextMilestone = storyMilestones[state.storyIndex];
    if (state.totalHeatEarned >= nextMilestone.threshold) {
        const container = document.getElementById('storyLogContainer');
        const newLog = document.createElement('div');
        newLog.className = 'story-entry';
        newLog.innerHTML = `<strong>Log ${state.storyIndex + 1} - ${formatStatic(nextMilestone.threshold)} Heat Req.</strong><br>${nextMilestone.text}`;
        container.prepend(newLog);
        
        state.storyIndex++;
        updateUI(); 
        checkStory(); 
    }
}

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
        try {
            let loadedState = JSON.parse(saved, (key, value) => {
                if (typeof value === 'string' && value.endsWith('n')) return BigInt(value.slice(0, -1));
                return value;
            });
            
            if (loadedState.saveVersion !== 5) throw new Error("Hard Reset: Version mismatch.");
            state = loadedState;
            
            if (typeof state.totalBiomassClaimed === 'undefined') state.totalBiomassClaimed = 0n;
            
            const lastTime = parseInt(localStorage.getItem('lastSaveTime') || Date.now());
            const offlineMs = Date.now() - lastTime;
            
            Object.keys(entityConfig).forEach(key => {
                let upg = state.upgrades[key];
                if (upg && upg.automated && upg.count > 0n) {
                    let actualTimeMs = getActualTime(key);
                    let cycles = BigInt(Math.floor(offlineMs / actualTimeMs));
                    let offlinePayout = calculatePayout(key) * cycles;
                    state.heat += offlinePayout;
                    state.totalHeatEarned += offlinePayout;
                }
            });
        } catch (e) {
            console.log(e.message);
            localStorage.removeItem('abyssalSave');
        }
    }
    
    Object.keys(entityConfig).forEach(key => {
        if (!state.upgrades[key]) {
            state.upgrades[key] = { count: key === 'bacteria' ? 1n : 0n, cost: entityConfig[key].baseCost, timeRemaining: 0, isRunning: false, automated: false };
        }
    });
    
    renderStoryLogs();
}

function hardReset() {
    if (confirm("Are you sure you want to completely wipe your save? This cannot be undone.")) {
        localStorage.removeItem('abyssalSave');
        location.reload();
    }
}

function getNextMilestoneText(currentLevel) {
    const thresholds = [25n, 50n, 100n, 150n, 200n, 250n, 300n, 400n, 500n];
    let next = thresholds.find(m => m > currentLevel);
    
    if (!next) return "Max Boosts Reached";
    if ([50n, 100n, 200n].includes(next)) return `Next Boost: Lvl ${next} (Speed x2 & Output x2)`;
    return `Next Boost: Lvl ${next} (Output x2)`;
}

// --- Dynamic Core UI Loop ---

function updateUI() {
    document.getElementById('heatDisplay').innerText = "Heat: " + formatDynamic(state.heat);
    
    let totalOPS = 0;
    
    Object.keys(entityConfig).forEach(key => {
        let upg = state.upgrades[key];
        let conf = entityConfig[key];
        let bulkInfo = getBulkCostInfo(key);
        
        document.getElementById('cost_' + key).innerText = formatStatic(bulkInfo.cost);
        document.getElementById('qty_' + key).innerText = bulkInfo.count > 0n ? `x${bulkInfo.count}` : `x1`;
        document.getElementById(key + 'Count').innerText = "Lvl " + upg.count.toString();
        
        let currentPayout = calculatePayout(key);
        document.getElementById('output_' + key).innerText = "Output: " + formatDynamic(currentPayout);
        document.getElementById('milestone_' + key).innerText = getNextMilestoneText(upg.count);
        document.getElementById('btn_' + key).disabled = state.heat < bulkInfo.cost || bulkInfo.count === 0n;
        
        let actualTimeSec = getActualTime(key) / 1000;
        let itemOPS = upg.count > 0n ? (Number(currentPayout) / actualTimeSec) : 0;
        document.getElementById('ops_' + key).innerText = formatDynamic(itemOPS) + "/s";
        
        if (upg.automated) totalOPS += itemOPS;
        
        let managerCard = document.getElementById('managerCard_' + key);
        if (upg.automated) {
            managerCard.style.display = 'none';
        } else {
            managerCard.style.display = 'flex'; 
            let actualManagerCost = conf.managerCost;
            if (state.unlockedSkills.includes("manager_discount")) actualManagerCost = actualManagerCost / 2n;
            
            document.getElementById('manCost_' + key).innerText = `Cost: ${formatStatic(actualManagerCost)} Heat`;
            document.getElementById('btn_manager_' + key).disabled = state.heat < actualManagerCost;
        }

        let fill = document.getElementById('fill_' + key);
        let timeText = document.getElementById('time_' + key);
        let bar = document.getElementById('bar_' + key);
        
        if (upg.count === 0n) {
            bar.style.backgroundColor = "#0f172a";
            fill.style.width = "0%";
            timeText.innerText = "Locked";
            bar.style.cursor = "not-allowed";
        } else if (upg.isRunning) {
            let progressPercent = 100 - ((upg.timeRemaining / (actualTimeSec * 1000)) * 100);
            fill.style.width = progressPercent + "%";
            timeText.innerText = (upg.timeRemaining / 1000).toFixed(1) + "s";
            bar.style.cursor = upg.automated ? "default" : "not-allowed";
        } else {
            fill.style.width = "0%";
            timeText.innerText = "Run (" + actualTimeSec.toFixed(1) + "s)";
            bar.style.cursor = "pointer";
            bar.style.backgroundColor = "#1e293b";
        }
    });
    
    document.getElementById('opsDisplay').innerText = "Overall Output: " + formatDynamic(totalOPS) + "/s";
    
    // Exact Thermometer Calculation for Next Biomass Point
    let baseDivisor = 1000000000000n;
    let currentBiomassTarget = (state.totalBiomassClaimed || 0n) + calculatePendingBiomass() + 1n;
    
    let targetHeat = (currentBiomassTarget * currentBiomassTarget * baseDivisor) / 22500n;
    let previousTargetHeat = ((currentBiomassTarget - 1n) * (currentBiomassTarget - 1n) * baseDivisor) / 22500n;
    
    let heatProgress = state.totalHeatEarned - previousTargetHeat;
    let heatRequired = targetHeat - previousTargetHeat;
    
    let percent = 0;
    if (heatRequired > 0n) percent = Number((heatProgress * 1000n) / heatRequired) / 10;
    if (percent > 100) percent = 100;
    if (percent < 0) percent = 0;
    
    document.getElementById('thermoFill').style.width = percent + "%";
    document.getElementById('thermoText').innerText = percent.toFixed(1) + "% to Next Biomass";
    
    cashUpgrades.forEach(u => {
        let card = document.getElementById('upgradeCard_' + u.id);
        if (state.purchasedUpgrades.includes(u.id)) {
            card.style.display = 'none';
        } else {
            card.style.display = 'flex'; 
            document.getElementById('btn_upg_' + u.id).disabled = state.heat < u.cost;
        }
    });
    
    const surgeBtn = document.getElementById('surgeBtn');
    if (surgeCooldown > 0 && !surgeActive) {
        surgeBtn.disabled = true;
        surgeBtn.innerText = `Geothermal Surge (Cooldown: ${surgeCooldown}s)`;
    } else if (surgeActive) {
        surgeBtn.disabled = true;
        surgeBtn.innerText = `Geothermal Surge (ACTIVE!)`;
    } else {
        surgeBtn.disabled = false;
        surgeBtn.innerText = `Geothermal Surge (Ready)`;
    }
    
    const prestigeBtn = document.getElementById('prestigeBtn');
    let pendingBiomass = calculatePendingBiomass();
    
    if (pendingBiomass > 0n) {
        prestigeBtn.classList.remove('hidden');
        prestigeBtn.innerText = `Collapse & Mutate (Claim +${formatStatic(pendingBiomass)} Biomass)`;
        prestigeBtn.disabled = false;
    } else if (state.totalHeatEarned > 100000n) {
        prestigeBtn.classList.remove('hidden');
        prestigeBtn.innerText = `Collapse & Mutate (Need more Heat for +1 Biomass)`;
        prestigeBtn.disabled = true;
    } else {
        prestigeBtn.classList.add('hidden');
    }

    if (state.prestigeCount > 0n) {
        document.getElementById('evolutionLocked').classList.add('hidden');
        document.getElementById('evolutionContent').classList.remove('hidden');
        document.getElementById('biomassDisplay').innerText = "Biomass Multiplier: x" + state.biomassMultiplier.toString();
        document.getElementById('mutationDisplay').innerText = "Mutation Points: " + state.mutationPoints.toString();
    } else {
        document.getElementById('evolutionLocked').classList.remove('hidden');
        document.getElementById('evolutionContent').classList.add('hidden');
    }

    state.unlockedSkills.forEach(skillId => {
        let btn = document.getElementById('skill_' + skillId);
        if (btn) {
            btn.classList.add('unlocked');
            btn.innerText = btn.innerText.replace(/Cost:.*/, "(Unlocked)");
            btn.disabled = true;
        }
    });
}

initUI();
loadGame();
updateUI();

setInterval(() => {
    let now = Date.now();
    let dt = now - lastTick;
    lastTick = now;
    
    Object.keys(entityConfig).forEach(key => {
        let upg = state.upgrades[key];
        
        if (upg.isRunning) {
            upg.timeRemaining -= dt;
            if (upg.timeRemaining <= 0) {
                let payout = calculatePayout(key);
                state.heat += payout;
                state.totalHeatEarned += payout;
                
                if (upg.automated) {
                    upg.timeRemaining = getActualTime(key);
                } else {
                    upg.isRunning = false;
                    upg.timeRemaining = 0;
                }
            }
        } else if (upg.automated && upg.count > 0n) {
            upg.isRunning = true;
            upg.timeRemaining = getActualTime(key);
        }
    });
    
    updateUI();
}, 50);

setInterval(() => {
    if (surgeCooldown > 0) surgeCooldown--;
    checkStory();
}, 1000);

setInterval(saveGame, 10000);
