// =============================================================
//  MARBLE CHAOS — game.js
//  Requires: Babylon.js + Cannon.js (loaded in index.html)
// =============================================================


// ── Global state ──────────────────────────────────────────────
var livesCount    = 3;
var timerVal      = 0;
var timerRunning  = false;
var timerInterval = null;
var currentLevel  = 0;
var won           = false;

// Babylon objects
var scene         = null;
var marble        = null;
var cam           = null;
var marbleLight   = null;
var ring2ref      = null;
var goalLightRef  = null;
var goalMesh      = null;
var ringMesh      = null;
var movingPlatforms = [];

// Input state
var keys          = {};
var wantsJump     = false;
var onGround      = false;
var jumpCooldown  = 0;

var canvas = document.getElementById('renderCanvas');
var engine = null;


// ── Sound Effects (Web Audio API) ──────────────────────────────
var audioContext = null;

function initAudio() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
}

function playSound(frequency, duration, type) {
  if (!audioContext) initAudio();
  var osc = audioContext.createOscillator();
  var gain = audioContext.createGain();
  osc.connect(gain);
  gain.connect(audioContext.destination);
  osc.frequency.value = frequency;
  osc.type = type || 'sine';
  gain.gain.setValueAtTime(0.3, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
  osc.start(audioContext.currentTime);
  osc.stop(audioContext.currentTime + duration);
}

function soundJump() {
  playSound(400, 0.1, 'square');
  playSound(600, 0.08, 'sine');
}

function soundLand() {
  playSound(200, 0.15, 'sine');
}

function soundWin() {
  playSound(523, 0.1, 'sine');
  setTimeout(function() { playSound(659, 0.1, 'sine'); }, 100);
  setTimeout(function() { playSound(783, 0.2, 'sine'); }, 200);
}

function soundFail() {
  playSound(150, 0.3, 'square');
}


// ── High Score System ──────────────────────────────────────────
function getHighScore(levelIndex) {
  var scores = JSON.parse(localStorage.getItem('marbleChaosScores') || '{}');
  return scores[levelIndex] || null;
}

function setHighScore(levelIndex, time) {
  var scores = JSON.parse(localStorage.getItem('marbleChaosScores') || '{}');
  var current = scores[levelIndex];
  if (!current || time < current) {
    scores[levelIndex] = time;
    localStorage.setItem('marbleChaosScores', JSON.stringify(scores));
    return true; // new record
  }
  return false;
}

function clearAllScores() {
  localStorage.removeItem('marbleChaosScores');
}


// ── Level definitions ─────────────────────────────────────────
// platforms: [x, y, z, width, depth]
// moving:    [x, y, z, width, depth, axis, range, speed]
var LEVELS = [
  {
    name: "First Steps",
    start: { x: 0,  y: 1.5, z: -8 },
    goal:  { x: 0,  y: 1.5, z:  8 },
    platforms: [
      [0, 0, -8, 4, 4],
      [0, 0, -3, 3, 3],
      [0, 0,  2, 3, 3],
      [0, 0,  7, 4, 4]
    ],
    moving: []
  },
  {
    name: "Gaps",
    start: { x: -6, y: 1.5, z: -6 },
    goal:  { x:  6, y: 1.5, z:  6 },
    platforms: [
      [-6, 0, -6, 3, 3],
      [-2, 0, -6, 2, 2],
      [ 2, 0, -4, 2, 2],
      [ 6, 0, -2, 2, 2],
      [ 4, 0,  2, 3, 2],
      [ 2, 0,  5, 2, 3],
      [ 5, 0,  6, 3, 3]
    ],
    moving: []
  },
  {
    name: "Moving Platforms",
    start: { x: 0, y: 1.5, z: -10 },
    goal:  { x: 0, y: 1.5, z:  10 },
    platforms: [
      [0, 0, -10, 4, 3],
      [0, 0,  10, 4, 3]
    ],
    moving: [
      [0, 0, -5, 2.5, 2, 'x', 3, 1.2],
      [0, 0,  0, 2.5, 2, 'x', 4, 1.5],
      [0, 0,  5, 2.5, 2, 'x', 3, 1.0]
    ]
  },
  {
    name: "Chaos",
    start: { x: -8, y: 1.5, z: -8 },
    goal:  { x:  8, y: 1.5, z:  8 },
    platforms: [
      [-8, 0, -8, 3, 3],
      [-4, 0, -8, 2, 2],
      [ 0, 0, -6, 2, 2],
      [ 4, 0, -4, 2, 2],
      [ 8, 0,  8, 3, 3]
    ],
    moving: [
      [-4, 0, -2, 2, 2, 'x', 3, 1.8],
      [ 0, 0,  2, 2, 2, 'z', 3, 1.5],
      [ 4, 0,  4, 2, 2, 'x', 3, 2.0],
      [ 2, 0,  6, 2, 2, 'z', 2, 1.6]
    ]
  },
  {
    name: "Speed Runner",
    start: { x: 0, y: 1.5, z: -12 },
    goal:  { x: 0, y: 1.5, z:  12 },
    platforms: [
      [0, 0, -12, 3, 3],
      [2, 0, -8, 2, 2],
      [-2, 0, -5, 2, 2],
      [3, 0, -1, 2, 2],
      [-3, 0,  3, 2, 2],
      [2, 0,  7, 2, 2],
      [0, 0, 12, 3, 3]
    ],
    moving: [
      [-2, 0, -10, 2, 2, 'x', 4, 2.0],
      [0, 0, 0, 2, 2, 'z', 5, 1.8],
      [3, 0, 5, 2, 2, 'x', 3, 1.9]
    ]
  },
  {
    name: "The Gauntlet",
    start: { x: -10, y: 1.5, z: -10 },
    goal:  { x: 10, y: 1.5, z:  10 },
    platforms: [
      [-10, 0, -10, 3, 3],
      [-6, 0, -8, 2, 2],
      [-2, 0, -6, 2, 2],
      [2, 0, -4, 2, 2],
      [-4, 0, -2, 2, 2],
      [0, 0,  1, 2, 2],
      [4, 0,  3, 2, 2],
      [-2, 0,  6, 2, 2],
      [3, 0,  8, 2, 2],
      [10, 0, 10, 3, 3]
    ],
    moving: [
      [-8, 0, -4, 2, 2, 'x', 5, 1.5],
      [-1, 0,  0, 2, 2, 'z', 4, 1.7],
      [1, 0,   5, 2, 2, 'x', 4, 1.6],
      [6, 0,   6, 2, 2, 'z', 3, 1.8]
    ]
  }
];


// ── UI helpers ────────────────────────────────────────────────
function updateLivesUI() {
  var hearts = ['💀', '❤️', '❤️❤️', '❤️❤️❤️'];
  document.getElementById('lives-ui').textContent =
    hearts[Math.max(0, Math.min(3, livesCount))];
}


// ── Starfield background (drawn with Canvas 2D API) ───────────
function makeStarfieldBg() {
  var sz = 512;
  var c  = document.createElement('canvas');
  c.width = c.height = sz;
  var ctx = c.getContext('2d');

  // Deep space gradient
  var bg = ctx.createRadialGradient(sz/2, sz/2, 0, sz/2, sz/2, sz/2);
  bg.addColorStop(0,   '#0d0620');
  bg.addColorStop(0.5, '#070318');
  bg.addColorStop(1,   '#020108');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, sz, sz);

  // Nebula colour blobs
  var blobs = [
    [150, 180, 200, 'rgba(80,20,160,0.18)'],
    [380, 280, 160, 'rgba(20,80,200,0.14)'],
    [260, 350, 140, 'rgba(160,30,100,0.12)'],
    [80,  320, 120, 'rgba(30,120,180,0.10)'],
    [420, 100, 100, 'rgba(100,40,180,0.12)']
  ];
  blobs.forEach(function(b) {
    var g = ctx.createRadialGradient(b[0], b[1], 0, b[0], b[1], b[2]);
    g.addColorStop(0, b[3]);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, sz, sz);
  });

  // Stars — seeded random so they look the same every run
  var seed = 42;
  function rnd() { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }

  for (var i = 0; i < 900; i++) {
    var px     = rnd() * sz;
    var py     = rnd() * sz;
    var bright = 0.4 + rnd() * 0.6;
    var rad    = rnd() < 0.05 ? 1.5 : rnd() < 0.2 ? 1.0 : 0.5;
    var bv     = Math.round(bright * 255);
    ctx.beginPath();
    ctx.arc(px, py, rad, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(' + bv + ',' + bv + ',' + bv + ',' + bright.toFixed(2) + ')';
    ctx.fill();
  }

  // A few bright glint stars
  for (var j = 0; j < 10; j++) {
    var gx = rnd() * sz, gy = rnd() * sz;
    var gg = ctx.createRadialGradient(gx, gy, 0, gx, gy, 3);
    gg.addColorStop(0, 'rgba(255,255,255,0.9)');
    gg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gg;
    ctx.fillRect(gx - 4, gy - 4, 8, 8);
  }

  // Apply as CSS background so it shows through the transparent Babylon canvas
  document.body.style.backgroundImage = 'url(' + c.toDataURL() + ')';
  document.body.style.backgroundSize  = 'cover';
}


