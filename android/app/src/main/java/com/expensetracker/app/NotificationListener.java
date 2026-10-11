package com.expensetracker.app;

import android.app.Notification;
import android.os.Bundle;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;

/**
 * Listens for payment notifications (Samsung Pay, UPI apps, bank push alerts)
 * and dispatches them directly to the app WebView bridge.
 * Contains zero logging to protect user financial privacy.
 */
public class NotificationListener extends NotificationListenerService {

    private static final String[] PAYMENT_PACKAGES = {
        "com.samsung.android.spay",              // Samsung Pay
        "com.samsung.android.raja.spay",         // Samsung Pay Mini / Samsung Wallet
        "com.samsung.android.app.spay",          // Samsung Wallet
        "com.google.android.apps.nbu.paisa.user", // Google Pay
        "com.phonepe.app",                       // PhonePe
        "net.one97.paytm",                       // Paytm
        "com.dreamplug.androidapp",              // CRED
        "in.org.npci.upiapp",                    // BHIM
        "com.axis.mobile",                       // Axis Bank
        "com.msf.kbank.mobile",                  // Kotak Bank
        "com.csam.icici.bank.imobile",           // ICICI iMobile
        "com.snapwork.hdfc",                     // HDFC Bank
        "com.sbi.lotusintouch"                   // SBI YONO
    };

    @Override
    public void onNotificationPosted(StatusBarNotification sbn) {
        if (sbn == null) return;

        String packageName = sbn.getPackageName();
        if (packageName == null || !isPaymentPackage(packageName)) return;

        Notification notification = sbn.getNotification();
        if (notification == null) return;

        Bundle extras = notification.extras;
        if (extras == null) return;

        CharSequence titleCs = extras.getCharSequence(Notification.EXTRA_TITLE);
        CharSequence textCs = extras.getCharSequence(Notification.EXTRA_TEXT);
        CharSequence bigTextCs = extras.getCharSequence(Notification.EXTRA_BIG_TEXT);

        String title = titleCs != null ? titleCs.toString() : "";
        String text = bigTextCs != null ? bigTextCs.toString() : (textCs != null ? textCs.toString() : "");

        if (title.isEmpty() && text.isEmpty()) return;

        long postTime = sbn.getPostTime();
        if (postTime <= 0) {
            postTime = System.currentTimeMillis();
        }

        // Dispatch securely to UI (zero logging)
        MainActivity.dispatchIncomingNotification(packageName, title, text, postTime);
    }

    private boolean isPaymentPackage(String pkg) {
        if (pkg == null) return false;
        String lower = pkg.toLowerCase();
        if (lower.contains("spay") || lower.contains("samsungpay") || lower.contains("samsungwallet")) {
            return true;
        }
        for (String target : PAYMENT_PACKAGES) {
            if (pkg.equalsIgnoreCase(target)) {
                return true;
            }
        }
        return false;
    }
}
