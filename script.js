const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const width = canvas.width;
const height = canvas.height;

class Entity {
    constructor(x, y, isZombie = false) {
        this.x = x;
        this.y = y;
        this.isZombie = isZombie;
        this.radius = 10;
        this.speed = isZombie ? 1.7 : 2;
        this.collisionRadius = this.radius; // For now, same
    }

    draw(color) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
    }

    move(dx, dy) {
        this.x += dx * this.speed;
        this.y += dy * this.speed;
        this.x = Math.max(this.radius, Math.min(width - this.radius, this.x));
        this.y = Math.max(this.radius, Math.min(height - this.radius, this.y));
    }
}

let player = new Entity(width / 2, height / 2, false);
let humans = [];
let zombies = [];
let robotZombies = [];
let timeLeft = 80;
let timerInterval;
let restarting = false;
let restartTimer = 0;
let inJukeArena = false;
const jukeArena = { x: 20, y: 20, w: 200, h: 200 };
let jukeZombies = [];
let playerScore = 0;
let playerKills = 0;
let playerSurviveTime = 0;
let maxZombies = 1;

function init() {
        inJukeArena = false;
        jukeZombies = [];
        // Place 3 zombies in the juke arena
        for (let i = 0; i < 3; i++) {
            let zx = jukeArena.x + 30 + Math.random() * (jukeArena.w - 60);
            let zy = jukeArena.y + 30 + Math.random() * (jukeArena.h - 60);
            let z = new Entity(zx, zy, true);
            let z = new Entity(zx, zy, true);
            z.score = 0;
            z.speed = 1.7;
            jukeZombies.push(z);
        }
    humans = [];
    zombies = [];
    robotZombies = [];
    player.isZombie = false;
    player.x = width / 2;
    player.y = height / 2;
    player.radius = 10 + Math.floor(playerSurviveTime / 3);
    player.speed = 2 + Math.floor(playerSurviveTime / 10) * 0.2;
    player.collisionRadius = 8;
    maxZombies = 5;
    document.getElementById('status').textContent = 'Status: Human';
    // Create 5 AI humans, avoiding juke arena
    for (let i = 0; i < 5; i++) {
        let hx, hy;
        do {
            hx = Math.random() * width;
            hy = Math.random() * height;
        } while (hx >= jukeArena.x && hx <= jukeArena.x + jukeArena.w && hy >= jukeArena.y && hy <= jukeArena.y + jukeArena.h);
        let h = new Entity(hx, hy, false);
        h.surviveTime = 0;
        h.score = 0;
        humans.push(h);
    }
    // Spawn zombies based on score, avoiding juke arena
    for (let i = 0; i < maxZombies; i++) {
        let zx, zy;
        do {
            zx = Math.random() * width;
            zy = Math.random() * height;
        } while (zx >= jukeArena.x && zx <= jukeArena.x + jukeArena.w && zy >= jukeArena.y && zy <= jukeArena.y + jukeArena.h);
        let z = new Entity(zx, zy, true);
        z.score = 0;
        z.speed = 1.7;
        zombies.push(z);
    }
    // Add 10 stationary robot zombies as obstacles, avoiding the juke arena
    for (let i = 0; i < 10; i++) {
        let rx, ry;
        do {
            rx = 100 + Math.random() * (width - 200);
            ry = 100 + Math.random() * (height - 200);
        } while (rx >= jukeArena.x && rx <= jukeArena.x + jukeArena.w && ry >= jukeArena.y && ry <= jukeArena.y + jukeArena.h);
        let robot = new Entity(rx, ry, true);
        robot.isRobot = true;
        robotZombies.push(robot);
    }
}

function resetRound() {
        inJukeArena = false;
    restarting = true;
    restartTimer = 3 * 60; // 3 seconds at 60 FPS
    setTimeout(() => {
        timeLeft = 80;
        init();
        // Randomly make one human a zombie
        if (humans.length > 0) {
            let idx = Math.floor(Math.random() * humans.length);
            let z = humans.splice(idx, 1)[0];
            z.isZombie = true;
            zombies.push(z);
        }
        restarting = false;
    }, 3000);
}

