const summonBtn = document.getElementById('summon-btn');
const resetBtn = document.getElementById('reset-btn');
const curtain = document.getElementById('transition-curtain');
const landingPage = document.getElementById('landing-page');
const battleground = document.getElementById('battleground');
const arenaBlock = document.getElementById('arena');
const combatLog = document.getElementById('combat-log');
const battleHeader = document.getElementById('battle-header');

let fighter1 = {}, fighter2 = {}, battleInterval;

// --- AUDIO ENGINE ---
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const audioBuffers = {};

async function loadSound(name, url) {
    try {
        const res = await fetch(url);
        const arrayBuffer = await res.arrayBuffer();
        audioBuffers[name] = await audioCtx.decodeAudioData(arrayBuffer);
    } catch (e) {
        console.warn(`Failed to load sound: ${url}`);
    }
}

async function playSound(name, volume = 1) {
    if (audioCtx.state === 'suspended') await audioCtx.resume();
    const buffer = audioBuffers[name];
    if (!buffer) return;
    const source = audioCtx.createBufferSource();
    const gainNode = audioCtx.createGain();
    gainNode.gain.value = volume;
    source.buffer = buffer;
    source.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    source.start(0);
}

function playRandomHit() {
    const n = Math.floor(Math.random() * 5) + 1;
    const buffer = audioBuffers[`hit${n}`];
    if (!buffer) return;
    const source = audioCtx.createBufferSource();
    const gainNode = audioCtx.createGain();
    gainNode.gain.value = 1;
    source.buffer = buffer;
    source.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    source.start(0); // fires synchronously, no async/await
}

(async () => {
    await Promise.all([
        loadSound('click',      'sounds/click.mp3'),
        loadSound('transition', 'sounds/whoosh.mp3'),
        loadSound('attack',     'sounds/fireball.mp3'),
        loadSound('death',      'sounds/defeat.mp3'),
        loadSound('hit1',       'sounds/hit1.mp3'),
        loadSound('hit2',       'sounds/hit2.mp3'),
        loadSound('hit3',       'sounds/hit3.mp3'),
        loadSound('hit4',       'sounds/hit4.mp3'),
        loadSound('hit5',       'sounds/hit5.mp3'),
    ]);
    console.log('All sounds loaded.');
})();

// --- STATS ---
function calculateStats(data) {
    return {
        name: data.login,
        avatar: data.avatar_url,
        maxHp: 100 + Math.floor(Math.log(data.public_repos + 2) * 25),
        hp: 0,
        atk: 12 + Math.floor(Math.log(data.followers + 2) * 10),
        color: '#39ff14'
    };
}

async function fetchMageData(username) {
    try {
        const res = await fetch(`https://api.github.com/users/${username}`);
        return res.ok ? await res.json() : null;
    } catch { return null; }
}

// --- FIREBALL ---
function shootFireball(atkId, defId, color, onHit) {
    const stage = document.getElementById('battle-stage');
    const attackerGem = document.getElementById(`${atkId}-gem`).getBoundingClientRect();
    const defenderStick = document.getElementById(`${defId}-stickman`).getBoundingClientRect();
    const stageRect = stage.getBoundingClientRect();

    const fireball = document.createElement('div');
    fireball.className = 'fireball';
    fireball.style.backgroundColor = color;
    fireball.style.boxShadow = `0 0 20px ${color}`;
    stage.appendChild(fireball);

    const startX = attackerGem.left - stageRect.left, startY = attackerGem.top - stageRect.top;
    const endX = defenderStick.left - stageRect.left + 75, endY = defenderStick.top - stageRect.top + 100;

    fireball.style.left = `${startX}px`;
    fireball.style.top = `${startY}px`;

    playSound('attack'); // 🔥 fireball launched

    const anim = fireball.animate([
        { transform: 'translate(0,0)' },
        { transform: `translate(${endX - startX}px, ${endY - startY}px) scale(1.5)` }
    ], { duration: 350, easing: 'ease-in' });

    anim.onfinish = () => { fireball.remove(); onHit(); };
}

