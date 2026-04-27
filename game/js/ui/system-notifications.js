// system-notifications.js - LitRPG style notification popups

const SystemNotifications = (() => {
    let container = null;
    let currentNotification = null;
    let notificationQueue = [];
    let isShowing = false;

    // Notification types with styling
    const NOTIFICATION_TYPES = {
        system: {
            title: 'CHROMATIC SYSTEM',
            borderColor: '#d4a574',
            glowColor: 'rgba(212, 165, 116, 0.3)'
        },
        warning: {
            title: '! WARNING !',
            borderColor: '#8b3a3a',
            glowColor: 'rgba(139, 58, 58, 0.4)'
        },
        levelUp: {
            title: '★ LEVEL UP ★',
            borderColor: '#ffd700',
            glowColor: 'rgba(255, 215, 0, 0.4)'
        },
        discovery: {
            title: '◆ DISCOVERY ◆',
            borderColor: '#7a5aaa',
            glowColor: 'rgba(122, 90, 170, 0.4)'
        },
        story: {
            title: '~ REVELATION ~',
            borderColor: '#4a6fa5',
            glowColor: 'rgba(74, 111, 165, 0.4)'
        },
        tutorial: {
            title: 'TUTORIAL',
            borderColor: '#5a8a5a',
            glowColor: 'rgba(90, 138, 90, 0.3)'
        }
    };

    function init() {
        createContainer();
        console.log('SystemNotifications initialized');
    }

    function createContainer() {
        container = document.createElement('div');
        container.id = 'system-notifications';
        container.className = 'system-notifications';
        document.body.appendChild(container);
    }

    /**
     * Show a notification popup
     * @param {Object} options - Notification options
     * @param {string} options.type - Notification type (system, warning, levelUp, discovery, story, tutorial)
     * @param {string} options.subtitle - Optional subtitle below the title
     * @param {string[]} options.lines - Array of text lines for the body
     * @param {string} options.hint - Optional hint text at the bottom (e.g., "[Press SPACE to continue]")
     * @param {number} options.duration - Auto-dismiss duration in ms (0 = manual dismiss)
     * @param {Function} options.onDismiss - Callback when notification is dismissed
     */
    function show(options) {
        const notification = {
            type: options.type || 'system',
            subtitle: options.subtitle || null,
            lines: options.lines || [],
            hint: options.hint || null,
            duration: options.duration !== undefined ? options.duration : 0,
            onDismiss: options.onDismiss || null
        };

        if (isShowing) {
            // Queue the notification
            notificationQueue.push(notification);
            return;
        }

        displayNotification(notification);
    }

    function displayNotification(notification) {
        isShowing = true;
        currentNotification = notification;

        const typeConfig = NOTIFICATION_TYPES[notification.type] || NOTIFICATION_TYPES.system;

        // Create notification element
        const element = document.createElement('div');
        element.className = 'system-notification';
        element.style.setProperty('--border-color', typeConfig.borderColor);
        element.style.setProperty('--glow-color', typeConfig.glowColor);

        // Build the content with ASCII-style borders
        let html = `
            <div class="notification-border-top">╔${'═'.repeat(50)}╗</div>
            <div class="notification-header">
                <span class="notification-title">${typeConfig.title}</span>
            </div>
            <div class="notification-divider">╠${'═'.repeat(50)}╣</div>
        `;

        // Add subtitle if present
        if (notification.subtitle) {
            html += `<div class="notification-subtitle">${notification.subtitle}</div>`;
        }

        // Add body lines
        html += '<div class="notification-body">';
        for (const line of notification.lines) {
            html += `<div class="notification-line">${line}</div>`;
        }
        html += '</div>';

        // Add hint if present
        if (notification.hint) {
            html += `<div class="notification-hint">${notification.hint}</div>`;
        }

        html += `<div class="notification-border-bottom">╚${'═'.repeat(50)}╝</div>`;

        element.innerHTML = html;

        // Add click handler to dismiss
        element.addEventListener('click', () => dismiss());

        // Add keyboard handler
        const keyHandler = (e) => {
            if (e.code === 'Space' || e.code === 'Enter' || e.code === 'Escape') {
                e.preventDefault();
                dismiss();
                document.removeEventListener('keydown', keyHandler);
            }
        };
        document.addEventListener('keydown', keyHandler);

        container.appendChild(element);

        // Trigger entrance animation
        requestAnimationFrame(() => {
            element.classList.add('visible');
        });

        // Auto-dismiss if duration set
        if (notification.duration > 0) {
            setTimeout(() => {
                if (currentNotification === notification) {
                    dismiss();
                }
            }, notification.duration);
        }
    }

    function dismiss() {
        if (!isShowing || !container.firstChild) return;

        const element = container.firstChild;
        element.classList.remove('visible');
        element.classList.add('dismissing');

        // Callback
        if (currentNotification && currentNotification.onDismiss) {
            currentNotification.onDismiss();
        }

        setTimeout(() => {
            if (element.parentNode) {
                element.remove();
            }

            isShowing = false;
            currentNotification = null;

            // Show next queued notification
            if (notificationQueue.length > 0) {
                const next = notificationQueue.shift();
                displayNotification(next);
            }
        }, 300);
    }

    // Convenience methods for common notifications

    function showTutorial(subtitle, lines, hint = '[Click or press SPACE to continue]') {
        show({
            type: 'tutorial',
            subtitle,
            lines,
            hint
        });
    }

    function showWarning(subtitle, lines, hint = null) {
        show({
            type: 'warning',
            subtitle,
            lines,
            hint
        });
    }

    function showLevelUp(level, unlocks) {
        const lines = [
            `CHROMANCER LEVEL ${level} ACHIEVED`,
            '',
            'The colors respond more eagerly to your call now.',
            'Your resonance with this world deepens.',
            '',
            'UNLOCKED:'
        ];

        for (const unlock of unlocks) {
            lines.push(`+ ${unlock}`);
        }

        show({
            type: 'levelUp',
            lines,
            hint: '[Click to continue]'
        });
    }

    function showStoryReveal(lines) {
        show({
            type: 'story',
            lines,
            hint: '[Click to continue]'
        });
    }

    function showDiscovery(subtitle, lines) {
        show({
            type: 'discovery',
            subtitle,
            lines,
            duration: 4000
        });
    }

    function showSystem(subtitle, lines, duration = 0) {
        show({
            type: 'system',
            subtitle,
            lines,
            hint: duration === 0 ? '[Click to continue]' : null,
            duration
        });
    }

    // Show the initial tutorial sequence
    function showIntroSequence() {
        show({
            type: 'system',
            subtitle: 'CHROMATIC SYSTEM v1.0 INITIALIZED',
            lines: [
                'Host: [UNNAMED ARTIST]',
                'Class: Chromancer (Unawakened)',
                '',
                'NOTICE: This realm requires color to sustain life.',
                'You have been granted the ability to EXTRACT and',
                'CHANNEL chromatic essence.',
                '',
                'WARNING: The Bleaching approaches. Preserve what you',
                'can. Restore what you must.'
            ],
            hint: '[Click to continue]',
            onDismiss: () => {
                // Show extraction tutorial after intro
                setTimeout(() => {
                    showTutorial('EXTRACTION', [
                        'You feel it now, don\'t you? The colors calling to you.',
                        'Each hue contains essence - power waiting to be',
                        'channeled.',
                        '',
                        'Focus on a vibrant area. Draw the color toward you.',
                        'But remember: what you take cannot be returned.',
                        '',
                        '[Click and hold on colored areas to EXTRACT]'
                    ]);
                }, 500);
            }
        });
    }

    // Show combat intro notification
    function showCombatIntro(enemyName, colorCounts) {
        const colorList = Object.entries(colorCounts)
            .filter(([_, count]) => count > 0)
            .map(([color, count]) => `${color.charAt(0).toUpperCase() + color.slice(1)} (${count})`)
            .join(' | ');

        show({
            type: 'warning',
            subtitle: 'VOID ENTITY DETECTED',
            lines: [
                `${enemyName} blocks your path.`,
                '',
                'The darkness ahead moves with hunger. It has consumed',
                'this room\'s color entirely - only shadow remains.',
                '',
                'Your extracted essence is your only weapon.',
                'Paint it out of existence.',
                '',
                colorList ? `[${colorList}]` : '[No colors available - basic attack only]'
            ],
            hint: '[Click to begin combat]'
        });
    }

    return {
        init,
        show,
        dismiss,
        showTutorial,
        showWarning,
        showLevelUp,
        showStoryReveal,
        showDiscovery,
        showSystem,
        showIntroSequence,
        showCombatIntro
    };
})();

// Expose to window
window.SystemNotifications = SystemNotifications;
