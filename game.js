let state = {
    heat: 0n,
    totalHeatEarned: 0n,
    biomassMultiplier: 1n,
    mutationPoints: 0n,
    unlockedSkills: [],
    storyIndex: 0,
    upgrades: {
        // baseTime is in milliseconds. 
        bacteria: { count: 1n, cost: 50n, baseOutput: 2n, baseTime: 1000, timeRemaining: 0, isRunning: false, automated: false, managerCost: 1000n },
        tubeWorms: { count: 0n, cost: 500n, baseOutput: 15n, baseTime: 3000, timeRemaining: 0, isRunning: false, automated: false, managerCost: 15000n },
        vent: { count: 0n, cost: 5000n, baseOutput: 150n, baseTime: 10000, timeRemaining: 0, isRunning: false, automated: false, managerCost: 250000n },
        magma: { count: 0n, cost: 50000n, baseOutput: 2000n, baseTime: 30000, timeRemaining: 0, isRunning: false, automated: false, managerCost: 5000000n }
    }
};

let surgeActive = false;
let surgeCooldown = 0;
let lastTick = Date.now();

const storyMilestones = [
    { threshold: 0n, text: "A spark in the dark. The water is freezing, but the rock is warm. Grow." },
    { threshold: 100n, text: "Chemosynthesis achieved. The first cells divide. You are no longer alone." },
    { threshold: 5000n, text: "An oasis forms. Tube worms anchor to the basalt. The ecosystem thrives, but space is limited." },
    { threshold: 100000n, text: "The vent is dying. Condense your mass. Mutate. Prepare to drift in the current." }
];

const skillNodes = {
    "heat_efficiency": { cost: 2n, requires: [] },
    "cheaper_bacteria": { cost: 3n, requires: [] }
};

function activateSurge() {
    if (surgeCooldown <= 0) {
        surgeActive = true;
        surgeCooldown = 60;
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
        upg.timeRemaining = upg.baseTime;
        
        if (event) {
            spawnFloatingText(event, "Running!");
        }
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

function calculatePayout(key) {
    let upg = state.upgrades[key];
    if (upg.count === 0n) return 0n;

    let multiplier = 1n;
    
    // 3x multiplier applies cumulatively every 10 levels
    let milestoneMultiplier = 3n ** (upg.count / 10n);
    multiplier *= milestoneMultiplier;
    multiplier *= state.biomassMultiplier;
    
    if (state.unlockedSkills.includes("heat_efficiency")) multiplier *= 2n;
    if (surgeActive) multiplier *= 5n;
    
    return upg.count * upg.baseOutput * multiplier;
}

function getUpgradeCost(key) {
    let cost = state.upgrades[key].cost;
    if (key === "bacteria" && state.unlockedSkills.includes("cheaper_bacteria")) {
        return (cost * 80n) / 100n;
    }
    return cost;
}

function buyUpgrade(key) {
    let currentCost = getUpgradeCost(key);
    if (state.heat >= currentCost) {
        state.heat -= currentCost;
        let upg = state.upgrades[key];
        upg.count += 1n;
        upg.cost = (upg.cost * 115n) / 100n; 
        updateUI();
    }
}

function buyManager(key) {
    let upg = state.upgrades[key];
    if (!upg.automated && state.heat >= upg.managerCost) {
        state.heat -= upg.managerCost;
        upg.automated = true;
        
        // Auto-start the cycle if it wasn't running
        if (!upg.isRunning && upg.count > 0n) {
            upg.isRunning = true;
            upg.timeRemaining = upg.baseTime;
        }
        updateUI();
    }
}

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
        biomassMultiplier: state.biomassMultiplier + newBiomass,
        mutationPoints: state.mutationPoints + newMutationPoints,
        unlockedSkills: state.unlockedSkills,
        storyIndex: state.storyIndex,
        upgrades: {
            bacteria: { count: 1n, cost: 50n, baseOutput: 2n, baseTime: 1000, timeRemaining: 0, isRunning: false, automated: false, managerCost: 1000n },
            tubeWorms: { count: 0n, cost: 500n, baseOutput: 15n, baseTime: 3000, timeRemaining: 0, isRunning: false, automated: false, managerCost: 15000n },
            vent: { count: 0n, cost: 5000n, baseOutput: 150n, baseTime: 10000, timeRemaining: 0, isRunning: false, automated: false, managerCost: 250000n },
            magma: { count: 0n, cost: 50000n, baseOutput: 2000n, baseTime: 30000, timeRemaining: 0, isRunning: false, automated: false, managerCost: 5000000n }
        }
    };
    updateUI();
}

