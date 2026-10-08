let state = {
    saveVersion: 2, 
    heat: 0n,
    totalHeatEarned: 0n,
    biomassMultiplier: 1n,
    mutationPoints: 0n,
    unlockedSkills: [],
    storyIndex: 0,
    upgrades: {
        bacteria: { count: 1n, cost: 10n, baseOutput: 1n, baseTime: 2000, timeRemaining: 0, isRunning: false, automated: false, managerCost: 1000n },
        tubeWorms: { count: 0n, cost: 1000n, baseOutput: 60n, baseTime: 6000, timeRemaining: 0, isRunning: false, automated: false, managerCost: 15000n },
        vent: { count: 0n, cost: 40000n, baseOutput: 540n, baseTime: 20000, timeRemaining: 0, isRunning: false, automated: false, managerCost: 100000n },
        magma: { count: 0n, cost: 1500000n, baseOutput: 8000n, baseTime: 60000, timeRemaining: 0, isRunning: false, automated: false, managerCost: 5000000n }
    }
};

let surgeActive = false;
let surgeCooldown = 0;
let lastTick = Date.now();
let buyMode = '1'; 

const storyMilestones = [
    { threshold: 0n, text: "A spark in the dark. The water is freezing, but the rock is warm. Grow." },
    { threshold: 1000n, text: "Chemosynthesis achieved. The first cells divide. You are no longer alone." },
    { threshold: 50000n, text: "An oasis forms. Tube worms anchor to the basalt. The ecosystem thrives, but space is limited." },
    { threshold: 1000000n, text: "The vent is dying. Condense your mass. Mutate. Prepare to drift in the current." }
];

const skillNodes = {
    "heat_efficiency": { cost: 2n, requires: [] },
    "cheaper_bacteria": { cost: 3n, requires: [] }
};

// UI Control
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

// Dynamic Math Models
function getActualTime(key) {
    let upg = state.upgrades[key];
    let divs = 1;
    if (upg.count >= 50n) divs *= 2;
    if (upg.count >= 100n) divs *= 2;
    if (upg.count >= 200n) divs *= 2;
    return Math.max(50, Math.floor(upg.baseTime / divs));
}

function getMilestoneMultiplier(level) {
    let mult = 1n;
    const thresholds = [25n, 50n, 100n, 150n, 200n, 250n, 300n];
    thresholds.forEach(t => {
        if (level >= t) mult *= 2n;
    });
    return mult;
}

function calculatePayout(key) {
    let upg = state.upgrades[key];
    if (upg.count === 0n) return 0n;

    let multiplier = getMilestoneMultiplier(upg.count);
    multiplier *= state.biomassMultiplier;
    
    // Logs Achievement System: +25% Output per unlocked log
    let storyBonus = 100n + (BigInt(state.storyIndex) * 25n);
    multiplier = (multiplier * storyBonus) / 100n;
    
    if (state.unlockedSkills.includes("heat_efficiency")) multiplier *= 2n;
    if (surgeActive) multiplier *= 3n; 
    
    return upg.count * upg.baseOutput * multiplier;
}

function getBulkCostInfo(key) {
    let upg = state.upgrades[key];
    let tempCost = upg.cost;
    let totalCost = 0n;
    let itemsToBuy = 0n;
    
    let targetAmount = buyMode === '1' ? 1n : (buyMode === '10' ? 10n : 9999n); 

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
    
    if (itemsToBuy === 0n && buyMode === 'Max') {
        let fallbackCost = tempCost;
        if (key === "bacteria" && state.unlockedSkills.includes("cheaper_bacteria")) fallbackCost = (tempCost * 80n) / 100n;
        return { count: 0n, cost: fallbackCost };
    }

    return { count: itemsToBuy, cost: totalCost };
}

// Interaction
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
    if (!upg.automated && state.heat >= upg.managerCost) {
        state.heat -= upg.managerCost;
        upg.automated = true;
        if (!upg.isRunning && upg.count > 0n) {
            upg.isRunning = true;
            upg.timeRemaining = getActualTime(key);
        }
        updateUI();
    }
}

function unlockSkill(skillId) {
    const skill = skillNodes[skillId];
    if (!skill || state.unlockedSkills.includes(skillId)) return;
    
    if (state.mutationPoints >= skill.cost) {
        state.mutationPoints -= skill.cost;
        state.unlockedSkills.push(skillId);
        updateUI();
    }
}

function prestige() {
    const prestigeThreshold = 1000000n; 
    if (state.totalHeatEarned < prestigeThreshold) return;

    let newBiomass = state.totalHeatEarned / 500000n; 
    let newMutationPoints = 1n + (state.totalHeatEarned / 2000000n);

    state = {
        saveVersion: 2,
        heat: 0n,
        totalHeatEarned: 0n,
        biomassMultiplier: state.biomassMultiplier + newBiomass,
        mutationPoints: state.mutationPoints + newMutationPoints,
        unlockedSkills: state.unlockedSkills,
        storyIndex: state.storyIndex,
        upgrades: {
            bacteria: { count: 1n, cost: 10n, baseOutput: 1n, baseTime: 2000, timeRemaining: 0, isRunning: false, automated: false, managerCost: 1000n },
            tubeWorms: { count: 0n, cost: 1000n, baseOutput: 60n, baseTime: 6000, timeRemaining: 0, isRunning: false, automated: false, managerCost: 15000n },
            vent: { count: 0n, cost: 40000n, baseOutput: 540n, baseTime: 20000, timeRemaining: 0, isRunning: false, automated: false, managerCost: 100000n },
            magma: { count: 0n, cost: 1500000n, baseOutput: 8000n, baseTime: 60000, timeRemaining: 0, isRunning: false, automated: false, managerCost: 5000000n }
        }
    };
    switchTab('tab_store');
    updateUI();
}