// ── Build the Babylon.js scene ────────────────────────────────
function buildScene() {
  try {
    // Clean up previous scene
    if (scene) { scene.dispose(); scene = null; }
    won = false; onGround = false; wantsJump = false; jumpCooldown = 0;
    movingPlatforms = []; cam = null; marble = null; marbleLight = null;

    var level = LEVELS[currentLevel];

    // Create scene with transparent background (starfield CSS shows through)
    scene = new BABYLON.Scene(engine);
    scene.clearColor = new BABYLON.Color4(0, 0, 0, 0);
    scene.enablePhysics(new BABYLON.Vector3(0, -20, 0), new BABYLON.CannonJSPlugin());

    // ── Lights ──────────────────────────────────────────────────
    var hemi = new BABYLON.HemisphericLight('hemi', new BABYLON.Vector3(0, 1, 0), scene);
    hemi.intensity   = 0.55;
    hemi.diffuse     = new BABYLON.Color3(0.7, 0.75, 1.0);
    hemi.groundColor = new BABYLON.Color3(0.08, 0.04, 0.15);
    hemi.specular    = new BABYLON.Color3(0, 0, 0);

    var rimLight = new BABYLON.PointLight('rim', new BABYLON.Vector3(-8, -3, -8), scene);
    rimLight.diffuse   = new BABYLON.Color3(0.4, 0.1, 0.8);
    rimLight.specular  = new BABYLON.Color3(0.2, 0.0, 0.4);
    rimLight.intensity = 0.5;
    rimLight.range     = 40;

    var dlight = new BABYLON.DirectionalLight('dlight', new BABYLON.Vector3(-1, -2, -1), scene);
    dlight.intensity = 1.0;
    dlight.diffuse   = new BABYLON.Color3(0.85, 0.9, 1.0);
    dlight.position  = new BABYLON.Vector3(10, 20, 10);

    var shadow = new BABYLON.ShadowGenerator(512, dlight);
    shadow.useBlurExponentialShadowMap = true;

    // ── Materials ────────────────────────────────────────────────
    var platMat = new BABYLON.StandardMaterial('platMat', scene);
    platMat.diffuseColor  = new BABYLON.Color3(0.08, 0.10, 0.22);
    platMat.specularColor = new BABYLON.Color3(0.5, 0.6, 1.0);
    platMat.specularPower = 32;
    platMat.emissiveColor = new BABYLON.Color3(0.02, 0.03, 0.10);

    var moveMat = new BABYLON.StandardMaterial('moveMat', scene);
    moveMat.diffuseColor  = new BABYLON.Color3(0.05, 0.12, 0.22);
    moveMat.specularColor = new BABYLON.Color3(0.3, 0.8, 1.0);
    moveMat.specularPower = 48;
    moveMat.emissiveColor = new BABYLON.Color3(0.0, 0.06, 0.18);

    var goalMat = new BABYLON.StandardMaterial('goalMat', scene);
    goalMat.diffuseColor  = new BABYLON.Color3(1.0, 0.8, 0.2);
    goalMat.emissiveColor = new BABYLON.Color3(0.9, 0.55, 0.0);

    // ── Platform helper ──────────────────────────────────────────
    function makePlatform(x, y, z, sx, sz, mat) {
      var p = BABYLON.MeshBuilder.CreateBox('platform', { width: sx, height: 0.5, depth: sz }, scene);
      p.position.set(x, y, z);
      p.material = mat || platMat;
      p.receiveShadows = true;
      shadow.addShadowCaster(p);
      p.physicsImpostor = new BABYLON.PhysicsImpostor(
        p, BABYLON.PhysicsImpostor.BoxImpostor,
        { mass: 0, restitution: 0.05, friction: 0.9 }, scene
      );
      return p;
    }

    // Static platforms
    level.platforms.forEach(function(d) {
      makePlatform(d[0], d[1], d[2], d[3], d[4]);
    });

    // Moving platforms
    level.moving.forEach(function(d) {
      var p = makePlatform(d[0], d[1], d[2], d[3], d[4], moveMat);
      movingPlatforms.push({
        mesh:   p,
        origin: new BABYLON.Vector3(d[0], d[1], d[2]),
        axis:   d[5],
        range:  d[6],
        speed:  d[7],
        t:      Math.random() * Math.PI * 2   // random start phase
      });
    });

    // ── Goal ─────────────────────────────────────────────────────
    goalMesh = BABYLON.MeshBuilder.CreateSphere('goal', { diameter: 1.2 }, scene);
    goalMesh.position.set(level.goal.x, level.goal.y + 0.2, level.goal.z);
    goalMesh.material   = goalMat;
    goalMesh.isPickable = false;

    ringMesh = BABYLON.MeshBuilder.CreateTorus(
      'ring', { diameter: 2.2, thickness: 0.1, tessellation: 32 }, scene);
    ringMesh.position.set(level.goal.x, level.goal.y, level.goal.z);
    ringMesh.rotation.x = Math.PI / 2;
    ringMesh.material   = goalMat;
    ringMesh.isPickable = false;

    ring2ref = BABYLON.MeshBuilder.CreateTorus(
      'ring2', { diameter: 3.0, thickness: 0.05, tessellation: 32 }, scene);
    ring2ref.position.set(level.goal.x, level.goal.y, level.goal.z);
    ring2ref.rotation.x = Math.PI / 3;
    ring2ref.material   = goalMat;
    ring2ref.isPickable = false;

    goalLightRef = new BABYLON.PointLight(
      'goalLight', new BABYLON.Vector3(level.goal.x, level.goal.y + 1, level.goal.z), scene);
    goalLightRef.diffuse   = new BABYLON.Color3(1.0, 0.7, 0.1);
    goalLightRef.specular  = new BABYLON.Color3(1.0, 0.5, 0.0);
    goalLightRef.intensity = 1.5;
    goalLightRef.range     = 8;

    // ── Marble ───────────────────────────────────────────────────
    marble = BABYLON.MeshBuilder.CreateSphere('marble', { diameter: 0.8, segments: 16 }, scene);
    marble.position.set(level.start.x, level.start.y, level.start.z);

    var marbleMat = new BABYLON.StandardMaterial('marbleMat', scene);
    marbleMat.diffuseColor  = new BABYLON.Color3(0.6, 0.82, 1.0);
    marbleMat.specularColor = new BABYLON.Color3(1, 1, 1);
    marbleMat.specularPower = 128;
    marbleMat.emissiveColor = new BABYLON.Color3(0.04, 0.10, 0.22);
    marble.material   = marbleMat;
    marble.isPickable = false;

    // Point light that follows the marble to illuminate nearby platforms
    marbleLight = new BABYLON.PointLight('marbleLight', marble.position.clone(), scene);
    marbleLight.diffuse   = new BABYLON.Color3(0.3, 0.6, 1.0);
    marbleLight.specular  = new BABYLON.Color3(0.2, 0.5, 1.0);
    marbleLight.intensity = 0.9;
    marbleLight.range     = 6;

    marble.physicsImpostor = new BABYLON.PhysicsImpostor(
      marble, BABYLON.PhysicsImpostor.SphereImpostor,
      { mass: 1, restitution: 0.05, friction: 0.8 }, scene
    );
    shadow.addShadowCaster(marble);

    // ── Camera ───────────────────────────────────────────────────
    cam = new BABYLON.ArcRotateCamera(
      'cam', -Math.PI / 2, Math.PI / 3.5, 18, marble.position.clone(), scene);
    cam.lowerRadiusLimit = 6;
    cam.upperRadiusLimit = 30;
    cam.upperBetaLimit   = Math.PI / 2.1;
    cam.lowerBetaLimit   = 0.15;
    cam.attachControl(canvas, true);
    // Remove keyboard input from camera so WASD controls the marble, not the camera
    cam.inputs.removeByType('ArcRotateCameraKeyboardMoveInput');

    // ── Game loop (runs every frame) ─────────────────────────────
    var FORCE       = 30;
    var JUMP_IMPULSE = 10;
    var MAX_HSPEED  = 12;

    scene.registerBeforeRender(function() {
      if (!marble || !timerRunning || won) return;

      var dt = engine.getDeltaTime() / 1000;

      // Keep camera locked onto marble
      cam.setTarget(marble.position);

      // Calculate camera-relative forward and right directions (ignore Y tilt)
      var fwd = marble.position.subtract(cam.position);
      fwd.y = 0;
      if (fwd.length() < 0.001) fwd = new BABYLON.Vector3(0, 0, 1);
      fwd.normalize();
      var right = BABYLON.Vector3.Cross(BABYLON.Vector3.Up(), fwd).normalize();

      // Apply movement force relative to camera direction
      var moveDir = BABYLON.Vector3.Zero();
      if (keys['ArrowUp']    || keys['w'] || keys['W']) moveDir.addInPlace(fwd);
      if (keys['ArrowDown']  || keys['s'] || keys['S']) moveDir.subtractInPlace(fwd);
      if (keys['ArrowRight'] || keys['d'] || keys['D']) moveDir.addInPlace(right);
      if (keys['ArrowLeft']  || keys['a'] || keys['A']) moveDir.subtractInPlace(right);

      if (moveDir.length() > 0.001) {
        moveDir.normalize().scaleInPlace(FORCE);
        marble.physicsImpostor.applyForce(moveDir, marble.getAbsolutePosition());
      }

      // Clamp horizontal speed (leave vertical/Y free for jumping & gravity)
      var vel = marble.physicsImpostor.getLinearVelocity();
      if (vel) {
        var hVel = new BABYLON.Vector3(vel.x, 0, vel.z);
        if (hVel.length() > MAX_HSPEED) {
          hVel.normalize().scaleInPlace(MAX_HSPEED);
          marble.physicsImpostor.setLinearVelocity(
            new BABYLON.Vector3(hVel.x, vel.y, hVel.z)
          );
        }
      }

      // Ground detection — short ray pointing downward from marble centre
      jumpCooldown = Math.max(0, jumpCooldown - dt);
      var ray = new BABYLON.Ray(marble.position, BABYLON.Vector3.Down(), 0.55);
      var hit = scene.pickWithRay(ray, function(m) {
        return m.isPickable && m !== marble;
      });
      onGround = (hit && hit.hit && jumpCooldown <= 0);

      // Jump — only when on ground
      if (wantsJump && onGround) {
        var v = marble.physicsImpostor.getLinearVelocity();
        marble.physicsImpostor.setLinearVelocity(
          new BABYLON.Vector3(v.x, JUMP_IMPULSE, v.z)
        );
        soundJump();
        jumpCooldown = 0.25;
        onGround = false;
      }
      wantsJump = false;

      // Animate moving platforms
      movingPlatforms.forEach(function(mp) {
        mp.t += dt * mp.speed;
        var offset = Math.sin(mp.t) * mp.range;
        if (mp.axis === 'x') mp.mesh.position.x = mp.origin.x + offset;
        else                  mp.mesh.position.z = mp.origin.z + offset;
        mp.mesh.physicsImpostor.setLinearVelocity(BABYLON.Vector3.Zero());
      });

      // Animate goal (pulse + spinning rings + flickering light)
      var pulse = 0.9 + 0.1 * Math.sin(Date.now() * 0.004);
      goalMesh.scaling.setAll(pulse);
      ringMesh.rotation.y  += dt * 1.5;
      ring2ref.rotation.y  -= dt * 1.0;
      ring2ref.rotation.z  += dt * 0.7;
      goalLightRef.intensity = 1.2 + 0.4 * Math.sin(Date.now() * 0.005);

      // Move marble light with the marble
      marbleLight.position.copyFrom(marble.position);

      // Check fell off the edge
      if (marble.position.y < -10) onFell();

      // Check reached the goal
      if (BABYLON.Vector3.Distance(marble.position, goalMesh.position) < 1.3) onWin();
    });

  } catch (e) {
    document.getElementById('err').textContent = 'Scene error: ' + e.message;
    console.error(e);
  }
}


