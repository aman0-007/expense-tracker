package com.expensetracker.app;

import android.Manifest;
import android.content.Context;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.os.VibratorManager;
import android.view.View;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import org.json.JSONArray;
import org.json.JSONObject;

import java.lang.ref.WeakReference;

public class MainActivity extends AppCompatActivity {

    private static final int SMS_PERMISSION_REQUEST_CODE = 101;
    private static WeakReference<MainActivity> currentInstance;

    private WebView webView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        currentInstance = new WeakReference<>(this);

        webView = new WebView(this);
        setContentView(webView);

        configureWebView();

        // Load packaged web assets
        webView.loadUrl("file:///android_asset/public/index.html");
    }

    private void configureWebView() {
        WebSettings settings = webView.getSettings();

        // Core web app settings
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setAllowFileAccessFromFileURLs(true);
        settings.setAllowUniversalAccessFromFileURLs(true);

        // Disable all zoom gestures to ensure a native Android feel
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);

        // Native performance & caching
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        webView.setOverScrollMode(View.OVER_SCROLL_NEVER);
        webView.setVerticalScrollBarEnabled(false);
        webView.setHorizontalScrollBarEnabled(false);

        // Ensure full touch and click focus
        webView.setClickable(true);
        webView.setFocusable(true);
        webView.setFocusableInTouchMode(true);
        webView.requestFocus();

        // Setup clients
        webView.setWebChromeClient(new WebChromeClient());
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return false; // Keep navigation within WebView
            }
        });

        // Register Native JavaScript Bridge
        webView.addJavascriptInterface(new AndroidSmsBridge(this), "AndroidBridge");
    }

    public static void dispatchIncomingSms(String address, String body, long timestamp) {
        if (currentInstance == null) return;
        MainActivity activity = currentInstance.get();
        if (activity == null || activity.webView == null) return;

        activity.runOnUiThread(() -> {
            try {
                JSONObject json = new JSONObject();
                json.put("address", address);
                json.put("body", body);
                json.put("date", timestamp);
                String script = "if (window.onNativeSmsReceived) { window.onNativeSmsReceived(" + json.toString() + "); }";
                activity.webView.evaluateJavascript(script, null);
            } catch (Exception ignored) {
                // Keep zero logging of SMS contents
            }
        });
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions, @NonNull int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == SMS_PERMISSION_REQUEST_CODE) {
            boolean granted = grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED;
            if (webView != null) {
                String script = "if (window.onSmsPermissionResult) { window.onSmsPermissionResult(" + granted + "); }";
                webView.evaluateJavascript(script, null);
            }
        }
    }

    public class AndroidSmsBridge {
        private final Context context;

        public AndroidSmsBridge(Context context) {
            this.context = context;
        }

        @JavascriptInterface
        public boolean isNativeApp() {
            return true;
        }

        @JavascriptInterface
        public boolean hasSmsPermission() {
            return ContextCompat.checkSelfPermission(context, Manifest.permission.READ_SMS) == PackageManager.PERMISSION_GRANTED;
        }

        @JavascriptInterface
        public void requestSmsPermission() {
            ActivityCompat.requestPermissions(MainActivity.this,
                    new String[]{Manifest.permission.READ_SMS, Manifest.permission.RECEIVE_SMS},
                    SMS_PERMISSION_REQUEST_CODE);
        }

        @JavascriptInterface
        public String readInboxSms(int limit) {
            return readInboxSmsSince(0, limit);
        }

        @JavascriptInterface
        public String readInboxSmsSince(long sinceTimestamp, int limit) {
            if (!hasSmsPermission()) {
                requestSmsPermission();
                return "PERMISSION_REQUESTED";
            }

            JSONArray messages = new JSONArray();
            // Fetch all messages when limit <= 0 without arbitrary capping
            int maxCandidates = limit > 0 ? limit : 50000;

            String selection = null;
            String[] selectionArgs = null;
            if (sinceTimestamp > 0) {
                selection = "date > ?";
                selectionArgs = new String[]{String.valueOf(sinceTimestamp)};
            }

            Uri[] candidateUris = new Uri[]{
                    Uri.parse("content://sms/inbox"),
                    Uri.parse("content://sms")
            };

            for (Uri uri : candidateUris) {
                if (messages.length() > 0) break;

                try {
                    String[] projection = new String[]{"_id", "address", "body", "date"};

                    // Query sorted by date DESC
                    Cursor cursor = context.getContentResolver().query(
                            uri,
                            projection,
                            selection,
                            selectionArgs,
                            "date DESC"
                    );

                    if (cursor != null) {
                        try {
                            int idCol = cursor.getColumnIndex("_id");
                            int addrCol = cursor.getColumnIndex("address");
                            int bodyCol = cursor.getColumnIndex("body");
                            int dateCol = cursor.getColumnIndex("date");

                            while (cursor.moveToNext() && messages.length() < maxCandidates) {
                                long msgDate = dateCol >= 0 ? cursor.getLong(dateCol) : System.currentTimeMillis();
                                if (sinceTimestamp > 0 && msgDate <= sinceTimestamp) {
                                    break;
                                }

                                String body = bodyCol >= 0 ? cursor.getString(bodyCol) : null;
                                if (body == null || body.trim().isEmpty()) {
                                    continue;
                                }

                                String lower = body.toLowerCase(java.util.Locale.ROOT);

                                // 1. Fast Native Exclusion: Skip OTPs, verification codes, logins, upcoming debits, autopay schedules, mandates, payment reminders
                                if (lower.contains("otp") || lower.contains("verification code") ||
                                    lower.contains("do not share") || lower.contains("login password") ||
                                    lower.contains("secret code") || lower.contains("m-pin") || lower.contains("upi pin") ||
                                    lower.contains("will be debited") || lower.contains("shall be debited") || lower.contains("would be debited") ||
                                    lower.contains("upcoming payment") || lower.contains("upcoming debit") || lower.contains("upcoming sip") ||
                                    lower.contains("is scheduled") || lower.contains("scheduled on") || lower.contains("scheduled for") || lower.contains("scheduled to") ||
                                    lower.contains("autopay for") || lower.contains("autopay request") ||
                                    lower.contains("mandate set up") || lower.contains("mandate created") || lower.contains("mandate registered") ||
                                    lower.contains("mandate approved") || lower.contains("mandate request") || lower.contains("e-mandate") ||
                                    lower.contains("ensure sufficient balance") || lower.contains("sufficient balance in your") || lower.contains("maintain sufficient balance") ||
                                    lower.contains("payment reminder") || lower.contains("bill reminder") || lower.contains("due date is") || lower.contains("is due on") ||
                                    lower.contains("requested money") || lower.contains("payment request") ||
                                    lower.contains("pre-approved") || lower.contains("apply now") ||
                                    lower.contains("credit limit") ||
                                    lower.contains("transaction failed") || lower.contains("payment failed") || lower.contains("declined") || lower.contains("unsuccessful")) {
                                    continue;
                                }

                                // 2. Fast Native Inclusion: Must contain an executed financial keyword
                                boolean isFin = lower.contains("debited") || lower.contains("credited") ||
                                                lower.contains("spent") || lower.contains("paid") ||
                                                lower.contains("withdrawn") || lower.contains("transferred") || lower.contains("trf to") ||
                                                lower.contains("refund") || lower.contains("cashback") ||
                                                lower.contains("received rs") || lower.contains("received inr") || lower.contains("deposited") ||
                                                lower.contains("dr ") || lower.contains("dr.") || lower.contains("cr ") || lower.contains("cr.") ||
                                                lower.contains("sent rs") || lower.contains("sent inr") || lower.contains("sent to") ||
                                                lower.contains("purchase") || lower.contains("used at") ||
                                                lower.contains("sip") || lower.contains("mutual fund");

                                if (!isFin) {
                                    continue;
                                }

                                JSONObject msg = new JSONObject();
                                msg.put("id", idCol >= 0 ? cursor.getString(idCol) : String.valueOf(messages.length()));
                                msg.put("address", addrCol >= 0 ? cursor.getString(addrCol) : "");
                                msg.put("body", body);
                                msg.put("date", msgDate);
                                messages.put(msg);
                            }
                        } finally {
                            cursor.close();
                        }
                    }
                } catch (Exception ignored) {
                    // Do not log sensitive SMS content
                }
            }

            return messages.toString();
        }

        @JavascriptInterface
        public void startSmsWatch() {
            if (!hasSmsPermission()) {
                requestSmsPermission();
            }
        }

        @JavascriptInterface
        public void stopSmsWatch() {
            // Passive listener handled by SmsReceiver
        }

        @JavascriptInterface
        public void vibrate(int durationMs) {
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                    VibratorManager manager = (VibratorManager) context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE);
                    if (manager != null) {
                        manager.getDefaultVibrator().vibrate(VibrationEffect.createOneShot(durationMs, VibrationEffect.DEFAULT_AMPLITUDE));
                    }
                } else {
                    Vibrator vibrator = (Vibrator) context.getSystemService(Context.VIBRATOR_SERVICE);
                    if (vibrator != null && vibrator.hasVibrator()) {
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                            vibrator.vibrate(VibrationEffect.createOneShot(durationMs, VibrationEffect.DEFAULT_AMPLITUDE));
                        } else {
                            vibrator.vibrate(durationMs);
                        }
                    }
                }
            } catch (Exception ignored) {}
        }

        @JavascriptInterface
        public void showToast(String message) {
            Toast.makeText(context, message, Toast.LENGTH_SHORT).show();
        }

        @JavascriptInterface
        public void setStatusBarTheme(final String theme) {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    try {
                        boolean isLight = !"dark".equalsIgnoreCase(theme);
                        int color = Color.parseColor(isLight ? "#F9F8F6" : "#111318");
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                            getWindow().setStatusBarColor(color);
                            getWindow().setNavigationBarColor(color);
                        }
                        View decor = getWindow().getDecorView();
                        int flags = decor.getSystemUiVisibility();
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                            if (isLight) {
                                flags |= View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
                            } else {
                                flags &= ~View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
                            }
                        }
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                            if (isLight) {
                                flags |= View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
                            } else {
                                flags &= ~View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
                            }
                        }
                        decor.setSystemUiVisibility(flags);
                    } catch (Exception ignored) {}
                }
            });
        }
    }
}
