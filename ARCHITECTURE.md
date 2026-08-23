# SSSS-nake Architecture

## Overview

SSSS-nake is a client-only browser game built with HTML, CSS, Canvas 2D, and native JavaScript modules. It has no framework, backend, database, bundler, or runtime dependencies.

The application is designed to be served as static files. `index.html` provides the interface, `style.css` defines the visual system and responsive layout, and `script.js` initializes the game controller.

The initial screen is a mode menu with an inline SVG snake logo. Selecting a mode initializes a new run. Returning to the menu stops the active loop, and selecting another mode discards and resets the previous run.

The visual identity uses the Arcade Cobra shield mark, Archivo Black for the game name, and DM Sans for interface copy and controls. System fallbacks preserve legibility if the hosted fonts are unavailable.

## Project Structure

```text
.
├── index.html                 # Page structure, HUD, canvas, overlay, and options
├── style.css                 # Responsive presentation and control styling
├── script.js                 # Browser entry point
├── src/
│   ├── game-controller.js    # State owner, game lifecycle, timing, and drawing
│   ├── constants.js          # Shared gameplay constants and input mappings
│   ├── rules.js              # Deterministic movement and timing rules
│   ├── collision.js          # Collision and cell-occupancy queries
│   ├── enemy.js              # Autonomous-snake direction selection
│   ├── game-modes.js         # Mode definitions, scoring, and wrapping rules
│   ├── high-score.js         # Local competitive high-score persistence
│   ├── input.js              # Keyboard, pointer, mouse, and touch bindings
│   └── render-cache.js       # Static canvas-background cache
├── test/
│   └── rules.test.js         # Dependency-free unit tests for pure game logic
├── package.json              # Node test command and ES-module declaration
└── vercel.json               # Static Vercel and response-header configuration
```

## Runtime Architecture

`script.js` creates one game controller when the page loads. The controller owns all mutable game state inside a closure, including:

- Player position, direction, and pending growth
- Obstacles, enemy snakes, and power-ups
- Run state and elapsed-time bookkeeping
- Spawn schedules and gameplay settings
- Animation-frame and display state

No mutable game state is exposed globally. The returned controller API only provides `start`, `reset`, and `destroy` lifecycle operations.

## Game Modes

`src/game-modes.js` is the declarative registry for Competitive, Sandbox, and Classic. Each definition describes its HUD metric, editable settings, automatic growth, hazards, power-ups, wall behavior, self-collision behavior, and ready-screen copy.

### Competitive

Competitive preserves the escalating arena rules: automatic growth, increasing speed, obstacles, autonomous snakes, collisions, and temporary power-ups. Gameplay settings are fixed so scores are comparable, while snake appearance remains cosmetic.

The score awards one point for each completed tenth of survival and 50 points for each segment beyond the initial length. The best score is stored under the versioned `snakeGame.competitiveHighScore.v1` key in browser `localStorage`. Storage failures fall back to an in-memory record, and no score data leaves the browser.

### Sandbox

Sandbox keeps the gameplay settings editable. Crossing an edge wraps the snake to the opposite side, self-overlap is allowed, and obstacle or enemy contact clears the contacted hazard instead of ending the run. Board controls can add rocks, autonomous snakes, or fruit and clear all hazards.

### Classic

Classic disables automatic growth, obstacles, autonomous snakes, and competitive power-ups. One normal fruit is present at a time. Eating it adds one segment, awards 100 points, creates replacement food in an unoccupied cell, and advances the existing length-based speed curve. Wall and self collisions end the run.

Classic maintains its own device-local best score under `snakeGame.classicHighScore.v1`. It is independent from the Competitive record and uses the same in-memory fallback when browser storage is unavailable.

The main runtime flow is:

```text
User input
    ↓
Game controller
    ├── apply direction and settings
    ├── synchronize timed events
    ├── advance player and enemies
    ├── resolve collisions and power-ups
    └── render the resulting state
            ↓
        Canvas 2D
```

### Game Loop

The controller uses `requestAnimationFrame` while a run is active. Each frame:

1. Updates the active mode's score or elapsed-time metric.
2. Synchronizes growth, obstacle, enemy, and power-up schedules.
3. Advances the player when the current movement interval has elapsed.
4. Advances eligible enemy snakes.
5. Draws the current state.

