// 3D Space Arena Shooter
class SpaceArena {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        
        // Game state
        this.player = null;
        this.asteroids = [];
        this.otherPlayers = {};
        this.bots = []; // AI bots
        this.socket = null;
        this.playerId = null;
        this.selectedMap = 'nebula'; // Default map
        
        // Player stats
        this.playerHealth = 100;
        this.playerMaxHealth = 100;
        this.playerVelocity = null;
        this.kills = 0; // Track kills for health regeneration
        
        // Controls
        this.keys = { w: false, a: false, s: false, d: false, q: false, e: false, space: false };
        this.mouseX = 0;
        this.mouseY = 0;
        this.isPointerLocked = false;
        this.isMenuOpen = false;
        
        // Shooting
        this.canShoot = true;
        this.shootCooldown = 300;
        this.lastShotTime = 0;
        this.raycaster = new THREE.Raycaster();
        
        // Continuous firing
        this.isShooting = false;
        this.shootInterval = null;
        this.rapidFireCooldown = 200; // Faster firing for continuous mode
        
        // Bot respawning
        this.botRespawnTime = 3000; // 3 seconds (was 5 seconds)
        this.deadBots = []; // Track dead bots for respawning
        
        // Game pause system
        this.isGamePaused = false;
        
        // Game start delay system
        this.gameStartTime = null;
        this.botDelayTime = 5000; // 5 seconds delay before bots become aggressive
        this.botsAreActive = false;
        
        // Loading
        this.loadingManager = new THREE.LoadingManager();
        this.loadingProgress = 0;
        this.totalAssets = 0;
        this.loadedAssets = 0;
        