function renderStoryLogs() {
    const container = document.getElementById('storyLogContainer');
    container.innerHTML = '';
    for(let i = 0; i < state.storyIndex; i++) {
        const newLog = document.createElement('div');
        newLog.className = 'story-entry';
        newLog.innerHTML = `<strong>Log ${i + 1} - ${storyMilestones[i].threshold} Heat Requirement</strong><br>${storyMilestones[i].text}`;
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
        newLog.innerHTML = `<strong>Log ${state.storyIndex + 1} - ${nextMilestone.threshold} Heat Requirement</strong><br>${nextMilestone.text}`;
        
        // Push the new log to the top of the container
        container.prepend(newLog);
        
        state.storyIndex++;
        updateUI(); // Pushes the new 25% output multiplier immediately
        checkStory(); 
    }
}

// System
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
            
            if (loadedState.saveVersion !== 2) throw new Error("Economy Rebalance: Forcing fresh save.");
            
            state = loadedState;
            
            const lastTime = parseInt(localStorage.getItem('lastSaveTime') || Date.now());
            const offlineMs = Date.now() - lastTime;
            
            const keys = ['bacteria', 'tubeWorms', 'vent', 'magma'];
            keys.forEach(key => {
                let upg = state.upgrades[key];
                if (upg.automated && upg.count > 0n) {
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
    
    // Force logs to generate when loading the game
    renderStoryLogs();
}

function getNextMilestoneText(currentLevel) {
    const thresholds = [25n, 50n, 100n, 150n, 200n, 250n, 300n];
    let next = thresholds.find(m => m > currentLevel);
    
    if (!next) return "Max Boosts Reached";
    if ([50n, 100n, 200n].includes(next)) {
        return `Next Boost: Lvl ${next} (Speed x2 & Output x2)`;
    }
    return `Next Boost: Lvl ${next} (Output x2)`;
}

function updateUI() {
    document.getElementById('heatDisplay').innerText = "Heat: " + state.heat.toString();
    
    const keys = ['bacteria', 'tubeWorms', 'vent', 'magma'];
    keys.forEach(key => {
        let upg = state.upgrades[key];
        let bulkInfo = getBulkCostInfo(key);
        
        document.getElementById('cost_' + key).innerText = bulkInfo.cost.toString();
        document.getElementById('qty_' + key).innerText = bulkInfo.count > 0n ? `x${bulkInfo.count}` : `x1`;
        
        document.getElementById(key + 'Count').innerText = "Lvl " + upg.count.toString();
        document.getElementById('output_' + key).innerText = "Output: " + calculatePayout(key).toString();
        document.getElementById('milestone_' + key).innerText = getNextMilestoneText(upg.count);
        
        document.getElementById('btn_' + key).disabled = state.heat < bulkInfo.cost || bulkInfo.count === 0n;
        
        let managerBtn = document.getElementById('manager_' + key);
        if (upg.automated) {
            managerBtn.innerText = "Automated";
            managerBtn.disabled = true;
            managerBtn.style.color = "#22c55e";
            managerBtn.style.borderColor = "#22c55e";
        } else {
            managerBtn.innerText = "Automate (" + upg.managerCost.toString() + ")";
            managerBtn.disabled = state.heat < upg.managerCost;
        }

        let fill = document.getElementById('fill_' + key);
        let timeText = document.getElementById('time_' + key);
        let bar = document.getElementById('bar_' + key);
        let actualTimeMs = getActualTime(key);
        
        if (upg.count === 0n) {
            bar.style.backgroundColor = "#0f172a";
            fill.style.width = "0%";
            timeText.innerText = "Locked";
            bar.style.cursor = "not-allowed";
        } else if (upg.isRunning) {
            let progressPercent = 100 - ((upg.timeRemaining / actualTimeMs) * 100);
            fill.style.width = progressPercent + "%";
            timeText.innerText = (upg.timeRemaining / 1000).toFixed(1) + "s";
            bar.style.cursor = upg.automated ? "default" : "not-allowed";
        } else {
            fill.style.width = "0%";
            timeText.innerText = "Run (" + (actualTimeMs / 1000).toFixed(1) + "s)";
            bar.style.cursor = "pointer";
            bar.style.backgroundColor = "#1e293b";
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
    
    if (state.totalHeatEarned >= 1000000n || state.biomassMultiplier > 1n) {
        document.getElementById('prestigeBtn').classList.remove('hidden');
    }

    // Evolution UI Locking Logic
    if (state.biomassMultiplier > 1n) {
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

loadGame();
updateUI();

// 50ms Tick Loop
setInterval(() => {
    let now = Date.now();
    let dt = now - lastTick;
    lastTick = now;
    
    const keys = ['bacteria', 'tubeWorms', 'vent', 'magma'];
    keys.forEach(key => {
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

// Cooldown & Story Loop
setInterval(() => {
    if (surgeCooldown > 0) surgeCooldown--;
    checkStory();
}, 1000);

setInterval(saveGame, 10000);