The loop stops when the game is idle or over. Starting a run schedules it again. This avoids continuous canvas redraws and DOM updates on inactive screens.

Timed spawn catch-up is capped per frame. If a browser tab has been suspended for a long period, the game skips excessive historical spawn work rather than freezing while replaying every missed event.

## Module Responsibilities

### Game Controller

`src/game-controller.js` is the orchestration layer. It connects DOM elements, owns state, applies settings, controls the lifecycle, and coordinates rules, collision queries, enemy behavior, input, and rendering.

Complex artwork remains in the controller because it shares the controller's canvas context and visual state. Gameplay decisions that can remain independent of the DOM or Canvas API are extracted into pure modules.

### Rules

`src/rules.js` contains deterministic operations such as:

- Comparing and advancing grid positions
- Validating board boundaries
- Preventing direct reverse turns
- Calculating growth steps
- Calculating speed progression

These functions accept all required data as arguments and do not access the DOM or mutate shared state.

### Collision

`src/collision.js` centralizes cell containment and combined collision checks. It supports the important Snake rule that the final tail cell may be ignored when the snake is not growing, because that cell will be vacated during the move.

### Enemy Behavior

`src/enemy.js` selects the highest-scoring safe direction from candidates supplied by the controller. Candidate scoring considers available forward space, side openings, and a small random factor to keep movement from being completely uniform.

### Input

`src/input.js` normalizes keyboard and pointer controls into direction objects. It supports:

- Arrow keys
- WASD in either letter case
- Clicking or tapping relative to the snake's head
- Mouse or touch dragging

The module returns an unbind function so the controller can remove its listeners during destruction.

## Rendering Design

The game uses a fixed logical board of 600 × 600 pixels divided into 30-pixel cells. The canvas backing buffer is multiplied by the device pixel ratio, capped at 2×, and the drawing context is scaled back to logical coordinates. This produces sharper rendering on high-density displays without changing gameplay math.

The grass background is static and relatively expensive to construct because it contains gradients and many individual paths. `src/render-cache.js` captures it after the first draw and restores the cached pixels on subsequent frames. Dynamic elements are then drawn in this order:

1. Player-position glow
2. Obstacles
3. Power-up
4. Enemy snakes
5. Powered-up aura
6. Player snake

Snake themes are also cached after first construction. Each theme supplies a drawing mode and color palette while sharing the same body and head geometry.

## Interface and Accessibility

The HTML interface consists of:

- A length and elapsed-time HUD
- The game canvas and status overlay
- Restart control
- Live gameplay options

The layout collapses to one column on narrow screens. Canvas pointer handling disables browser touch gestures only over the board. Controls have visible keyboard focus indicators, and CSS transitions are effectively disabled when the user requests reduced motion.

The canvas includes an accessible name and fallback text. Game status messages are exposed through an `aria-live` overlay.

## Testing

Automated tests use Node's built-in test runner, so no dependency installation is required:

```bash
npm test
```

The suite covers movement, turn validation, board boundaries, timed growth, speed limits, tail-vacating collisions, combined collision state, enemy direction selection, mode definitions, competitive scoring, sandbox wrapping, and resilient local high-score persistence.

Browser smoke testing should additionally verify:

- Loading with no console errors
- Starting and restarting a run
- Keyboard, click, drag, and touch controls
- Live option changes
- Game-over and power-up behavior
- Background-tab suspension and resume
- Mobile and high-DPI rendering

## Vercel Deployment

The repository is deployed directly as a static project:

- Framework preset: **Other**
- Install command: empty
- Build command: empty
- Output directory: repository root (`.`)

`vercel.json` explicitly selects no framework and applies security-oriented response headers. The root document uses revalidation caching so new deployments are not hidden behind a stale HTML response. Mutable JavaScript and CSS filenames are not configured for permanent caching.

Connecting the repository to Vercel enables deployments for production commits and preview deployments for pull requests without changing the application architecture.

## Extension Guidelines

Keep new deterministic gameplay rules in small pure modules and cover them with unit tests. Keep browser event handling in `input.js`, and let the controller remain the sole owner of mutable game state.

A backend should only be introduced when a feature requires trusted persistence or coordination, such as accounts, verified leaderboards, or multiplayer. Those features should communicate through a narrow API rather than moving canvas rendering or moment-to-moment gameplay to the server.
