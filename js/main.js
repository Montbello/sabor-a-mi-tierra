/**
 * SABOR A MI TIERRA - ETHICAL JAVASCRIPT
 * =======================================
 * Prinzipien:
 * - Autonomie vor Engagement
 * - Bewusste Nutzung statt Verweildauer
 * - Klare Endpunkte
 * - Keine versteckten Trigger
 */

// ===== Konfiguration (Ethical Limits) =====
const CONFIG = {
    // Maximale Anzahl Events pro Anfrage (keine endlose Nachladen)
    maxEventsPerLoad: 6,
    
    // Zeit bis zur Pause-Erinnerung (in Minuten)
    pauseReminderMinutes: 15,
    
    // Session-Tracking (nur für Wellness-Features, nicht für Engagement)
    sessionStartTime: Date.now(),
    
    // Keine automatischen Refresh-Intervalle
    autoRefresh: false
};

// ===== DOM Elemente =====
const elements = {
    introOverlay: document.getElementById('intro-overlay'),
    enterApp: document.getElementById('enter-app'),
    skipIntro: document.getElementById('skip-intro'),
    navbar: document.querySelector('.navbar'),
    menuToggle: document.querySelector('.menu-toggle'),
    navLinks: document.querySelector('.nav-links'),
    filterBtns: document.querySelectorAll('.filter-btn'),
    chips: document.querySelectorAll('.chip'),
    loadMoreBtn: document.getElementById('load-more-events'),
    pauseReminder: document.getElementById('pause-reminder'),
    continueBrowsing: document.getElementById('continue-browsing'),
    takeBreak: document.getElementById('take-break')
};

// ===== Tropical Intro Animation =====
// Der Nutzer muss aktiv entscheiden, die App zu betreten
function initIntroAnimation() {
    // Prüfen ob bereits heute besucht
    const lastVisit = localStorage.getItem('lastVisit');
    const today = new Date().toDateString();
    
    if (lastVisit === today) {
        // Heute schon begrüßt - Intro überspringen
        elements.introOverlay?.classList.add('hidden');
        startPauseReminderTimer();
    }
    
    // Enter Button
    elements.enterApp?.addEventListener('click', () => {
        closeIntro();
    });
    
    // Skip Button
    elements.skipIntro?.addEventListener('click', () => {
        closeIntro();
    });
    
    // Keyboard: Enter oder Space zum Starten
    document.addEventListener('keydown', (e) => {
        if ((e.key === 'Enter' || e.key === ' ') && !elements.introOverlay?.classList.contains('hidden')) {
            e.preventDefault();
            closeIntro();
        }
    });
}

function closeIntro() {
    const today = new Date().toDateString();
    
    // Smooth transition out
    elements.introOverlay?.classList.add('hidden');
    localStorage.setItem('lastVisit', today);
    
    // Session-Start für Wellness-Features
    CONFIG.sessionStartTime = Date.now();
    startPauseReminderTimer();
}

// ===== Navigation =====
function initNavigation() {
    // Mobile Menu Toggle
    elements.menuToggle?.addEventListener('click', () => {
        const isExpanded = elements.menuToggle.getAttribute('aria-expanded') === 'true';
        elements.menuToggle.setAttribute('aria-expanded', !isExpanded);
        elements.navLinks?.classList.toggle('active');
    });
    
    // Schließe Menü bei Klick auf Link
    elements.navLinks?.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            elements.navLinks.classList.remove('active');
            elements.menuToggle?.setAttribute('aria-expanded', 'false');
        });
    });
    
    // Navbar Scroll-Effekt
    let lastScrollY = window.scrollY;
    
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            elements.navbar?.classList.add('scrolled');
        } else {
            elements.navbar?.classList.remove('scrolled');
        }
        lastScrollY = window.scrollY;
    }, { passive: true });
}

