/* =========================================================
   NATIVE TOUCH & GESTURE OPTIMIZATIONS
   Disables pinch-to-zoom, suppresses double-tap zoom,
   and enables native Android haptic feel.
========================================================= */

(function() {
    'use strict';

    // 1. Suppress pinch zoom gestures (Safari & WebKit WebViews)
    document.addEventListener('gesturestart', function(e) {
        e.preventDefault();
    }, { passive: false });

    document.addEventListener('gesturechange', function(e) {
        e.preventDefault();
    }, { passive: false });

    document.addEventListener('gestureend', function(e) {
        e.preventDefault();
    }, { passive: false });

    // 2. Prevent multi-touch zoom on Android & iOS WebViews
    document.addEventListener('touchstart', function(e) {
        if (e.touches.length > 1) {
            e.preventDefault();
        }
    }, { passive: false });

    // 3. Prevent double-tap to zoom on mobile screens while allowing normal double clicks on text
    let lastTouchEnd = 0;
    document.addEventListener('touchend', function(e) {
        const now = Date.now();
        const target = e.target;
        const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
        
        if (!isInput && now - lastTouchEnd <= 320) {
            e.preventDefault();
        }
        lastTouchEnd = now;
    }, { passive: false });

    // 4. Subtle Android haptic feedback utility
    window.triggerNativeHaptic = function(intensity = 'light') {
        try {
            if (window.AndroidBridge && typeof window.AndroidBridge.vibrate === 'function') {
                window.AndroidBridge.vibrate(intensity === 'heavy' ? 40 : (intensity === 'medium' ? 25 : 12));
            } else if (window.navigator && typeof window.navigator.vibrate === 'function') {
                window.navigator.vibrate(intensity === 'heavy' ? 40 : (intensity === 'medium' ? 25 : 12));
            }
        } catch (_) {
            // Ignore if vibration is blocked or unsupported
        }
    };

    // 5. Attach haptic feedback on interactive controls
    document.addEventListener('DOMContentLoaded', function() {
        const interactiveSelectors = [
            'button',
            '.type-button',
            '.cat-pill',
            '.account-chip',
            '.quick-amt-chip',
            '.nav-item',
            '.transaction-item',
            '.settings-item',
            '.sugg-chip'
        ];

        document.body.addEventListener('click', function(e) {
            const btn = e.target.closest(interactiveSelectors.join(','));
            if (btn) {
                window.triggerNativeHaptic('light');
            }
        });
    });

    // 6. Check if running inside native Android WebView
    window.isNativeAndroidApp = function() {
        return Boolean(window.AndroidBridge);
    };

})();
