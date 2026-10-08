# Abyssal Idle

A narrative-driven idle clicker game built with HTML, CSS, and vanilla JavaScript. 

You begin as a raw biological imperative in the abyssal plain, miles below sunlight, trying to sustain a single, fragile chemical reaction. As you gather Heat, you will evolve, automate your ecosystem, and eventually face environmental collapse—forcing you to mutate and begin anew.

## How to Run

This game runs entirely in the browser and requires no build tools or servers.
1. Download or clone the project files (`index.html`, `styles.css`, `game.js`).
2. Ensure all three files are in the same folder.
3. Double-click `index.html` to open it in any modern web browser (Chrome, Firefox, Safari, Edge).

## How to Play

### 1. The Genesis (Clicking)
Your base currency is **Heat**. Click the "Pulse Vent" button to generate Heat manually. The narrative log in the top-left will guide your progression as you reach specific lifetime Heat milestones.

### 2. The Oasis (Automation)
Once you have enough Heat, you can purchase upgrades in the Store:
*   **Chemosynthetic Bacteria:** Generates a small amount of passive Heat every second.
*   **Tube Worm Colony:** Generates a much larger amount of passive Heat, but costs significantly more.
Costs scale exponentially as you buy more upgrades, representing the carrying capacity of your local vent ecosystem.

### 3. The Collapse (Prestige)
When you reach a lifetime generation of **100,000 Heat**, the vent begins to die. You will unlock the ability to **Collapse & Mutate** (Prestige). 
*   Activating this will perform a "hard reset" on your Heat and Upgrades.
*   In exchange, you earn a permanent **Biomass Multiplier** (which boosts all future Heat generation) and **Mutation Points (MP)**.

### 4. Mutation (Skill Tree)
After your first prestige, the **Mutation Tree** panel will unlock. You can spend your Mutation Points here to unlock permanent, persistent upgrades that survive all future resets, such as double click power, thermal efficiency, and upgrade discounts. 

## Saving & Offline Progress

The game automatically saves your progress to your browser's `localStorage` every 10 seconds and tracks the exact timestamp. When you close the browser and return later, the game will calculate the time you were away and automatically award you the passive Heat you earned while offline!

## Technical Details
*   **Engine:** Vanilla JavaScript.
*   **Math:** Uses JavaScript's native `BigInt` to prevent integer overflow and precision loss, allowing the game's economy to scale infinitely.
*   **Storage:** Utilizes a custom JSON serializer/deserializer to safely store `BigInt` values in `localStorage`.