// ===== Filter (Bewusste Auswahl, keine algorithmische Sortierung) =====
function initFilters() {
    // Event-Filter
    elements.filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Entferne active von allen
            elements.filterBtns.forEach(b => {
                b.classList.remove('active');
                b.setAttribute('aria-selected', 'false');
            });
            
            // Setze active auf geklickten
            btn.classList.add('active');
            btn.setAttribute('aria-selected', 'true');
            
            // Filter-Logik (transparent, keine versteckte Manipulation)
            const filter = btn.dataset.filter;
            filterEvents(filter);
        });
    });
    
    // Präferenz-Chips (freiwillig, nicht aufdringlich)
    elements.chips.forEach(chip => {
        chip.addEventListener('click', () => {
            chip.classList.toggle('active');
            
            // Speichere Präferenzen lokal (nicht auf Server)
            savePreferences();
        });
    });
}

function filterEvents(filter) {
    // Einfache, transparente Filter-Logik
    // Keine versteckte algorithmische Sortierung
    console.log(`Filter gewählt: ${filter}`);
    
    // In einer echten App würde hier die Event-Liste gefiltert
    // Wichtig: Keine Manipulation der Reihenfolge basierend auf Engagement-Metriken
}

function savePreferences() {
    const activeChips = Array.from(elements.chips)
        .filter(chip => chip.classList.contains('active'))
        .map(chip => chip.dataset.filter);
    
    // Speichere nur lokal - Nutzer hat volle Kontrolle
    localStorage.setItem('dietPreferences', JSON.stringify(activeChips));
}

// ===== Load More (Bewusste Entscheidung, KEIN Infinite Scroll) =====
function initLoadMore() {
    let loadCount = 0;
    const maxLoads = 2; // Maximale Nachladen-Vorgänge
    
    elements.loadMoreBtn?.addEventListener('click', () => {
        loadCount++;
        
        if (loadCount >= maxLoads) {
            // Bewusste Begrenzung mit Erklärung
            elements.loadMoreBtn.textContent = 'Du hast genug gesehen. Geh raus!';
            elements.loadMoreBtn.disabled = true;
            
            // Nach kurzer Zeit zurücksetzen
            setTimeout(() => {
                elements.loadMoreBtn.textContent = 'Morgen gibt es neue Events';
            }, 3000);
        } else {
            // Feedback über bewusste Entscheidung
            elements.loadMoreBtn.textContent = 'Lade weitere Tage...';
            
            // Simuliere Laden (in echter App: API-Call mit Limit)
            setTimeout(() => {
                elements.loadMoreBtn.textContent = 'Noch mehr anzeigen?';
            }, 1000);
        }
    });
}

// ===== Pause Reminder (Wellness-Feature) =====
let pauseTimerId = null;

function startPauseReminderTimer() {
    // Stoppe vorherigen Timer
    if (pauseTimerId) {
        clearTimeout(pauseTimerId);
    }
    
    // Starte neuen Timer
    const pauseTime = CONFIG.pauseReminderMinutes * 60 * 1000;
    
    pauseTimerId = setTimeout(() => {
        showPauseReminder();
    }, pauseTime);
}

function showPauseReminder() {
    if (elements.pauseReminder) {
        elements.pauseReminder.hidden = false;
    }
}

function hidePauseReminder() {
    if (elements.pauseReminder) {
        elements.pauseReminder.hidden = true;
    }
}

function initPauseReminder() {
    // Weitermachen - respektiere Entscheidung, aber starte Timer neu
    elements.continueBrowsing?.addEventListener('click', () => {
        hidePauseReminder();
        startPauseReminderTimer();
    });
    
    // Pause machen - positive Verstärkung
    elements.takeBreak?.addEventListener('click', () => {
        hidePauseReminder();
        
        // Zeige positive Nachricht
        alert('Gute Entscheidung! Das Echte passiert offline. 🌟');
        
        // Optional: Schließe Tab/Fenster (nur als Vorschlag)
        // window.close() funktioniert nur bei programmatisch geöffneten Fenstern
    });
}