// ── Game events ───────────────────────────────────────────────
function onFell() {
  if (!timerRunning) return;
  timerRunning = false;
  soundFail();
  livesCount--;
  updateLivesUI();

  var msg = document.getElementById('fell-msg');
  msg.classList.add('show');
  setTimeout(function() { msg.classList.remove('show'); }, 1400);

  if (livesCount <= 0) {
    // Game over
    livesCount = 3;
    timerVal = 0;
    document.getElementById('timer').textContent = '0.0';
    updateLivesUI();
    setTimeout(function() {
      document.getElementById('overlay-title').innerHTML = 'GAME<br>OVER';
      document.getElementById('overlay-sub').textContent = 'Try again?';
      document.getElementById('overlay-btn').textContent = 'Restart';
      document.getElementById('overlay-btn').onclick = function() {
        currentLevel = 0;
        startGame();
      };
      document.getElementById('overlay').classList.remove('hidden');
    }, 900);
  } else {
    setTimeout(restartLevel, 1000);
  }
}

function onWin() {
  if (won) return;
  won = true;
  timerRunning = false;
  clearInterval(timerInterval);
  soundWin();

  var isNewRecord = setHighScore(currentLevel, timerVal);
  var highScore = getHighScore(currentLevel);
  
  document.getElementById('win-time').textContent = timerVal.toFixed(1) + 's';
  if (isNewRecord) {
    document.getElementById('win-time').textContent += ' 🏆 NEW RECORD!';
  } else if (highScore) {
    document.getElementById('win-time').textContent += ' (Best: ' + highScore.toFixed(1) + 's)';
  }
  document.getElementById('win-overlay').classList.add('show');

  var winBtn = document.getElementById('win-btn');
  if (currentLevel + 1 >= LEVELS.length) {
    winBtn.textContent = 'Play again ↺';
    winBtn.onclick = function() { currentLevel = 0; startGame(); };
  } else {
    winBtn.textContent = 'Next level ›';
    winBtn.onclick = function() {
      currentLevel++;
      document.getElementById('win-overlay').classList.remove('show');
      startGame();
    };
  }
}