        this.init();
    }
    
    // MAP SELECTOR METHODS (COMMENTED OUT - can be restored later)
    /*
    setupMapSelector() {
        const mapCards = document.querySelectorAll('.map-card');
        const startBtn = document.getElementById('start-game-btn');
        const selectedMapName = document.getElementById('selected-map-name');
        const selectedMapDesc = document.getElementById('selected-map-description');
        
        // Map descriptions
        const mapDescriptions = {
            nebula: {
                name: 'Nebula Fields',
                description: 'Fight among colorful cosmic clouds and distant stars. The nebula provides cover and creates a mystical atmosphere for intense space battles.'
            },
            asteroid: {
                name: 'Asteroid Belt',
                description: 'Navigate through a dense field of asteroids and space debris. Use the rocks as cover and watch out for floating obstacles.'
            },
            planetary: {
                name: 'Planetary Rings',
                description: 'Battle around a massive planet with spectacular rings. The gravitational pull affects movement and creates unique tactical opportunities.'
            },
            void: {
                name: 'Deep Void',
                description: 'Face the infinite darkness of space with distant galaxies as your backdrop. Minimal cover makes for intense, fast-paced combat.'
            }
        };
        
        mapCards.forEach(card => {
            card.addEventListener('click', () => {
                // Remove previous selection
                mapCards.forEach(c => c.classList.remove('selected'));
                
                // Select current card
                card.classList.add('selected');
                
                // Update selected map
                this.selectedMap = card.dataset.map;
                console.log('Map selected:', this.selectedMap);
                
                // Update info
                const mapInfo = mapDescriptions[this.selectedMap];
                selectedMapName.textContent = mapInfo.name;
                selectedMapDesc.textContent = mapInfo.description;
                
                // Enable start button
                startBtn.disabled = false;
            });
        });
        
        startBtn.addEventListener('click', () => {
            console.log('Starting game with map:', this.selectedMap);
            this.hideMapSelector();
            
            // Request fullscreen
            this.requestFullscreen();
            
            this.init();
        });
        
        // Auto-select first map
        mapCards[0].click();
    }
    
    hideMapSelector() {
        console.log('Hiding map selector...');
        const mapSelector = document.getElementById('map-selector');
        if (mapSelector) {
            mapSelector.classList.add('hidden');
            setTimeout(() => {
                mapSelector.style.display = 'none';
                console.log('Map selector hidden');
            }, 500);
        } else {
            console.error('Map selector element not found!');
        }
    }
    
    requestFullscreen() {
        const canvas = this.canvas;
        
        // Cross-browser fullscreen support
        if (canvas.requestFullscreen) {
            canvas.requestFullscreen();
        } else if (canvas.webkitRequestFullscreen) { // Safari
            canvas.webkitRequestFullscreen();
        } else if (canvas.msRequestFullscreen) { // IE/Edge
            canvas.msRequestFullscreen();
        } else if (canvas.mozRequestFullScreen) { // Firefox
            canvas.mozRequestFullScreen();
        }
        
        // Update renderer size after fullscreen
        setTimeout(() => {
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
        }, 100);
    }
    */
    
    init() {
        console.log('Game initialization started...');
        this.setupLoadingManager();
        this.createStarryBackground();
        this.setupLighting();
        this.createSpaceEnvironment();
        this.setupControls();
        this.setupWebSocket();
        this.setupGameMenu();
        this.setupInstructionsPopup();
        this.animate();
        
        // Hide loading screen after initialization is complete
        setTimeout(() => {
            this.hideLoadingScreen();
            console.log('Game initialization complete');
            
            // Set game start time
            this.gameStartTime = Date.now();
            console.log('Game start time set:', this.gameStartTime);
            
            // Show instructions popup after a short delay
            setTimeout(() => {
                this.showInstructionsPopup();
            }, 500);
        }, 1000);
    }
    
    setupLoadingManager() {
        this.loadingManager.onProgress = (url, loaded, total) => {
            this.loadedAssets = loaded;
            this.totalAssets = total;
            this.updateLoadingProgress();
        };
        
        this.loadingManager.onLoad = () => {
            this.hideLoadingScreen();
        };
        
        this.loadingManager.onError = (url) => {
            console.error('Error loading:', url);
        };
        
        // Fallback: Hide loading screen after 2 seconds if no assets are loaded
        setTimeout(() => {
            if (this.totalAssets === 0) {
                console.log('No external assets to load, hiding loading screen');
                this.hideLoadingScreen();
            }
        }, 2000);
    }
    
    updateLoadingProgress() {
        const progress = (this.loadedAssets / this.totalAssets) * 100;
        const progressBar = document.querySelector('.loading-progress');
        const loadingText = document.getElementById('loading-text');
        
        if (progressBar) {
            progressBar.style.width = `${progress}%`;
        }
        
        if (loadingText) {
            loadingText.textContent = `Loading assets... ${Math.round(progress)}%`;
        }
    }
    
    hideLoadingScreen() {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.classList.add('hidden');
            setTimeout(() => {
                loadingScreen.style.display = 'none';
            }, 500);
        }
    }
    
    createStarryBackground() {
        // Create starfield
        const starGeometry = new THREE.BufferGeometry();
        const starCount = 10000;
        const positions = new Float32Array(starCount * 3);
        const colors = new Float32Array(starCount * 3);
        
        for (let i = 0; i < starCount * 3; i += 3) {
            // Random positions in a large sphere
            const radius = 500 + Math.random() * 500;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(Math.random() * 2 - 1);
            
            positions[i] = radius * Math.sin(phi) * Math.cos(theta);
            positions[i + 1] = radius * Math.sin(phi) * Math.sin(theta);
            positions[i + 2] = radius * Math.cos(phi);
            
            // Random star colors (white to blue)
            const color = new THREE.Color();
            color.setHSL(0.6 + Math.random() * 0.1, 0.5, 0.8 + Math.random() * 0.2);
            colors[i] = color.r;
            colors[i + 1] = color.g;
            colors[i + 2] = color.b;
        }
        
        starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        starGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        
        const starMaterial = new THREE.PointsMaterial({
            size: 1,
            vertexColors: true,
            transparent: true,
            opacity: 0.8
        });
        
        const stars = new THREE.Points(starGeometry, starMaterial);
        this.scene.add(stars);
    }
    
    setupLighting() {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0x404040, 0.3);
        this.scene.add(ambientLight);
        
        // Directional light (sun)
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(100, 100, 50);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        this.scene.add(directionalLight);
        
        // Point lights for space atmosphere
        const pointLight1 = new THREE.PointLight(0x4a9eff, 0.5, 100);
        pointLight1.position.set(-50, 30, 50);
        this.scene.add(pointLight1);
        
        const pointLight2 = new THREE.PointLight(0xff6b6b, 0.3, 80);
        pointLight2.position.set(50, -20, -30);
        this.scene.add(pointLight2);
    }
    
    createSpaceEnvironment() {
        console.log('Creating basic space environment...');
        
        // Create nebula clouds
        this.createNebulaClouds();
        
        // Create distant planet
        this.createDistantPlanet();
        
        // Create asteroids
        this.createAsteroids(15);
        
        // Create AI bots
        this.createBots(5);
        
        // Create player spaceship
        this.createPlayerSpaceship();
        
        // Force a render to ensure everything is visible
        this.renderer.render(this.scene, this.camera);
        console.log('Space environment created successfully');
    }
    
    createNebulaClouds() {
        // Create multiple colorful nebula clouds
        const nebulaColors = [0x4a9eff, 0x8b5cf6, 0xec4899, 0xf59e0b, 0x10b981];
        
        for (let i = 0; i < 5; i++) {
            const nebulaGeometry = new THREE.SphereGeometry(100 + Math.random() * 100, 32, 32);
            const nebulaMaterial = new THREE.MeshBasicMaterial({
                color: nebulaColors[i % nebulaColors.length],
                transparent: true,
                opacity: 0.1
            });
            const nebula = new THREE.Mesh(nebulaGeometry, nebulaMaterial);
            
            // Random position
            nebula.position.set(
                (Math.random() - 0.5) * 1000,
                (Math.random() - 0.5) * 1000,
                (Math.random() - 0.5) * 1000
            );
            
            this.scene.add(nebula);
            
            // Animate nebula
            const animateNebula = () => {
                nebula.rotation.y += 0.001;
                nebula.rotation.z += 0.0005;
                requestAnimationFrame(animateNebula);
            };
            animateNebula();
        }
    }
    
    createDistantPlanet() {
        const planetGeometry = new THREE.SphereGeometry(50, 32, 32);
        const planetMaterial = new THREE.MeshPhongMaterial({
            color: 0x8b4513,
            shininess: 30
        });
        const planet = new THREE.Mesh(planetGeometry, planetMaterial);
        planet.position.set(200, 100, -300);
        this.scene.add(planet);
        
        // Animate planet rotation
        const animatePlanet = () => {
            planet.rotation.y += 0.005;
            requestAnimationFrame(animatePlanet);
        };
        animatePlanet();
    }
    
    createAsteroids(count = 15) {
        for (let i = 0; i < count; i++) {
            const size = 2 + Math.random() * 8;
            const geometry = new THREE.DodecahedronGeometry(size);
            const material = new THREE.MeshPhongMaterial({
                color: 0x666666,
                shininess: 10
            });
            const asteroid = new THREE.Mesh(geometry, material);
            
            // Random position
            asteroid.position.set(
                (Math.random() - 0.5) * 200,
                (Math.random() - 0.5) * 200,
                (Math.random() - 0.5) * 200
            );
            
            // Random rotation speed
            asteroid.userData.rotationSpeed = {
                x: (Math.random() - 0.5) * 0.02,
                y: (Math.random() - 0.5) * 0.02,
                z: (Math.random() - 0.5) * 0.02
            };
            
            this.scene.add(asteroid);
            this.asteroids.push(asteroid);
        }
    }
    
    createPlayerSpaceship() {
        // Create player spaceship
        const group = new THREE.Group();
        
        // Main body
        const bodyGeometry = new THREE.ConeGeometry(2, 8, 8);
        const bodyMaterial = new THREE.MeshPhongMaterial({ color: 0x4a9eff });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.rotation.x = Math.PI / 2;
        group.add(body);
        
        // Wings
        const wingGeometry = new THREE.BoxGeometry(8, 0.5, 3);
        const wingMaterial = new THREE.MeshPhongMaterial({ color: 0x2d5aa0 });
        const leftWing = new THREE.Mesh(wingGeometry, wingMaterial);
        const rightWing = new THREE.Mesh(wingGeometry, wingMaterial);
        
        leftWing.position.set(-4, 0, 0);
        rightWing.position.set(4, 0, 0);
        group.add(leftWing);
        group.add(rightWing);
        
        // Engine effect
        this.createEngineEffect(group);
        
        group.position.set(0, 0, 0);
        this.player = group;
        this.scene.add(group);
    }
    
    createEngineEffect(spaceship) {
        // Create engine particle effect
        const particles = new THREE.BufferGeometry();
        const particleCount = 50;
        const positions = new Float32Array(particleCount * 3);
        const velocities = [];
        
        for (let i = 0; i < particleCount * 3; i += 3) {
            positions[i] = (Math.random() - 0.5) * 2; // x
            positions[i + 1] = -4; // y (behind spaceship)
            positions[i + 2] = (Math.random() - 0.5) * 2; // z
            
            velocities.push({
                x: (Math.random() - 0.5) * 0.1,
                y: -0.1 - Math.random() * 0.1,
                z: (Math.random() - 0.5) * 0.1
            });
        }
        
        particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        
        const particleMaterial = new THREE.PointsMaterial({
            color: 0x00ffff,
            size: 0.5,
            transparent: true,
            opacity: 0.8
        });
        
        const particleSystem = new THREE.Points(particles, particleMaterial);
        spaceship.add(particleSystem);
        
        // Store for animation
        this.engineParticles = {
            system: particleSystem,
            velocities: velocities,
            positions: positions
        };
    }
    
    setupControls() {
        // Keyboard controls
        document.addEventListener('keydown', (event) => {
            console.log('Key pressed:', event.code, event.key); // Debug log
            switch(event.code) {
                case 'KeyW': this.keys.w = true; break;
                case 'KeyA': this.keys.a = true; break;
                case 'KeyS': this.keys.s = true; break;
                case 'KeyD': this.keys.d = true; break;
                case 'KeyQ': this.keys.q = true; break;
                case 'KeyE': this.keys.e = true; break;
                case 'Space': 
                    this.keys.space = true;
                    this.startContinuousFiring();
                    break;
                case 'ControlLeft':
                case 'ControlRight':
                    // Toggle game menu on Ctrl key (permanent)
                    // alert('Ctrl key pressed! Menu state: ' + this.isMenuOpen); // Commented out alert
                    console.log('Ctrl key pressed, menu state:', this.isMenuOpen);
                    if (this.isMenuOpen) {
                        console.log('Attempting to hide menu...');
                        this.hideGameMenu();
                    } else {
                        console.log('Attempting to show menu...');
                        this.showGameMenu();
                    }
                    break;
            }
        });
        
        document.addEventListener('keyup', (event) => {
            switch(event.code) {
                case 'KeyW': this.keys.w = false; break;
                case 'KeyA': this.keys.a = false; break;
                case 'KeyS': this.keys.s = false; break;
                case 'KeyD': this.keys.d = false; break;
                case 'KeyQ': this.keys.q = false; break;
                case 'KeyE': this.keys.e = false; break;
                case 'Space': 
                    this.keys.space = false; 
                    this.stopContinuousFiring();
                    break;
            }
        });
        
        // Mouse controls
        document.addEventListener('mousemove', (event) => {
            if (this.isPointerLocked) {
                // Standard PC game mouse sensitivity (similar to CS:GO, Valorant, etc.)
                this.mouseX -= event.movementX * 0.0015; // Adjusted sensitivity for natural feel
                this.mouseY -= event.movementY * 0.0015; // Same sensitivity for consistency
                this.mouseY = Math.max(-Math.PI/2, Math.min(Math.PI/2, this.mouseY));
            }
        });
        
        // Mouse controls for continuous firing
        document.addEventListener('mousedown', (event) => {
            if (this.isPointerLocked && event.button === 0) { // Left mouse button
                this.startContinuousFiring();
            }
        });
        
        document.addEventListener('mouseup', (event) => {
            if (event.button === 0) { // Left mouse button
                this.stopContinuousFiring();
            }
        });
        
        // Keep the original click event for single shots
        document.addEventListener('click', (event) => {
            if (this.isPointerLocked && !this.isShooting) {
                this.shoot();
            }
        });
        
        // Pointer lock
        this.canvas.addEventListener('click', () => {
            this.canvas.requestPointerLock();
        });
        
        document.addEventListener('pointerlockchange', () => {
            this.isPointerLocked = document.pointerLockElement === this.canvas;
        });
        
        // Fullscreen change events
        document.addEventListener('fullscreenchange', () => this.handleFullscreenChange());
        document.addEventListener('webkitfullscreenchange', () => this.handleFullscreenChange());
        document.addEventListener('mozfullscreenchange', () => this.handleFullscreenChange());
        document.addEventListener('MSFullscreenChange', () => this.handleFullscreenChange());
        
        // Window resize
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
        
        // Test buttons
        const testMenuBtn = document.getElementById('test-menu-btn');
        if (testMenuBtn) {
            testMenuBtn.addEventListener('click', () => {
                console.log('Test menu button clicked');
                this.showGameMenu();
            });
        }
        
        const testPauseBtn = document.getElementById('test-pause-btn');
        if (testPauseBtn) {
            testPauseBtn.addEventListener('click', () => {
                console.log('Test pause button clicked');
                this.togglePause();
            });
        }
        
        const testKillBotBtn = document.getElementById('test-kill-bot-btn');
        if (testKillBotBtn) {
            testKillBotBtn.addEventListener('click', () => {
                console.log('Test kill bot button clicked');
                this.forceKillBot();
            });
        }
        
        const testBotInfoBtn = document.getElementById('test-bot-info-btn');
        if (testBotInfoBtn) {
            testBotInfoBtn.addEventListener('click', () => {
                console.log('Test bot info button clicked');
                this.showBotInfo();
            });
        }
    }
    
    setupWebSocket() {
        this.socket = io('http://localhost:5000');
        
        this.socket.on('connect', () => {
            console.log('Connected to server');
            this.playerId = this.socket.id;
        });
        
        this.socket.on('game_state', (data) => {
            console.log('Received game state:', data);
            // Handle other players
        });
        
        this.socket.on('player_joined', (data) => {
            console.log('Player joined:', data);
            this.addOtherPlayer(data.player.id, data.player);
        });
        
        this.socket.on('player_left', (data) => {
            console.log('Player left:', data);
            this.removeOtherPlayer(data.player_id);
        });
        
        this.socket.on('player_moved', (data) => {
            this.updateOtherPlayerPosition(data.player_id, data.position);
        });
        
        this.socket.on('player_shot', (data) => {
            this.createShotEffect(data.ray_data.origin, data.ray_data.direction, data.hit_data);
        });
        
        this.socket.on('shot_hit', (data) => {
            this.createHitEffect(data.hit_position);
        });
    }
    
    addOtherPlayer(id, playerData) {
        // Create other player spaceship (different color)
        const group = new THREE.Group();
        
        const bodyGeometry = new THREE.ConeGeometry(2, 8, 8);
        const bodyMaterial = new THREE.MeshPhongMaterial({ color: 0xff6600 });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.rotation.x = Math.PI / 2;
        group.add(body);
        
        group.position.set(playerData.x, playerData.y, playerData.z);
        group.userData = { id: id, health: playerData.health };
        
        this.scene.add(group);
        this.otherPlayers[id] = group;
    }
    
    removeOtherPlayer(id) {
        if (this.otherPlayers[id]) {
            this.scene.remove(this.otherPlayers[id]);
            delete this.otherPlayers[id];
        }
    }
    
    updateOtherPlayerPosition(id, position) {
        if (this.otherPlayers[id]) {
            this.otherPlayers[id].position.set(position.x, position.y, position.z);
            this.otherPlayers[id].rotation.y = position.rotation || 0;
        }
    }
    
    shoot() {
        if (!this.canShoot) return;
        
        const currentTime = Date.now();
        const cooldown = this.isShooting ? this.rapidFireCooldown : this.shootCooldown;
        
        if (currentTime - this.lastShotTime < cooldown) return;
        
        this.lastShotTime = currentTime;
        
        // Visual feedback - flash the spaceship
        if (this.player) {
            this.player.children.forEach(child => {
                if (child.material) {
                    const originalColor = child.material.color.clone();
                    child.material.color.setHex(0xffff00);
                    setTimeout(() => {
                        child.material.color.copy(originalColor);
                    }, 100);
                }
            });
        }
        
        // Calculate ray from camera
        const rayOrigin = this.camera.position.clone();
        const rayDirection = new THREE.Vector3(0, 0, -1);
        rayDirection.unproject(this.camera);
        rayDirection.sub(this.camera.position).normalize();
        
        // Check for bot hits with improved detection
        let hitBot = null;
        let hitDistance = 150;
        
        console.log('Checking for bot hits. Total bots:', this.bots.length);
        
        this.bots.forEach((bot, index) => {
            if (bot.userData && bot.userData.health > 0) {
                console.log(`Checking bot ${index}, health: ${bot.userData.health}, position:`, bot.position);
                
                // Calculate distance from camera to bot
                const distanceToBot = this.camera.position.distanceTo(bot.position);
                console.log(`Distance to bot ${index}: ${distanceToBot}`);
                
                // Method 1: Sphere intersection (original)
                const botSphere = new THREE.Sphere(bot.position, 5); // Increased radius to 5
                const ray = new THREE.Ray(rayOrigin, rayDirection);
                const intersection = ray.intersectSphere(botSphere);
                
                if (intersection && intersection.distance < hitDistance) {
                    console.log(`Bot ${index} hit by sphere intersection at distance: ${intersection.distance}`);
                    hitDistance = intersection.distance;
                    hitBot = bot;
                }
                
                // Method 2: Distance-based hit detection (backup)
                const rayEndPoint = rayOrigin.clone().add(rayDirection.clone().multiplyScalar(100));
                const rayDirectionNormalized = rayDirection.clone().normalize();
                
                // Calculate closest point on ray to bot
                const t = bot.position.clone().sub(rayOrigin).dot(rayDirectionNormalized);
                const closestPointOnRay = rayOrigin.clone().add(rayDirectionNormalized.clone().multiplyScalar(t));
                
                const distanceFromRayToBot = closestPointOnRay.distanceTo(bot.position);
                console.log(`Distance from ray to bot ${index}: ${distanceFromRayToBot}`);
                
                if (distanceFromRayToBot < 8 && distanceToBot < 100 && !hitBot) { // Within 8 units of ray and 100 units away
                    console.log(`Bot ${index} hit by distance detection!`);
                    hitDistance = distanceToBot;
                    hitBot = bot;
                }
            }
        });
        
        // Send shoot event (only if socket exists)
        if (this.socket) {
            this.socket.emit('shoot', {
                origin: { x: rayOrigin.x, y: rayOrigin.y, z: rayOrigin.z },
                direction: { x: rayDirection.x, y: rayDirection.y, z: rayDirection.z },
                player_position: {
                    x: this.player.position.x,
                    y: this.player.position.y,
                    z: this.player.position.z
                }
            });
        }
        
        // Create local shot effect with hit detection
        this.createShotEffect(
            { x: rayOrigin.x, y: rayOrigin.y, z: rayOrigin.z },
            { x: rayDirection.x, y: rayDirection.y, z: rayDirection.z },
            { hit: !!hitBot, distance: hitDistance }
        );
        
        // Handle bot hit
        if (hitBot) {
            console.log('Killing bot!');
            this.killBot(hitBot);
        }
        
        // Update ammo counter (if it exists)
        const ammoCounter = document.getElementById('ammo-counter');
        if (ammoCounter) {
            ammoCounter.textContent = 'Ammo: ∞ (Ready)';
            ammoCounter.style.color = '#ff4444';
            setTimeout(() => {
                ammoCounter.style.color = '#4a9eff';
            }, 200);
        }
    }
    
    createShotEffect(origin, direction, hitData) {
        // Create shot with trail effect
        const shotGeometry = new THREE.SphereGeometry(0.15, 8, 8);
        const shotMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xffff00,
            transparent: true,
            opacity: 0.9
        });
        const shot = new THREE.Mesh(shotGeometry, shotMaterial);
        
        shot.position.set(origin.x, origin.y, origin.z);
        this.scene.add(shot);
        
        // Create trail effect
        const trailGeometry = new THREE.BufferGeometry();
        const trailCount = 10;
        const trailPositions = new Float32Array(trailCount * 3);
        const trailMaterial = new THREE.PointsMaterial({
            color: 0xffff00,
            size: 0.3,
            transparent: true,
            opacity: 0.6
        });
        
        for (let i = 0; i < trailCount; i++) {
            trailPositions[i * 3] = origin.x - direction.x * i * 0.5;
            trailPositions[i * 3 + 1] = origin.y - direction.y * i * 0.5;
            trailPositions[i * 3 + 2] = origin.z - direction.z * i * 0.5;
        }
        
        trailGeometry.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
        const trail = new THREE.Points(trailGeometry, trailMaterial);
        this.scene.add(trail);
        
        // Animate shot with improved physics
        const distance = hitData.hit ? hitData.distance : 150;
        const duration = 800; // Slightly longer for more dramatic effect
        const startTime = Date.now();
        
        const animateShot = () => {
            const elapsed = Date.now() - startTime;
            const progress = elapsed / duration;
            
            if (progress < 1) {
                // Update shot position
                shot.position.x = origin.x + direction.x * distance * progress;
                shot.position.y = origin.y + direction.y * distance * progress;
                shot.position.z = origin.z + direction.z * distance * progress;
                
                // Update trail
                const trailPositions = trail.geometry.attributes.position.array;
                for (let i = 0; i < trailCount; i++) {
                    const trailProgress = Math.max(0, progress - i * 0.1);
                    trailPositions[i * 3] = origin.x + direction.x * distance * trailProgress;
                    trailPositions[i * 3 + 1] = origin.y + direction.y * distance * trailProgress;
                    trailPositions[i * 3 + 2] = origin.z + direction.z * distance * trailProgress;
                }
                trail.geometry.attributes.position.needsUpdate = true;
                
                // Fade out trail
                trail.material.opacity = 0.6 * (1 - progress);
                
                requestAnimationFrame(animateShot);
            } else {
                // Clean up
                this.scene.remove(shot);
                this.scene.remove(trail);
            }
        };
        
        animateShot();
    }
    
    createHitEffect(hitPosition) {
        // Create explosion effect
        const explosionGeometry = new THREE.SphereGeometry(1, 16, 16);
        const explosionMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xff6600,
            transparent: true,
            opacity: 0.8
        });
        const explosion = new THREE.Mesh(explosionGeometry, explosionMaterial);
        
        explosion.position.set(hitPosition.x, hitPosition.y, hitPosition.z);
        this.scene.add(explosion);
        
        // Create particle burst
        const particleCount = 20;
        const particles = [];
        
        for (let i = 0; i < particleCount; i++) {
            const particleGeometry = new THREE.SphereGeometry(0.1, 4, 4);
            const particleMaterial = new THREE.MeshBasicMaterial({
                color: new THREE.Color().setHSL(Math.random() * 0.1, 1, 0.5),
                transparent: true,
                opacity: 0.8
            });
            const particle = new THREE.Mesh(particleGeometry, particleMaterial);
            
            particle.position.copy(explosion.position);
            particle.userData.velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 2,
                (Math.random() - 0.5) * 2,
                (Math.random() - 0.5) * 2
            );
            
            this.scene.add(particle);
            particles.push(particle);
        }
        
        // Animate explosion
        const startTime = Date.now();
        const duration = 500;
        
        const animateExplosion = () => {
            const elapsed = Date.now() - startTime;
            const progress = elapsed / duration;
            
            if (progress < 1) {
                // Animate explosion sphere
                explosion.scale.setScalar(1 + progress * 3);
                explosion.material.opacity = 0.8 * (1 - progress);
                
                // Animate particles
                particles.forEach(particle => {
                    particle.position.add(particle.userData.velocity);
                    particle.userData.velocity.multiplyScalar(0.98); // Air resistance
                    particle.material.opacity = 0.8 * (1 - progress);
                    particle.scale.setScalar(1 - progress * 0.5);
                });
                
                requestAnimationFrame(animateExplosion);
            } else {
                // Clean up
                this.scene.remove(explosion);
                particles.forEach(particle => {
                    this.scene.remove(particle);
                });
            }
        };
        
        animateExplosion();
    }
    
    updatePlayerMovement() {
        if (!this.player) return;
        
        // Improved movement with acceleration and deceleration
        const maxSpeed = 1.2; // Maximum speed
        const acceleration = 0.08; // How fast to reach max speed
        const deceleration = 0.95; // How fast to slow down
        
        // Calculate movement direction
        const forward = new THREE.Vector3(0, 0, -1);
        const right = new THREE.Vector3(1, 0, 0);
        const up = new THREE.Vector3(0, 1, 0);
        
        forward.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.mouseX);
        right.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.mouseX);
        
        const movement = new THREE.Vector3(0, 0, 0);
        
        if (this.keys.w) movement.add(forward);
        if (this.keys.s) movement.sub(forward);
        if (this.keys.d) movement.add(right);
        if (this.keys.a) movement.sub(right);
        if (this.keys.e) movement.add(up); // Move up
        if (this.keys.q) movement.sub(up); // Move down
        
        // Apply movement with physics
        if (movement.length() > 0) {
            movement.normalize();
            
            // Apply acceleration
            if (!this.playerVelocity) this.playerVelocity = new THREE.Vector3();
            this.playerVelocity.add(movement.multiplyScalar(acceleration));
            
            // Limit maximum speed
            if (this.playerVelocity.length() > maxSpeed) {
                this.playerVelocity.normalize().multiplyScalar(maxSpeed);
            }
        } else {
            // Apply deceleration when no keys are pressed
            if (this.playerVelocity) {
                this.playerVelocity.multiplyScalar(deceleration);
                
                // Stop completely if moving very slowly
                if (this.playerVelocity.length() < 0.01) {
                    this.playerVelocity.set(0, 0, 0);
                }
            }
        }
        
        // Apply velocity to position
        if (this.playerVelocity) {
            this.player.position.add(this.playerVelocity);
            
            // Send position update
            if (this.socket) {
                this.socket.emit('player_move', {
                    x: this.player.position.x,
                    y: this.player.position.y,
                    z: this.player.position.z,
                    rotation: this.mouseX
                });
            }
        }
    }
    
    updateCamera() {
        if (!this.player) return;
        
        // Third-person camera with full 3D rotation
        const cameraDistance = 15;
        const cameraHeight = 5;
        
        // Calculate camera position based on mouse rotation
        const cameraOffset = new THREE.Vector3(
            Math.sin(this.mouseX) * cameraDistance,
            cameraHeight - Math.sin(this.mouseY) * cameraDistance * 0.5, // Inverted vertical rotation
            Math.cos(this.mouseX) * cameraDistance
        );
        
        this.camera.position.copy(this.player.position).add(cameraOffset);
        
        // Look at player with slight offset for better feel
        const lookAtPoint = this.player.position.clone();
        lookAtPoint.y += 2; // Look slightly above the player
        this.camera.lookAt(lookAtPoint);
    }
    
    updateEngineEffect() {
        if (!this.engineParticles) return;
        
        const positions = this.engineParticles.positions;
        const velocities = this.engineParticles.velocities;
        
        for (let i = 0; i < positions.length; i += 3) {
            // Update particle positions
            positions[i] += velocities[i/3].x;
            positions[i + 1] += velocities[i/3].y;
            positions[i + 2] += velocities[i/3].z;
            
            // Reset particles that go too far
            if (positions[i + 1] < -10) {
                positions[i] = 0;
                positions[i + 1] = -4;
                positions[i + 2] = 0;
            }
        }
        
        this.engineParticles.system.geometry.attributes.position.needsUpdate = true;
    }
    
    updateAsteroids() {
        this.asteroids.forEach(asteroid => {
            const speed = asteroid.userData.rotationSpeed;
            asteroid.rotation.x += speed.x;
            asteroid.rotation.y += speed.y;
            asteroid.rotation.z += speed.z;
            
            // Check collision with player
            if (this.player) {
                const distance = this.player.position.distanceTo(asteroid.position);
                const collisionDistance = 5; // Asteroid radius + player radius
                
                if (distance < collisionDistance) {
                    // Player hit by asteroid
                    this.takeDamage(10);
                    
                    // Push player away from asteroid
                    const pushDirection = new THREE.Vector3()
                        .subVectors(this.player.position, asteroid.position)
                        .normalize();
                    this.playerVelocity.add(pushDirection.multiplyScalar(2));
                    
                    // Visual feedback
                    this.player.children.forEach(child => {
                        if (child.material) {
                            const originalColor = child.material.color.clone();
                            child.material.color.setHex(0xff0000);
                            setTimeout(() => {
                                child.material.color.copy(originalColor);
                            }, 300);
                        }
                    });
                }
            }
        });
    }
    
    updateBots() {
        // Don't update bots if game is paused
        if (this.isGamePaused) {
            console.log('Game is paused, bots not updating');
            return;
        }
        
        // Don't allow bots to attack if they're not active yet
        if (!this.botsAreActive) {
            console.log('Bots not active yet, only basic movement allowed');
            // Allow basic movement but no attacking
            this.bots.forEach(bot => {
                if (!bot.userData) return;
                
                const botData = bot.userData;
                
                // Only basic patrol movement, no hunting or shooting
                if (botData.behavior === 'patrol') {
                    const targetPoint = botData.patrolPoints[botData.currentPatrolIndex];
                    const direction = new THREE.Vector3().subVectors(targetPoint, bot.position);
                    
                    if (direction.length() < 10) {
                        botData.currentPatrolIndex = (botData.currentPatrolIndex + 1) % botData.patrolPoints.length;
                    } else {
                        direction.normalize();
                        botData.velocity.add(direction.multiplyScalar(0.01)); // Slower movement
                    }
                }
                
                // Apply velocity to position
                bot.position.add(botData.velocity);
                
                // Apply friction
                botData.velocity.multiplyScalar(0.95);
                
                // Keep bots within bounds
                this.keepBotInBounds(bot);
            });
            return;
        }
        
        this.bots.forEach(bot => {
            if (!bot.userData) return;
            
            const botData = bot.userData;
            const currentTime = Date.now();
            
            // Update bot behavior based on type
            switch(botData.behavior) {
                case 'patrol':
                    this.updatePatrolBot(bot, botData, currentTime);
                    break;
                case 'hunter':
                    this.updateHunterBot(bot, botData, currentTime);
                    break;
                case 'evader':
                    this.updateEvaderBot(bot, botData, currentTime);
                    break;
            }
            
            // Apply velocity to position
            bot.position.add(botData.velocity);
            
            // Apply friction
            botData.velocity.multiplyScalar(0.95);
            
            // Keep bots within bounds
            this.keepBotInBounds(bot);
            
            // Check collision with player
            if (this.player) {
                const distance = this.player.position.distanceTo(bot.position);
                if (distance < 3) {
                    this.takeDamage(5);
                }
            }
        });
    }
    
    updatePatrolBot(bot, botData, currentTime) {
        if (!this.player) return;
        
        // Check if player is nearby - if so, hunt them!
        const playerDirection = new THREE.Vector3().subVectors(this.player.position, bot.position);
        const playerDistance = playerDirection.length();
        
        if (playerDistance < 40) {
            // Player is nearby - switch to hunting mode!
            playerDirection.normalize();
            botData.velocity.add(playerDirection.multiplyScalar(0.04));
            
            // Shoot at player if in range
            if (playerDistance < 25 && currentTime - botData.lastShotTime > botData.shootCooldown) {
                this.botShoot(bot, this.player.position);
                botData.lastShotTime = currentTime;
            }
        } else {
            // Normal patrol behavior when player is far
            const targetPoint = botData.patrolPoints[botData.currentPatrolIndex];
            const direction = new THREE.Vector3().subVectors(targetPoint, bot.position);
            
            if (direction.length() < 10) {
                // Move to next patrol point
                botData.currentPatrolIndex = (botData.currentPatrolIndex + 1) % botData.patrolPoints.length;
            } else {
                // Move towards current patrol point
                direction.normalize();
                botData.velocity.add(direction.multiplyScalar(0.02));
            }
        }
        
        // Limit speed
        if (botData.velocity.length() > 0.7) {
            botData.velocity.normalize().multiplyScalar(0.7);
        }
    }
    
    updateHunterBot(bot, botData, currentTime) {
        if (!this.player) return;
        
        // Hunt the player aggressively
        const direction = new THREE.Vector3().subVectors(this.player.position, bot.position);
        const distance = direction.length();
        
        if (distance < 80) { // Increased range
            // Move towards player
            direction.normalize();
            botData.velocity.add(direction.multiplyScalar(0.05)); // Faster movement
            
            // Shoot at player if in range
            if (distance < 50 && currentTime - botData.lastShotTime > botData.shootCooldown) { // Increased shooting range
                this.botShoot(bot, this.player.position);
                botData.lastShotTime = currentTime;
            }
        } else {
            // Wander around if player is too far
            if (currentTime - botData.lastDirectionChange > botData.directionChangeInterval) {
                const randomDirection = new THREE.Vector3(
                    (Math.random() - 0.5) * 2,
                    (Math.random() - 0.5) * 2,
                    (Math.random() - 0.5) * 2
                ).normalize();
                botData.velocity.add(randomDirection.multiplyScalar(0.01));
                botData.lastDirectionChange = currentTime;
            }
        }
        
        // Limit speed
        if (botData.velocity.length() > 1.0) { // Increased max speed
            botData.velocity.normalize().multiplyScalar(1.0);
        }
    }
    
    updateEvaderBot(bot, botData, currentTime) {
        if (!this.player) return;
        
        // Evade the player but also shoot at them
        const direction = new THREE.Vector3().subVectors(bot.position, this.player.position);
        const distance = direction.length();
        
        if (distance < 40) {
            // Move away from player
            direction.normalize();
            botData.velocity.add(direction.multiplyScalar(0.04));
            
            // Shoot at player while evading (dangerous!)
            if (distance < 35 && currentTime - botData.lastShotTime > botData.shootCooldown) {
                this.botShoot(bot, this.player.position);
                botData.lastShotTime = currentTime;
            }
        } else {
            // Wander around if player is far
            if (currentTime - botData.lastDirectionChange > botData.directionChangeInterval) {
                const randomDirection = new THREE.Vector3(
                    (Math.random() - 0.5) * 2,
                    (Math.random() - 0.5) * 2,
                    (Math.random() - 0.5) * 2
                ).normalize();
                botData.velocity.add(randomDirection.multiplyScalar(0.01));
                botData.lastDirectionChange = currentTime;
            }
        }
        
        // Limit speed
        if (botData.velocity.length() > 0.6) {
            botData.velocity.normalize().multiplyScalar(0.6);
        }
    }
    
    botShoot(bot, targetPosition) {
        // Create bot shot effect
        const shotDirection = new THREE.Vector3().subVectors(targetPosition, bot.position).normalize();
        const shotOrigin = bot.position.clone();
        
        this.createShotEffect(
            { x: shotOrigin.x, y: shotOrigin.y, z: shotOrigin.z },
            { x: shotDirection.x, y: shotDirection.y, z: shotDirection.z },
            { hit: false }
        );
        
        // Check if shot hits player
        if (this.player) {
            const distance = this.player.position.distanceTo(shotOrigin);
            if (distance < 30) {
                // Increased damage based on bot type
                let damage = 20; // Base damage
                if (bot.userData.behavior === 'hunter') {
                    damage = 25; // Hunters do more damage
                } else if (bot.userData.behavior === 'patrol') {
                    damage = 18; // Patrol bots do medium damage
                } else if (bot.userData.behavior === 'evader') {
                    damage = 15; // Evaders do less damage but still dangerous
                }
                this.takeDamage(damage);
                console.log(`Bot hit player for ${damage} damage!`);
            }
        }
    }
    
    keepBotInBounds(bot) {
        const bounds = 100;
        const position = bot.position;
        
        if (Math.abs(position.x) > bounds) {
            position.x = Math.sign(position.x) * bounds;
            bot.userData.velocity.x *= -0.5;
        }
        if (Math.abs(position.y) > bounds) {
            position.y = Math.sign(position.y) * bounds;
            bot.userData.velocity.y *= -0.5;
        }
        if (Math.abs(position.z) > bounds) {
            position.z = Math.sign(position.z) * bounds;
            bot.userData.velocity.z *= -0.5;
        }
    }
    
    takeDamage(amount) {
        this.playerHealth = Math.max(0, this.playerHealth - amount);
        this.updateHealthDisplay();
        
        if (this.playerHealth <= 0) {
            this.gameOver();
        }
    }
    
    killBot(bot) {
        if (!bot.userData || bot.userData.health <= 0) return;
        
        console.log('Bot killed!');
        
        // Mark bot as dead
        bot.userData.health = 0;
        bot.userData.deathTime = Date.now();
        
        // Add to dead bots list for respawning
        this.deadBots.push(bot);
        
        // Remove bot from active bots list
        const botIndex = this.bots.indexOf(bot);
        if (botIndex > -1) {
            this.bots.splice(botIndex, 1);
        }
        
        // Hide the bot (make it invisible)
        bot.visible = false;
        
        // Create explosion effect at bot position
        this.createHitEffect({
            x: bot.position.x,
            y: bot.position.y,
            z: bot.position.z
        });
        
        // Increment kill counter
        this.kills++;
        
        // Regenerate player health (50% of max health)
        const healthRegen = Math.floor(this.playerMaxHealth * 0.5);
        this.playerHealth = Math.min(this.playerMaxHealth, this.playerHealth + healthRegen);
        this.updateHealthDisplay();
        
        // Show health regeneration effect
        this.showHealthRegenEffect(healthRegen);
        
        // Update kill counter display
        this.updateKillDisplay();
    }
    
    showHealthRegenEffect(amount) {
        // Create floating text effect for health regeneration
        const regenText = document.createElement('div');
        regenText.textContent = `+${amount} HP`;
        regenText.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            color: #00ff00;
            font-size: 24px;
            font-weight: bold;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
            pointer-events: none;
            z-index: 1000;
            animation: healthRegen 2s ease-out forwards;
        `;
        
        // Add CSS animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes healthRegen {
                0% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
                50% { opacity: 1; transform: translate(-50%, -50%) scale(1.2); }
                100% { opacity: 0; transform: translate(-50%, -50%) scale(1.5); }
            }
        `;
        document.head.appendChild(style);
        
        document.body.appendChild(regenText);
        
        // Remove after animation
        setTimeout(() => {
            document.body.removeChild(regenText);
        }, 2000);
    }
    
    updateKillDisplay() {
        const killCounter = document.getElementById('kill-counter');
        if (killCounter) {
            killCounter.textContent = `Kills: ${this.kills}`;
        }
    }
    
    updatePauseIndicator() {
        const pauseIndicator = document.getElementById('pause-indicator');
        if (pauseIndicator) {
            if (this.isGamePaused) {
                pauseIndicator.style.display = 'block';
                pauseIndicator.textContent = 'PAUSED';
                pauseIndicator.style.color = '#ffff00';
            } else if (!this.botsAreActive) {
                pauseIndicator.style.display = 'block';
                pauseIndicator.textContent = 'BOTS INACTIVE';
                pauseIndicator.style.color = '#00ff00';
            } else {
                pauseIndicator.style.display = 'none';
            }
        }
    }
    
    respawnBots() {
        // Don't respawn bots if game is paused
        if (this.isGamePaused) return;
        
        const currentTime = Date.now();
        
        // Check for bots that need respawning
        for (let i = this.deadBots.length - 1; i >= 0; i--) {
            const bot = this.deadBots[i];
            if (currentTime - bot.userData.deathTime >= this.botRespawnTime) {
                // Respawn the bot
                this.respawnBot(bot);
                this.deadBots.splice(i, 1);
            }
        }
    }
    
    respawnBot(bot) {
        // Reset bot health
        bot.userData.health = bot.userData.maxHealth;
        
        // Random new position (away from player)
        let newPosition;
        do {
            newPosition = new THREE.Vector3(
                (Math.random() - 0.5) * 150,
                (Math.random() - 0.5) * 150,
                (Math.random() - 0.5) * 150
            );
        } while (this.player && newPosition.distanceTo(this.player.position) < 30);
        
        bot.position.copy(newPosition);
        bot.userData.velocity.set(0, 0, 0);
        
        // Make bot visible again
        bot.visible = true;
        
        // Add back to active bots
        this.bots.push(bot);
        
        console.log('Bot respawned!');
    }
    
    updateHealthDisplay() {
        const healthFill = document.getElementById('health-fill');
        const healthText = document.getElementById('health-text');
        
        if (healthFill) {
            const healthPercent = (this.playerHealth / this.playerMaxHealth) * 100;
            healthFill.style.width = `${healthPercent}%`;
            
            // Change color based on health
            if (healthPercent > 60) {
                healthFill.style.background = 'linear-gradient(90deg, #ff0000, #ff4444)';
            } else if (healthPercent > 30) {
                healthFill.style.background = 'linear-gradient(90deg, #ff6600, #ff8844)';
            } else {
                healthFill.style.background = 'linear-gradient(90deg, #ff0000, #ff2222)';
            }
        }
        
        if (healthText) {
            healthText.textContent = `${this.playerHealth}/${this.playerMaxHealth} (${Math.round((this.playerHealth / this.playerMaxHealth) * 100)}%)`;
        }
    }
    
    gameOver() {
        console.log('Game Over!');
        this.isMenuOpen = true;
        this.showGameMenu();
        
        // Show game over message
        const gameOverDiv = document.createElement('div');
        gameOverDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.9);
            color: #ff0000;
            padding: 20px;
            border-radius: 10px;
            font-size: 24px;
            z-index: 3000;
            text-align: center;
        `;
        gameOverDiv.innerHTML = '<h2>GAME OVER</h2><p>Your spaceship was destroyed!</p>';
        document.body.appendChild(gameOverDiv);
        
        setTimeout(() => {
            document.body.removeChild(gameOverDiv);
        }, 3000);
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        
        // Debug pause state
        if (this.isGamePaused) {
            console.log('Game is paused, skipping updates');
        }
        
        this.updatePlayerMovement();
        this.updateCamera();
        this.updateEngineEffect();
        this.updateAsteroids();
        this.updateBots();
        this.respawnBots();
        
        this.renderer.render(this.scene, this.camera);
    }
    
    setupGameMenu() {
        console.log('setupGameMenu called');
        const menu = document.getElementById('game-menu');
        const resumeBtn = document.getElementById('resume-btn');
        const restartBtn = document.getElementById('restart-btn');
        const exitBtn = document.getElementById('exit-btn');
        const testBtn = document.getElementById('test-menu-btn');
        
        console.log('Menu elements found:', {
            menu: !!menu,
            resumeBtn: !!resumeBtn,
            restartBtn: !!restartBtn,
            exitBtn: !!exitBtn,
            testBtn: !!testBtn
        });
        
        // Test button for debugging
        if (testBtn) {
            testBtn.addEventListener('click', (event) => {
                event.stopPropagation();
                // alert('Test button clicked! Menu state: ' + this.isMenuOpen); // Commented out alert
                console.log('Test button clicked!');
                console.log('Current menu state:', this.isMenuOpen);
                if (this.isMenuOpen) {
                    this.hideGameMenu();
                } else {
                    this.showGameMenu();
                }
            });
        }

        // Resume button
        if (resumeBtn) {
            resumeBtn.addEventListener('click', (event) => {
                event.stopPropagation();
                this.hideGameMenu();
            });
        }
        
        // Restart button
        if (restartBtn) {
            restartBtn.addEventListener('click', (event) => {
                event.stopPropagation();
                this.restartGame();
            });
        }
        
        // Exit button
        if (exitBtn) {
            exitBtn.addEventListener('click', (event) => {
                event.stopPropagation();
                this.exitToMenu();
            });
        }
        
        console.log('Game menu setup complete');
    }
    
    showGameMenu() {
        console.log('showGameMenu called');
        // alert('showGameMenu method executed!'); // Commented out alert
        const menu = document.getElementById('game-menu');
        if (menu) {
            menu.classList.add('show');
            this.isMenuOpen = true;
            this.isGamePaused = true; // Pause the game
            this.updatePauseIndicator(); // Update pause indicator
            console.log('Menu shown, isMenuOpen:', this.isMenuOpen, 'Game paused:', this.isGamePaused);
            
            // Exit pointer lock when menu is open
            if (this.isPointerLocked) {
                document.exitPointerLock();
            }
        } else {
            console.error('Game menu element not found!');
            // alert('Game menu element not found!'); // Commented out alert
        }
    }
    
    hideGameMenu() {
        console.log('hideGameMenu called');
        const menu = document.getElementById('game-menu');
        if (menu) {
            menu.classList.remove('show');
            this.isMenuOpen = false;
            this.isGamePaused = false; // Unpause the game
            this.updatePauseIndicator(); // Update pause indicator
            console.log('Menu hidden, isMenuOpen:', this.isMenuOpen, 'Game paused:', this.isGamePaused);
        } else {
            console.error('Game menu element not found!');
        }
    }
    
    restartGame() {
        console.log('Restarting game...');
        this.hideGameMenu();
        this.resetGameState();
        this.createSpaceEnvironment();
    }
    
    exitToMenu() {
        console.log('Exiting to menu...');
        this.hideGameMenu();
        this.resetGameState();
        
        // For now, just restart the game since we don't have a map selector
        this.createSpaceEnvironment();
    }
    
    resetGameState() {
        // Clear scene
        while(this.scene.children.length > 0) {
            this.scene.remove(this.scene.children[0]);
        }
        
        // Reset game variables
        this.player = null;
        this.asteroids = [];
        this.otherPlayers = {};
        this.bots = []; // Clear bots
        this.deadBots = []; // Clear dead bots
        this.kills = 0; // Reset kills
        this.keys = { w: false, a: false, s: false, d: false, q: false, e: false, space: false };
        this.mouseX = 0;
        this.mouseY = 0;
        this.isPointerLocked = false;
        this.isMenuOpen = false;
        this.isGamePaused = false; // Reset pause state
        this.botsAreActive = false; // Reset bot activation state
        this.gameStartTime = null; // Reset game start time
        this.isShooting = false; // Reset continuous firing state
        this.shootInterval = null; // Clear firing interval
        this.canShoot = true;
        this.lastShotTime = 0;
        this.playerHealth = 100; // Reset health
        this.playerVelocity = null; // Reset velocity
        
        // Update displays
        this.updateHealthDisplay();
        this.updateKillDisplay();
        this.updatePauseIndicator(); // Update pause indicator
    }
    
    handleFullscreenChange() {
        // Update renderer size when fullscreen changes
        setTimeout(() => {
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
        }, 100);
    }
    
    createBots(count = 5) {
        console.log(`Creating ${count} dangerous bots...`);
        const botColors = [0xff0000, 0x00ff00, 0x0000ff, 0xff00ff, 0xffff00];
        const botBehaviors = ['patrol', 'hunter', 'evader', 'hunter', 'patrol']; // More hunters
        
        for (let i = 0; i < count; i++) {
            const bot = this.createBotSpaceship(
                botColors[i % botColors.length],
                botBehaviors[i % botBehaviors.length]
            );
            
            // Random starting position
            bot.position.set(
                (Math.random() - 0.5) * 100,
                (Math.random() - 0.5) * 100,
                (Math.random() - 0.5) * 100
            );
            
            // Bot properties with faster shooting
            bot.userData = {
                type: 'bot',
                id: `bot_${i}`,
                health: 100,
                maxHealth: 100,
                behavior: botBehaviors[i % botBehaviors.length],
                target: null,
                velocity: new THREE.Vector3(),
                lastShotTime: 0,
                shootCooldown: 500 + Math.random() * 500, // Faster shooting (was 1000-2000)
                patrolPoints: this.generatePatrolPoints(),
                currentPatrolIndex: 0,
                lastDirectionChange: 0,
                directionChangeInterval: 2000 + Math.random() * 3000
            };
            
            this.scene.add(bot);
            this.bots.push(bot);
            console.log(`Dangerous bot ${i} created at position:`, bot.position, 'with behavior:', bot.userData.behavior);
        }
        console.log(`Total dangerous bots created: ${this.bots.length}`);
    }
    
    createBotSpaceship(color, behavior) {
        const group = new THREE.Group();
        
        // Main body (different shape for bots)
        const bodyGeometry = new THREE.ConeGeometry(1.5, 6, 6);
        const bodyMaterial = new THREE.MeshPhongMaterial({ color: color });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.rotation.x = Math.PI / 2;
        group.add(body);
        
        // Wings (smaller for bots)
        const wingGeometry = new THREE.BoxGeometry(6, 0.3, 2);
        const wingMaterial = new THREE.MeshPhongMaterial({ color: color * 0.7 });
        const leftWing = new THREE.Mesh(wingGeometry, wingMaterial);
        const rightWing = new THREE.Mesh(wingGeometry, wingMaterial);
        
        leftWing.position.set(-3, 0, 0);
        rightWing.position.set(3, 0, 0);
        group.add(leftWing);
        group.add(rightWing);
        
        // Add behavior indicator
        const indicatorGeometry = new THREE.SphereGeometry(0.3, 8, 8);
        const indicatorMaterial = new THREE.MeshBasicMaterial({ 
            color: behavior === 'hunter' ? 0xff0000 : behavior === 'evader' ? 0x00ff00 : 0xffff00 
        });
        const indicator = new THREE.Mesh(indicatorGeometry, indicatorMaterial);
        indicator.position.set(0, 1, 0);
        group.add(indicator);
        
        return group;
    }
    
    generatePatrolPoints() {
        const points = [];
        for (let i = 0; i < 5; i++) {
            points.push(new THREE.Vector3(
                (Math.random() - 0.5) * 150,
                (Math.random() - 0.5) * 150,
                (Math.random() - 0.5) * 150
            ));
        }
        return points;
    }
    
    setupInstructionsPopup() {
        const startPlayingBtn = document.getElementById('start-playing-btn');
        if (startPlayingBtn) {
            startPlayingBtn.addEventListener('click', () => {
                this.hideInstructionsPopup();
            });
        }
    }
    
    showInstructionsPopup() {
        const popup = document.getElementById('instructions-popup');
        if (popup) {
            popup.style.display = 'flex';
            this.isGamePaused = true; // Pause the game
            this.updatePauseIndicator(); // Update pause indicator
            console.log('Instructions popup shown, Game paused:', this.isGamePaused);
        }
    }
    
    hideInstructionsPopup() {
        const popup = document.getElementById('instructions-popup');
        if (popup) {
            popup.style.display = 'none';
            this.isGamePaused = false; // Unpause the game
            this.updatePauseIndicator(); // Update pause indicator
            
            // Start the bot delay timer
            this.gameStartTime = Date.now();
            this.botsAreActive = false;
            console.log('Instructions popup hidden, bot delay started. Bots will become active in 5 seconds.');
            
            // Show countdown message
            this.showCountdownMessage();
        }
    }
    
    // Debug method to force pause/unpause
    togglePause() {
        this.isGamePaused = !this.isGamePaused;
        this.updatePauseIndicator();
        console.log('Game pause toggled:', this.isGamePaused);
    }
    
    // Debug method to force pause
    forcePause() {
        this.isGamePaused = true;
        this.updatePauseIndicator();
        console.log('Game force paused');
    }
    
    // Debug method to force unpause
    forceUnpause() {
        this.isGamePaused = false;
        this.updatePauseIndicator();
        console.log('Game force unpaused');
    }
    
    // Debug method to force kill a bot
    forceKillBot() {
        if (this.bots.length > 0) {
            const botToKill = this.bots[0];
            console.log('Force killing bot:', botToKill);
            this.killBot(botToKill);
        } else {
            console.log('No bots to kill!');
        }
    }
    
    // Debug method to show bot info
    showBotInfo() {
        console.log('=== BOT INFO ===');
        console.log('Total bots:', this.bots.length);
        console.log('Dead bots:', this.deadBots.length);
        this.bots.forEach((bot, index) => {
            console.log(`Bot ${index}:`, {
                health: bot.userData?.health,
                behavior: bot.userData?.behavior,
                position: bot.position,
                visible: bot.visible
            });
        });
    }
    
    showCountdownMessage() {
        const countdownDiv = document.createElement('div');
        countdownDiv.id = 'countdown-message';
        countdownDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            color: #ffff00;
            font-size: 32px;
            font-weight: bold;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
            pointer-events: none;
            z-index: 1000;
            text-align: center;
        `;
        
        document.body.appendChild(countdownDiv);
        
        let countdown = 5;
        const updateCountdown = () => {
            if (countdown > 0) {
                countdownDiv.innerHTML = `
                    <div>BOTS ACTIVATING IN</div>
                    <div style="font-size: 48px; color: #ff4444; margin: 10px 0;">${countdown}</div>
                    <div>GET READY!</div>
                `;
                countdown--;
                setTimeout(updateCountdown, 1000);
            } else {
                countdownDiv.innerHTML = `
                    <div style="font-size: 48px; color: #ff0000;">BOTS ACTIVE!</div>
                    <div style="font-size: 24px; margin-top: 10px;">FIGHT FOR YOUR LIFE!</div>
                `;
                
                // Activate bots
                this.botsAreActive = true;
                console.log('Bots are now active and dangerous!');
                
                // Remove countdown after 2 seconds
                setTimeout(() => {
                    if (countdownDiv.parentNode) {
                        countdownDiv.parentNode.removeChild(countdownDiv);
                    }
                }, 2000);
            }
        };
        
        updateCountdown();
    }
    
    startContinuousFiring() {
        if (this.isShooting) return; // Already firing
        
        this.isShooting = true;
        console.log('Starting continuous firing');
        
        // Fire immediately
        this.shoot();
        
        // Set up interval for continuous firing
        this.shootInterval = setInterval(() => {
            if (this.isShooting && this.canShoot) {
                this.shoot();
            }
        }, this.rapidFireCooldown);
    }
    
    stopContinuousFiring() {
        if (!this.isShooting) return; // Not firing
        
        this.isShooting = false;
        console.log('Stopping continuous firing');
        
        // Clear the firing interval
        if (this.shootInterval) {
            clearInterval(this.shootInterval);
            this.shootInterval = null;
        }
    }
}

// Create game instance
const game = new SpaceArena();

// Make it globally accessible for debugging
window.game = game;