// ===== Smooth Scroll (respektiert reduced-motion) =====
function initSmoothScroll() {
    // Prüfe ob Nutzer reduzierte Bewegung bevorzugt
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            
            if (target) {
                target.scrollIntoView({
                    behavior: prefersReducedMotion ? 'auto' : 'smooth',
                    block: 'start'
                });
                
                // Update active nav link
                updateActiveNavLink(this.getAttribute('href'));
            }
        });
    });
}

function updateActiveNavLink(href) {
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === href) {
            link.classList.add('active');
        }
    });
}

// ===== Usage Tracking (nur für Nutzer selbst, nicht für Engagement-Optimierung) =====
function initUsageTracking() {
    // Session-Zeit nur für Nutzer-Transparenz
    const updateUsageDisplay = () => {
        const sessionMinutes = Math.round((Date.now() - CONFIG.sessionStartTime) / 60000);
        const usageDisplay = document.querySelector('.stat-value');
        
        // Nur updaten wenn Element existiert und Session aktiv
        if (usageDisplay && sessionMinutes > 0) {
            // Wir tracken keine genaue Zeit - nur ungefähre Anzeige
            // usageDisplay.textContent = `~${sessionMinutes} min`;
        }
    };
    
    // Update alle 5 Minuten (nicht sekündlich - kein Stress)
    setInterval(updateUsageDisplay, 5 * 60 * 1000);
}

// ===== Stories (begrenzt, mit klarem Ende) =====
function initStories() {
    const storyItems = document.querySelectorAll('.story-item');
    let viewedCount = 0;
    const totalStories = storyItems.length;
    
    storyItems.forEach(story => {
        story.addEventListener('click', () => {
            // Markiere als gesehen
            if (!story.classList.contains('viewed')) {
                story.classList.add('viewed');
                viewedCount++;
                
                // Prüfe ob alle gesehen
                if (viewedCount >= totalStories) {
                    showStoriesEnd();
                }
            }
            
            // Hier würde Story-Modal öffnen
            // Wichtig: Kein automatisches Weiterschalten!
            console.log('Story geöffnet - manuelle Navigation erforderlich');
        });
    });
}

function showStoriesEnd() {
    const storiesEnd = document.querySelector('.stories-end');
    if (storiesEnd) {
        storiesEnd.style.display = 'block';
        storiesEnd.innerHTML = `
            <p>🎉 Das waren alle Highlights von heute.</p>
            <p style="margin-top: 0.5rem; font-size: 0.85rem;">Morgen gibt es neue Geschichten.</p>
        `;
    }
}

// ===== Toggle Switches (Benachrichtigungen) =====
function initToggles() {
    const toggles = document.querySelectorAll('.toggle input');
    
    toggles.forEach(toggle => {
        toggle.addEventListener('change', () => {
            // Speichere Einstellung lokal
            const settingName = toggle.closest('.setting-row')?.querySelector('span')?.textContent;
            const isEnabled = toggle.checked;
            
            // Lokale Speicherung - Nutzer hat Kontrolle
            const settings = JSON.parse(localStorage.getItem('notificationSettings') || '{}');
            settings[settingName] = isEnabled;
            localStorage.setItem('notificationSettings', JSON.stringify(settings));
            
            console.log(`Einstellung "${settingName}": ${isEnabled ? 'aktiviert' : 'deaktiviert'}`);
        });
    });
    
    // Lade gespeicherte Einstellungen
    loadSavedToggles();
}

function loadSavedToggles() {
    const settings = JSON.parse(localStorage.getItem('notificationSettings') || '{}');
    
    document.querySelectorAll('.setting-row').forEach(row => {
        const settingName = row.querySelector('span')?.textContent;
        const toggle = row.querySelector('.toggle input');
        
        if (settingName && toggle && settings[settingName] !== undefined) {
            toggle.checked = settings[settingName];
        }
    });
}

