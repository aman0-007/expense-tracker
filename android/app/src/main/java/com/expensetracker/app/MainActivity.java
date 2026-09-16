package com.expensetracker.app;

import android.Manifest;
import android.content.Context;
import android.content.pm.PackageManager;
import android.database.Cursor;
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
            } catch (Exception e) {
                e.printStackTrace();
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
            if (!hasSmsPermission()) {
                requestSmsPermission();
                return "[]";
            }

            JSONArray messages = new JSONArray();
            Uri inboxUri = Uri.parse("content://sms/inbox");
            String[] projection = new String[]{"_id", "address", "body", "date"};
            int max = limit > 0 ? limit : 50;

            try (Cursor cursor = context.getContentResolver().query(
                    inboxUri, projection, null, null, "date DESC LIMIT " + max)) {

                if (cursor != null && cursor.moveToFirst()) {
                    int idCol = cursor.getColumnIndex("_id");
                    int addrCol = cursor.getColumnIndex("address");
                    int bodyCol = cursor.getColumnIndex("body");
                    int dateCol = cursor.getColumnIndex("date");

                    do {
                        JSONObject msg = new JSONObject();
                        msg.put("id", cursor.getString(idCol));
                        msg.put("address", cursor.getString(addrCol));
                        msg.put("body", cursor.getString(bodyCol));
                        msg.put("date", cursor.getLong(dateCol));
                        messages.put(msg);
                    } while (cursor.moveToNext());
                }
            } catch (Exception e) {
                e.printStackTrace();
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
    }
}
