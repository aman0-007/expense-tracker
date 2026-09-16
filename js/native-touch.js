/* =========================================================
   NATIVE TOUCH & INTERACTION CONTROLS
   Native Android haptic feel, ripple feedback,
   and unblocked click & touch responsiveness.
========================================================= */

(function() {
    'use strict';

    // 1. Safe Android haptic feedback utility
    window.triggerNativeHaptic = function(intensity = 'light') {
        try {
            if (window.AndroidBridge && typeof window.AndroidBridge.vibrate === 'function') {
                const ms = intensity === 'heavy' ? 35 : (intensity === 'medium' ? 20 : 10);
                window.AndroidBridge.vibrate(ms);
            } else if (window.navigator && typeof window.navigator.vibrate === 'function') {
                const ms = intensity === 'heavy' ? 35 : (intensity === 'medium' ? 20 : 10);
                window.navigator.vibrate(ms);
            }
        } catch (_) {
            // Ignore if vibration is blocked or unsupported
        }
    };

    // 2. Attach lightweight haptic feedback on interactive controls
    document.addEventListener('DOMContentLoaded', function() {
        const interactiveSelectors = [
            'button',
            'a',
            '.type-button',
            '.cat-pill',
            '.account-chip',
            '.quick-amt-chip',
            '.nav-item',
            '.transaction-item',
            '.settings-item',
            '.sugg-chip',
            '.floating-add',
            '.modal-close'
        ];

        document.body.addEventListener('click', function(e) {
            const btn = e.target.closest(interactiveSelectors.join(','));
            if (btn) {
                window.triggerNativeHaptic('light');
            }
        }, { passive: true });
    });

    // 3. Check if running inside native Android WebView
    window.isNativeAndroidApp = function() {
        return Boolean(window.AndroidBridge);
    };

})();