// ===== Interest Tags =====
function initInterestTags() {
    const tags = document.querySelectorAll('.interest-tags .tag');
    
    tags.forEach(tag => {
        tag.addEventListener('click', () => {
            tag.classList.toggle('active');
            
            // Speichere Interessen lokal
            const activeInterests = Array.from(document.querySelectorAll('.interest-tags .tag.active'))
                .map(t => t.textContent);
            
            localStorage.setItem('interests', JSON.stringify(activeInterests));
        });
    });
    
    // Lade gespeicherte Interessen
    loadSavedInterests();
}

function loadSavedInterests() {
    const savedInterests = JSON.parse(localStorage.getItem('interests') || '[]');
    
    document.querySelectorAll('.interest-tags .tag').forEach(tag => {
        if (savedInterests.includes(tag.textContent)) {
            tag.classList.add('active');
        }
    });
}

// ===== Analytics (Ethisch: Fokus auf Event-Teilnahme, nicht Micro-Engagement) =====
const ethicalAnalytics = {
    // Wir tracken NICHT:
    // - Scroll-Tiefe
    // - Klick-Ketten
    // - Verweildauer pro Element
    // - Micro-Interactions
    
    // Wir tracken NUR (anonymisiert, aggregiert):
    trackEventInterest: (eventId) => {
        // Nur wenn Nutzer explizit "Hingehen" klickt
        console.log(`[Analytics] Event-Interesse: ${eventId}`);
    },
    
    trackEventAttendance: (eventId) => {
        // Nur bei tatsächlicher Teilnahme (Check-in vor Ort)
        console.log(`[Analytics] Event-Teilnahme: ${eventId}`);
    }
};

// ===== Event Listeners für Buttons =====
function initEventButtons() {
    // "Hingehen" Buttons
    document.querySelectorAll('.event-actions .btn-primary').forEach(btn => {
        btn.addEventListener('click', () => {
            const eventCard = btn.closest('.event-card');
            const eventTitle = eventCard?.querySelector('.event-title')?.textContent;
            
            // Bewusste Entscheidung - kein sofortiges Tracking
            // Zeige Bestätigung
            if (confirm(`Möchtest du zum Event "${eventTitle}" gehen?`)) {
                ethicalAnalytics.trackEventInterest(eventTitle);
                btn.textContent = '✓ Gespeichert';
                btn.disabled = true;
            }
        });
    });
    
    // "Für später speichern" Buttons
    document.querySelectorAll('.event-actions .btn-secondary').forEach(btn => {
        btn.addEventListener('click', () => {
            const eventCard = btn.closest('.event-card');
            const eventTitle = eventCard?.querySelector('.event-title')?.textContent;
            
            // Speichere lokal
            const savedEvents = JSON.parse(localStorage.getItem('savedEvents') || '[]');
            if (!savedEvents.includes(eventTitle)) {
                savedEvents.push(eventTitle);
                localStorage.setItem('savedEvents', JSON.stringify(savedEvents));
            }
            
            btn.textContent = '✓ Gespeichert';
            btn.disabled = true;
        });
    });
}

// ===== Initialisierung =====
document.addEventListener('DOMContentLoaded', () => {
    initIntroAnimation();
    initNavigation();
    initFilters();
    initLoadMore();
    initPauseReminder();
    initSmoothScroll();
    initUsageTracking();
    initStories();
    initToggles();
    initInterestTags();
    initEventButtons();
    
    // Starte Pause-Timer wenn Intro bereits versteckt
    if (elements.introOverlay?.classList.contains('hidden')) {
        startPauseReminderTimer();
    }
    
    console.log('🌱 Sabor a mi tierra - Ethical Design loaded');
    console.log('📋 Prinzipien: Autonomie, bewusste Nutzung, klare Endpunkte');
});

// ===== Service Worker Registration (für Offline-Fähigkeit) =====
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        // Service Worker würde hier registriert
        // Wichtig: Keine Push-Notifications ohne explizite Zustimmung
        console.log('Service Worker: Bereit für Offline-Nutzung');
    });
}