function checkStory() {
    if (state.storyIndex >= storyMilestones.length) return;
    let nextMilestone = storyMilestones[state.storyIndex];
    if (state.totalHeatEarned >= nextMilestone.threshold) {
        document.getElementById('storyLog').innerText = nextMilestone.text; 
        state.storyIndex++;
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
            
            // Hard reset check: if the old save lacks the AdCap properties, clear it
            if (typeof loadedState.upgrades.bacteria.baseTime === 'undefined') {
                throw new Error("Old structure detected. Migrating to AdCap layout.");
            }
            
            state = loadedState;
            
            const lastTime = parseInt(localStorage.getItem('lastSaveTime') || Date.now());
            const offlineMs = Date.now() - lastTime;
            
            const keys = ['bacteria', 'tubeWorms', 'vent', 'magma'];
            keys.forEach(key => {
                let upg = state.upgrades[key];
                if (upg.automated && upg.count > 0n) {
                    let cycles = BigInt(Math.floor(offlineMs / upg.baseTime));
                    let offlinePayout = calculatePayout(key) * cycles;
                    state.heat += offlinePayout;
                    state.totalHeatEarned += offlinePayout;
                }
            });
            
        } catch (e) {
            console.log("Incompatible save found. Starting fresh.");
            localStorage.removeItem('abyssalSave');
        }
    }
}

function updateUI() {
    document.getElementById('heatDisplay').innerText = "Heat: " + state.heat.toString();
    
    const keys = ['bacteria', 'tubeWorms', 'vent', 'magma'];
    keys.forEach(key => {
        let upg = state.upgrades[key];
        
        document.getElementById('cost_' + key).innerText = getUpgradeCost(key).toString();
        document.getElementById(key + 'Count').innerText = "Lvl " + upg.count.toString();
        document.getElementById('output_' + key).innerText = "Output: " + calculatePayout(key).toString();
        
        let nextMilestone = ((upg.count / 10n) + 1n) * 10n;
        document.getElementById('milestone_' + key).innerText = "Next Boost: Lvl " + nextMilestone.toString();
        
        document.getElementById('btn_' + key).disabled = state.heat < getUpgradeCost(key);
        
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

        // Handle Progress Bar display states
        let fill = document.getElementById('fill_' + key);
        let timeText = document.getElementById('time_' + key);
        let bar = document.getElementById('bar_' + key);
        
        if (upg.count === 0n) {
            bar.style.backgroundColor = "#0f172a";
            fill.style.width = "0%";
            timeText.innerText = "Locked";
            bar.style.cursor = "not-allowed";
        } else if (upg.isRunning) {
            let progressPercent = 100 - ((upg.timeRemaining / upg.baseTime) * 100);
            fill.style.width = progressPercent + "%";
            timeText.innerText = (upg.timeRemaining / 1000).toFixed(1) + "s";
            bar.style.cursor = upg.automated ? "default" : "not-allowed";
        } else {
            fill.style.width = "0%";
            timeText.innerText = "Run (" + (upg.baseTime / 1000).toFixed(1) + "s)";
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
    
    if (state.totalHeatEarned >= 100000n || state.biomassMultiplier > 1n) {
        document.getElementById('prestigeBtn').classList.remove('hidden');
    }

    if (state.biomassMultiplier > 1n) {
        document.getElementById('biomassDisplay').classList.remove('hidden');
        document.getElementById('mutationDisplay').classList.remove('hidden');
        document.getElementById('skillTreePanel').classList.remove('hidden');
        
        document.getElementById('biomassDisplay').innerText = "Biomass Multiplier: x" + state.biomassMultiplier.toString();
        document.getElementById('mutationDisplay').innerText = "Mutation Points: " + state.mutationPoints.toString();
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

// 50ms Tick Loop (Runs 20 times per second)
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
                // Cycle complete
                let payout = calculatePayout(key);
                state.heat += payout;
                state.totalHeatEarned += payout;
                
                if (upg.automated) {
                    upg.timeRemaining = upg.baseTime; // Restart seamlessly
                } else {
                    upg.isRunning = false;
                    upg.timeRemaining = 0;
                }
            }
        } else if (upg.automated && upg.count > 0n) {
            // Failsafe to push automated machines back into the running state
            upg.isRunning = true;
            upg.timeRemaining = upg.baseTime;
        }
    });
    
    updateUI();
}, 50);

// Slower 1-second interval for Cooldowns and Story checks
setInterval(() => {
    if (surgeCooldown > 0) surgeCooldown--;
    checkStory();
}, 1000);

setInterval(saveGame, 10000);
