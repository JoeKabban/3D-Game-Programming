# Marble Chaos - Game Code Explanation

## What's This Game About?

Okay so basically you're controlling a marble (like a ball) and you gotta roll it to reach a glowing goal on each level. It's kinda like a 3D platformer where you're bouncing around trying not to fall off. You get 3 lives and there are 4 levels that get progressively harder. The game times you too, so it's about speed as well as not dying.

## The Files Breakdown

There are 3 main files that make this whole thing work:

### 1. **index.html** - The Basic Structure
This is just the page that holds everything together. It's got:
- A big canvas where all the 3D stuff gets drawn (`<canvas id="renderCanvas">`)
- The UI elements on top like the timer, level number, and life counter
- Buttons for jumping (on mobile) and starting the game
- A "You Win!" screen that pops up when you beat a level
- Script tags that load two libraries we use (Babylon.js for graphics and Cannon.js for physics)

Pretty straightforward - it's just HTML laying out where everything should go on the screen.

### 2. **style.css** - How It Looks
This is all the styling. It controls:
- The dark space background (kinda fits the theme)
- The HUD at the top showing time, level, and hearts for lives
- Control hints at the bottom telling you what keys to press
- Pop-up screens (the win screen, game over screen, etc.)
- Buttons and how they look when you hover over them
- Making sure the 3D canvas fills the whole screen

Nothing super fancy, just making it look clean and dark and space-y.

### 3. **game.js** - Where All The Magic Happens
This is the main game code. It's pretty big so let me break down what's happening:

#### **Setup Stuff (Variables)**
At the top there are a bunch of variables keeping track of game state like:
- `livesCount` - how many lives you have left
- `timerVal` - how many seconds you've been playing
- `currentLevel` - which level you're on (0-3)
- `marble` - the actual ball you control
- `keys` - an object tracking which keys are currently pressed

#### **Level Definitions**
There's an array called `LEVELS` that defines all 4 levels. Each level has:
- A name (like "First Steps", "Moving Platforms", etc.)
- A starting position for the marble
- A goal position you're trying to reach
- A bunch of platforms (the boxes you jump on)
- Moving platforms (platforms that slide back and forth)

The numbers in each platform are basically `[x position, y position, z position, width, depth]` so the code knows where to put them.

#### **The Starfield Background**
There's a function that creates a cool space background with nebula clouds and twinkling stars. It's drawn using Canvas 2D (a simpler drawing tool) and then set as the CSS background so you can see it through the 3D scene. Pretty cool effect!

#### **Building The Scene (`buildScene`)**
This is the big one. This function sets up the entire 3D world. It:
1. Clears any old scene from the last level
2. Creates a new 3D scene using Babylon.js
3. Sets up all the lights (there's actually several - a hemisphere light, a directional light, and point lights)
4. Creates materials (colors and textures) for different things like platforms, the goal, and the marble
5. Builds all the platforms based on the level data
6. Makes the goal (that golden glowing sphere with spinning rings around it)
7. Creates the marble and gives it physics
8. Sets up the camera (the view you're looking through)
9. Runs a game loop every frame that handles:
   - Player movement (checking which keys are pressed and pushing the marble in that direction)
   - Camera following the marble
   - Ground detection (so you know when you can jump)
   - Jumping mechanics
   - Animating the moving platforms
   - Animating the goal (it pulses and spins and glows)
   - Checking if you fell off (if you go below y=-10 you die)
   - Checking if you reached the goal

#### **Input Handling**
The code listens for keyboard and mouse input. When you press WASD or arrow keys, it calculates which direction you're facing relative to the camera and pushes the marble that way. Space bar makes you jump, and R restarts the level.

#### **Game Events**
- `onFell()` - Gets called when you fall off. Loses a life, shows a message, and either restarts the level or shows game over
- `onWin()` - Gets called when you touch the goal. Shows your completion time and either goes to the next level or lets you play again
- `startTimer()` - Starts counting up so you can see how fast you did it

#### **Physics**
The code uses something called Cannon.js to handle physics. This means the marble actually falls due to gravity, bounces, and collides with platforms realistically. Without this, the marble would just move around like a ghost.

## How The Game Actually Runs

When you open the page:
1. JavaScript loads and runs `game.js`
2. The starfield background gets created
3. A title screen pops up
4. You click "Play"
5. `startGame()` runs which calls `buildScene()` and `startTimer()`
6. The 3D world loads and the game loop starts ticking every frame
7. You press keys to move the marble around
8. Either you reach the goal and win, or you fall and lose a life
9. Repeat!

## Cool Details

- **Camera-relative movement** - The marble always moves in the direction your camera is facing, so it feels natural
- **Speed limit** - The marble gets capped at a max horizontal speed so you can't just zoom everywhere uncontrollably
- **Moving platforms** - They use sine waves to move back and forth smoothly (that's the `Math.sin()` stuff)
- **Lights following you** - The marble has its own light that follows it around, lighting up nearby platforms
- **Goal animations** - The goal sphere pulses, the rings spin at different speeds, and the light flickers - all in the game loop so it's smooth
- **Smooth shadows** - There are shadows under platforms and the marble which makes everything look more 3D

## The Libraries Used

- **Babylon.js** - A 3D graphics library. Handles all the drawing of the 3D world, cameras, lights, materials, etc.
- **Cannon.js** - A physics engine. Makes objects fall, bounce, and collide realistically

Both are loaded from the internet (from unpkg.com) so the game works without needing to download anything locally.

## Summary

Basically the game is:
1. Build a 3D world with platforms
2. Put a marble in it with physics
3. Let the player control it with WASD/arrows
4. Check if they reached the goal or fell off
5. Repeat with harder levels

It's actually a pretty solid little platformer! Pretty cool that you can make a full 3D game with just HTML, CSS, and JavaScript.

## Recent Updates

### Sound Effects
The game now has audio feedback for everything you do:
- **Jump sound** - Plays a beep when you jump
- **Fail sound** - Plays a buzzer when you fall
- **Win sound** - Plays a victory fanfare when you beat a level
All sounds are generated using the Web Audio API, so no audio files needed!

### High Score Tracking
Your best times are now saved! The game tracks your fastest completion time for each level and stores it in your browser. When you beat a level, it shows you:
- Your current time
- "NEW RECORD!" if you beat your previous best
- Your previous best time if you didn't beat it

Scores are saved between sessions, so come back and try to beat your own records.

### 6 Levels Now
The game now has 6 levels instead of 4:
1. **First Steps** - Tutorial level with simple platforms
2. **Gaps** - Jump across big gaps
3. **Moving Platforms** - Deal with platforms that slide back and forth
4. **Chaos** - Combine everything with multiple moving platforms
5. **Speed Runner** - Fast-paced level with scattered smaller platforms
6. **The Gauntlet** - The ultimate challenge with 4 tricky moving platforms