// --- BATTLE LOOP ---
function startBattleLoop() {
    let turn = 1;
    battleInterval = setInterval(() => {
        let atk = turn === 1 ? fighter1 : fighter2;
        let def = turn === 1 ? fighter2 : fighter1;
        let atkId = turn === 1 ? 'mage1' : 'mage2';
        let defId = turn === 1 ? 'mage2' : 'mage1';

        let dmg = Math.floor(atk.atk * (0.8 + Math.random() * 0.4));
        document.getElementById(`${atkId}-stickman`).classList.add('cast-spell');
        setTimeout(() => document.getElementById(`${atkId}-stickman`).classList.remove('cast-spell'), 400);

        shootFireball(atkId, defId, atk.color, () => {
            def.hp = Math.max(0, def.hp - dmg);
            document.getElementById(`${defId}-hp-bar`).style.width = `${(def.hp / def.maxHp) * 100}%`;
            combatLog.innerHTML = `<span style="color:${atk.color}">${atk.name}</span> deals ${dmg} damage!`;

            document.getElementById(`${defId}-stickman`).classList.add('take-damage');
            setTimeout(() => document.getElementById(`${defId}-stickman`).classList.remove('take-damage'), 400);

            if (def.hp === 0) {
                playSound('death'); // 💀 target dies
                clearInterval(battleInterval);
                document.getElementById(`${defId}-stickman`).classList.add('dead');
                combatLog.innerHTML = `<strong>${atk.name} WINS!</strong>`;
                resetBtn.style.display = 'inline-block';
            } else {
                playRandomHit(); // 💥 damage taken
            }
        });

        turn = turn === 1 ? 2 : 1;
    }, 1600);
}

// --- SUMMON BUTTON ---
summonBtn.addEventListener('click', async () => {
    await playSound('click', 3); // 👆 boosted click

    const p1 = document.getElementById('player1').value.trim();
    const p2 = document.getElementById('player2').value.trim();
    if (!p1 || !p2) return alert("Enter two usernames!");

    summonBtn.innerText = "SUMMONING...";
    const d1 = await fetchMageData(p1), d2 = await fetchMageData(p2);
    summonBtn.innerText = "BATTLE";
    if (!d1 || !d2) return alert("User not found!");

    fighter1 = calculateStats(d1); fighter1.hp = fighter1.maxHp;
    fighter2 = calculateStats(d2); fighter2.hp = fighter2.maxHp; fighter2.color = '#ff4757';

    document.getElementById('mage1-avatar').src = fighter1.avatar;
    document.getElementById('mage2-avatar').src = fighter2.avatar;
    document.querySelectorAll('.mage-head, .mage-body').forEach(el => el.style.display = 'block');
    document.querySelectorAll('.stickman-wrapper').forEach(el => el.classList.remove('dead'));
    document.getElementById('mage1-hp-bar').style.width = document.getElementById('mage2-hp-bar').style.width = '100%';
    document.getElementById('mage1-name').innerText = fighter1.name;
    document.getElementById('mage2-name').innerText = fighter2.name;
    document.getElementById('mage1-stats').innerText = `HP: ${fighter1.maxHp} | ATK: ${fighter1.atk}`;
    document.getElementById('mage2-stats').innerText = `HP: ${fighter2.maxHp} | ATK: ${fighter2.atk}`;

    resetBtn.style.display = 'none';
    curtain.classList.add('active');

    setTimeout(() => {
        playSound('transition', 3); // 🌀 boosted whoosh in
        landingPage.classList.remove('active');
        battleground.classList.add('active');
        curtain.classList.remove('active');

        setTimeout(() => {
            arenaBlock.classList.add('rise');
            setTimeout(() => {
                arenaBlock.classList.add('float');
                setTimeout(startBattleLoop, 1000);
            }, 800);
        }, 200);
    }, 1000);
});

// --- RESET BUTTON ---
resetBtn.addEventListener('click', async () => {
    await playSound('click', 3); // 👆 boosted click
    clearInterval(battleInterval);
    curtain.classList.add('active');

    setTimeout(() => {
        playSound('transition', 3); // 🌀 boosted whoosh out
        battleground.classList.remove('active');
        landingPage.classList.add('active');
        arenaBlock.style.transition = 'none';
        arenaBlock.classList.remove('float', 'rise');
        void arenaBlock.offsetWidth;
        arenaBlock.style.transition = '';
        curtain.classList.remove('active');
        document.getElementById('player1').value = document.getElementById('player2').value = '';
    }, 1000);
});