function startTimer() {
    timerInterval = setInterval(() => {
        timeLeft--;
        document.getElementById('timer').textContent = 'Time: ' + timeLeft;
        if (timeLeft <= 0) {
            resetRound();
        }
    }, 1000);
}

function distance(a, b) {
    return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function findNearest(entity, list) {
    let minDist = Infinity;
    let nearest = null;
    list.forEach(e => {
        let d = distance(entity, e);
        if (d < minDist) {
            minDist = d;
            nearest = e;
        }
    });
    return nearest;
}

let keys = {};

window.addEventListener('keydown', e => {
    keys[e.key.toLowerCase()] = true;
});

window.addEventListener('keyup', e => {
    keys[e.key.toLowerCase()] = false;
});

function update() {
    // Player can move freely in juke arena but can't exit (handled in movement check)
    if (restarting) {
        restartTimer--;
        return;
    }
    // Player movement
    let dx = 0, dy = 0;
    if (keys['w']) dy -= 1;
    if (keys['s']) dy += 1;
    if (keys['a']) dx -= 1;
    if (keys['d']) dx += 1;
    if (!player.isZombie) {
        playerSurviveTime += 1/60;
        // Grow and speed up the longer you survive
        player.radius = 10 + Math.floor(playerSurviveTime / 3); // +1 radius every 3 seconds
        player.collisionRadius = 8;
        player.speed = 2 + Math.floor(playerSurviveTime / 10) * 0.2 + (inJukeArena ? 0.5 : 0); // +0.2 speed every 10 seconds
        let scoreMultiplier = inJukeArena ? 2 : 1;
        playerScore = playerKills * 10 + Math.floor(playerSurviveTime) * scoreMultiplier; // Double score in juke arena
        maxZombies = 5 + Math.floor(playerScore / 10); // More zombies as score increases
    }
    if (dx || dy) {
        let len = Math.sqrt(dx * dx + dy * dy);
        dx /= len;
        dy /= len;
        // Try to move, but check for collisions with all entities
        let nextX = player.x + dx * player.speed;
        let nextY = player.y + dy * player.speed;
        let canMove = true;
        // If currently inside juke arena, block leaving
        const currentlyInJuke = (player.x >= jukeArena.x + player.collisionRadius && player.x <= jukeArena.x + jukeArena.w - player.collisionRadius && player.y >= jukeArena.y + player.collisionRadius && player.y <= jukeArena.y + jukeArena.h - player.collisionRadius);
        if (currentlyInJuke) {
            if (nextX < jukeArena.x + player.collisionRadius || nextX > jukeArena.x + jukeArena.w - player.collisionRadius || nextY < jukeArena.y + player.collisionRadius || nextY > jukeArena.y + jukeArena.h - player.collisionRadius) {
                canMove = false;
            }
        }
        // If player is zombie, block entering the juke arena
        if (player.isZombie && !currentlyInJuke) {
            if (nextX >= jukeArena.x + player.collisionRadius && nextX <= jukeArena.x + jukeArena.w - player.collisionRadius && nextY >= jukeArena.y + player.collisionRadius && nextY <= jukeArena.y + jukeArena.h - player.collisionRadius) {
                canMove = false;
            }
        }
        // Check collision with humans ONLY if player is human
        if (!player.isZombie) {
            for (let h of humans) {
                if (distance({x: nextX, y: nextY}, h) < player.collisionRadius + h.radius) {
                    canMove = false;
                    break;
                }
            }
        }
        // Check collision with zombies
        if (canMove) {
            for (let z of zombies) {
                if (distance({x: nextX, y: nextY}, z) < player.collisionRadius + z.radius) {
                    canMove = false;
                    break;
                }
            }
        }
        // Check collision with robot zombies
        if (canMove) {
            for (let rz of robotZombies) {
                if (distance({x: nextX, y: nextY}, rz) < player.collisionRadius + rz.radius) {
                    canMove = false;
                    break;
                }
            }
        }
        // Allow player to enter the Juke Arena even if colliding with a Juke zombie at the edge
        if (inJukeArena) {
            for (let jz of jukeZombies) {
                if (distance({x: nextX, y: nextY}, jz) < player.collisionRadius + jz.radius) {
                    canMove = false;
                    break;
                }
            }
        }
        if (canMove) {
            player.move(dx, dy);
        }
    }

    // Check if player enters juke arena
    if (!inJukeArena && !player.isZombie && player.x >= jukeArena.x && player.x <= jukeArena.x + jukeArena.w && player.y >= jukeArena.y && player.y <= jukeArena.y + jukeArena.h) {
        inJukeArena = true;
    }
    // Juke zombies chase player if in juke arena, with spreading
    if (inJukeArena) {
        jukeZombies.forEach(jz => {
            let dx = player.x - jz.x;
            let dy = player.y - jz.y;
            let len = Math.sqrt(dx * dx + dy * dy);
            if (len > 0) {
                dx /= len;
                dy /= len;
                // Add random angle for spreading out
                const angle = Math.atan2(dy, dx) + (Math.random() - 0.5) * 2.0;
                jz.move(Math.cos(angle) * jz.speed, Math.sin(angle) * jz.speed);
            }
        });
        // If player is tagged by a juke zombie
        for (let jz of jukeZombies) {
            if (distance(player, jz) < player.collisionRadius + jz.radius) {
                jz.score += 10;
                jz.speed = 1.7 + Math.floor(jz.score / 10) * 0.1;
                player.isZombie = true;
                document.getElementById('status').textContent = 'Status: Zombie';
                player.radius = 10;
                player.collisionRadius = 8;
                player.speed = 2;
                playerScore = 0;
                playerSurviveTime = 0;
            }
        }
    }

    // AI for humans: run from nearest zombie, with a bit of random jitter to make them jukable
    humans.forEach(h => {
        // Update survival stats
        h.surviveTime += 1/60;
        h.radius = 10 + Math.floor(h.surviveTime / 3);
        h.speed = 2 + Math.floor(h.surviveTime / 10) * 0.2;
        h.score = Math.floor(h.surviveTime);
        let nearestZombie = findNearest(h, zombies.concat(player.isZombie ? [player] : []));
        if (nearestZombie) {
            let dx = h.x - nearestZombie.x;
            let dy = h.y - nearestZombie.y;
            let len = Math.sqrt(dx * dx + dy * dy);
            if (len > 0) {
                dx /= len;
                dy /= len;
                // Add a small random angle to make juking possible
                const angle = Math.atan2(dy, dx) + (Math.random() - 0.5) * 0.8;
                let speed = h.speed;
                if (len < 50) speed *= 1.5;
                h.move(Math.cos(angle) * speed, Math.sin(angle) * speed);
            }
        }
    });

    // AI for zombies: chase nearest human, but can't enter juke arena
    zombies.forEach(z => {
        let targets = humans.slice();
        if (!player.isZombie && !inJukeArena) targets.push(player);
        let nearestHuman = findNearest(z, targets);
        if (nearestHuman) {
            let dx = nearestHuman.x - z.x;
            let dy = nearestHuman.y - z.y;
            let len = Math.sqrt(dx * dx + dy * dy);
            if (len > 0) {
                // Add random angle for wider chasing
                const angle = Math.atan2(dy, dx) + (Math.random() - 0.5) * 1.0;
                dx = Math.cos(angle);
                dy = Math.sin(angle);
                // Check if moving would enter juke arena
                let nextX = z.x + dx * z.speed;
                let nextY = z.y + dy * z.speed;
                if (!(nextX >= jukeArena.x && nextX <= jukeArena.x + jukeArena.w && nextY >= jukeArena.y && nextY <= jukeArena.y + jukeArena.h)) {
                    z.move(dx, dy);
                }
            }
        }
    });

    // Collisions
    // Robot zombies tag humans and player if touched
    if (!player.isZombie) {
        robotZombies.forEach(rz => {
            if (distance(player, rz) < player.collisionRadius + rz.radius) {
                player.isZombie = true;
                document.getElementById('status').textContent = 'Status: Zombie';
                player.radius = 10;
                player.collisionRadius = 8;
                player.speed = 2;
                playerScore = 0;
                playerSurviveTime = 0;
            }
        });
    }
    if (!player.isZombie) {
        zombies.forEach(z => {
            if (distance(player, z) < player.collisionRadius + z.radius) {
                player.isZombie = true;
                document.getElementById('status').textContent = 'Status: Zombie';
                // Reset only growth, score, and survive time (not kills or zombies)
                player.radius = 10;
                player.collisionRadius = 8;
                player.speed = 2;
                playerScore = 0;
                playerSurviveTime = 0;
                // Do NOT reset playerKills or maxZombies or call resetRound()
            }
        });
    } else {
        for (let i = humans.length - 1; i >= 0; i--) {
            let h = humans[i];
            if (distance(player, h) < player.collisionRadius + h.radius) {
                let z = humans.splice(i, 1)[0];
                z.isZombie = true;
                zombies.push(z);
                playerKills++;
            }
        }
    }

    // Zombies infect humans
    for (let zi = zombies.length - 1; zi >= 0; zi--) {
        let z = zombies[zi];
        for (let hi = humans.length - 1; hi >= 0; hi--) {
            let h = humans[hi];
            if (distance(z, h) < z.radius + h.radius) {
                z.score += 10;
                z.speed = 1.7 + Math.floor(z.score / 10) * 0.1;
                let newZ = humans.splice(hi, 1)[0];
                newZ.isZombie = true;
                newZ.score = 0;
                newZ.speed = 1.7;
                zombies.push(newZ);
            }
        }
    }

    // Check if no humans left
    if (humans.length === 0 && player.isZombie) {
        resetRound();
    }
}

function draw() {
    ctx.clearRect(0, 0, width, height);
    // Draw juke arena
    ctx.save();
    ctx.strokeStyle = 'orange';
    ctx.lineWidth = 3;
    ctx.strokeRect(jukeArena.x, jukeArena.y, jukeArena.w, jukeArena.h);
    ctx.font = '16px Arial';
    ctx.fillStyle = 'orange';
    ctx.fillText('Juke Arena', jukeArena.x + 10, jukeArena.y + 20);
    ctx.restore();
    // Draw juke zombies
    jukeZombies.forEach(jz => {
        jz.draw('purple');
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.lineWidth = 1;
    });
    humans.forEach(h => {
        h.draw('green');
        ctx.strokeStyle = 'white';
        ctx.stroke();
    });
    zombies.forEach(z => {
        z.draw('red');
        ctx.strokeStyle = 'white';
        ctx.stroke();
    });
    // Draw robot zombies (obstacles)
    robotZombies.forEach(rz => {
        rz.draw('gray');
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.lineWidth = 1;
    });
    player.draw(player.isZombie ? 'darkred' : 'lightgreen');
    ctx.strokeStyle = 'yellow';
    ctx.stroke();
    // Draw hitbox
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.collisionRadius, 0, Math.PI * 2);
    ctx.strokeStyle = 'blue';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.lineWidth = 1;
    // Draw score and kills
    ctx.save();
    ctx.font = '20px Arial';
    ctx.fillStyle = 'yellow';
    ctx.fillText('Kills: ' + playerKills, width - 150, 30);
    ctx.fillText('Score: ' + playerScore, width - 150, 60);
    ctx.restore();
    // Draw game restarting text if needed
    if (restarting) {
        ctx.save();
        ctx.font = '48px Arial';
        ctx.fillStyle = 'red';
        ctx.textAlign = 'center';
        ctx.fillText('Game Restarting...', width / 2, height / 2);
        ctx.restore();
    }
}

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

init();
startTimer();
gameLoop();