// ── Timer ─────────────────────────────────────────────────────
function startTimer() {
  clearInterval(timerInterval);
  timerRunning = true;
  timerInterval = setInterval(function() {
    if (timerRunning) {
      timerVal = Math.round((timerVal + 0.1) * 10) / 10;
      document.getElementById('timer').textContent = timerVal.toFixed(1);
    }
  }, 100);
}


// ── Start / restart ───────────────────────────────────────────
function startGame() {
  document.getElementById('overlay').classList.add('hidden');
  document.getElementById('win-overlay').classList.remove('show');
  livesCount = 3;
  timerVal   = 0;
  updateLivesUI();
  document.getElementById('timer').textContent    = '0.0';
  document.getElementById('level-num').textContent = currentLevel + 1;
  buildScene();
  startTimer();
}

function restartLevel() {
  timerVal = 0;
  document.getElementById('timer').textContent = '0.0';
  document.getElementById('win-overlay').classList.remove('show');
  buildScene();
  startTimer();
}


// ── Keyboard input ────────────────────────────────────────────
window.addEventListener('keydown', function(e) {
  if (e.key === ' ') e.preventDefault(); // stop space from scrolling page
  keys[e.key] = true;
  if (e.key === ' ')                      wantsJump = true;
  if (e.key === 'r' || e.key === 'R')     restartLevel();
});
window.addEventListener('keyup', function(e) {
  keys[e.key] = false;
});
window.addEventListener('resize', function() {
  if (engine) engine.resize();
});


// ── Jump button (mouse + touch) ───────────────────────────────
var jumpBtn = document.getElementById('jump-btn');
jumpBtn.addEventListener('mousedown', function() {
  wantsJump = true;
});
jumpBtn.addEventListener('touchstart', function(e) {
  e.preventDefault();
  wantsJump = true;
}, { passive: false });


// ── Boot ──────────────────────────────────────────────────────
window.addEventListener('load', function() {
  makeStarfieldBg();

  engine = new BABYLON.Engine(canvas, true, {
    preserveDrawingBuffer: true,
    stencil: true
  });

  document.getElementById('overlay-btn').onclick = startGame;

  // Render loop — runs at screen refresh rate (~60fps)
  engine.runRenderLoop(function() {
    if (scene) scene.render();
  });
});
