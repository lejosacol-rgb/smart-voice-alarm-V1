if ('serviceWorker' in navigator) { navigator.serviceWorker.register('sw.js'); }

let wakeLock = null;
const acquireWakeLock = async () => {
    try { if ('wakeLock' in navigator) wakeLock = await navigator.wakeLock.request('screen'); }
    catch (err) { console.log("WakeLock no disponible"); }
};
document.addEventListener('click', acquireWakeLock);

const clock = document.getElementById('clock');
const secondsDisplay = document.getElementById('seconds');
const alarmsListUI = document.getElementById('alarms-list');
const micBtn = document.getElementById('mic-btn');
const stopBtn = document.getElementById('stop-btn');
const alarmAudio = document.getElementById('alarm-audio');
const commandDisplay = document.getElementById('command-display');

let alarms = JSON.parse(localStorage.getItem('myAlarms')) || [];
let isAlarming = false;
let activeId = null;

// Configuración Territorial Automática
const userLocale = Intl.DateTimeFormat().resolvedOptions().locale;

setInterval(() => {
    const now = new Date();
    const timeString = now.toLocaleTimeString(userLocale, { hour: '2-digit', minute: '2-digit', hour12: false });
    const secondsString = now.toLocaleTimeString(userLocale, { second: '2-digit' });

    clock.textContent = timeString;
    secondsDisplay.textContent = secondsString;

    alarms.forEach(a => {
        if (a.time === timeString && !isAlarming && !a.cooldown) triggerAlarm(a);
        if (a.time !== timeString) a.cooldown = false;
    });
}, 1000);

// Voz Continua
const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
recognition.lang = userLocale;

micBtn.onclick = () => {
    recognition.start();
    document.querySelector('.mic-wrapper').classList.add('listening');
};

recognition.onresult = (e) => {
    const text = e.results[0][0].transcript.toLowerCase();
    processCommand(text);
};

function processCommand(text) {
    if (text.includes("terminar") || text.includes("listo") || text.includes("finalizar")) {
        document.querySelector('.mic-wrapper').classList.remove('listening');
        commandDisplay.textContent = "Escucha finalizada.";
        return;
    }

    if (text.includes("detener") || text.includes("apaga") || text.includes("para")) {
        stopAlarm();
        return;
    }

    const timeMatch = text.match(/(\d{1,2})[:\s]*(\d{0,2})\s*(am|pm|p\.m\.|a\.m\.)?/i);
    if (timeMatch) {
        let h = parseInt(timeMatch[1]);
        let m = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
        let ampm = timeMatch[3] ? timeMatch[3].toLowerCase() : null;

        if (ampm) {
            if (ampm.includes("p") && h < 12) h += 12;
            if (ampm.includes("a") && h === 12) h = 0;
        }

        const time24 = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        const isDaily = text.includes("diario") || text.includes("siempre") || text.includes("todos los días");
        
        alarms.push({
            id: Date.now(),
            time: time24,
            displayText: ampm ? `${timeMatch[1]}:${String(m).padStart(2, '0')} ${ampm.toUpperCase()}` : time24,
            isDaily: isDaily,
            label: text.includes("mañana") ? "Mañana" : (isDaily ? "Diario" : "Hoy"),
            cooldown: false
        });
        save();
        commandDisplay.textContent = `Guardada: ${time24}. ¿Otra?`;
        setTimeout(() => { if(!isAlarming) try { recognition.start(); } catch(e){} }, 1500);
    }
}

function triggerAlarm(a) {
    isAlarming = true; activeId = a.id;
    alarmAudio.play().catch(() => console.log("Interacción requerida"));
    stopBtn.classList.remove('hidden');
    setTimeout(() => { try { recognition.start(); } catch(e){} }, 2000);
}

function stopAlarm() {
    alarmAudio.pause(); alarmAudio.currentTime = 0;
    isAlarming = false; stopBtn.classList.add('hidden');
    alarms = alarms.filter(a => {
        if (a.id === activeId) {
            if (a.isDaily) { a.cooldown = true; return true; }
            return false;
        }
        return true;
    });
    save();
}

const save = () => { localStorage.setItem('myAlarms', JSON.stringify(alarms)); render(); };
const render = () => {
    alarmsListUI.innerHTML = alarms.map(a => `
        <li class="alarm-item ${a.isDaily ? 'daily' : ''}">
            <div style="display:flex; flex-direction:column">
                <span style="font-size:1.3rem; color:var(--neon-blue); font-weight:700">${a.displayText}</span>
                <span style="font-size:0.7rem; color:#666; text-transform:uppercase">${a.label}</span>
            </div>
            <button onclick="deleteAlarm(${a.id})" style="background:none; border:none; color:#444; font-size:1.5rem; cursor:pointer">✕</button>
        </li>
    `).join('');
};

window.deleteAlarm = (id) => { alarms = alarms.filter(a => a.id !== id); save(); };
render();