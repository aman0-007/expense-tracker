# Add project specific ProGuard rules here.
-keepclassmembers class com.expensetracker.app.MainActivity$AndroidSmsBridge {
   public *;
}
-keepattributes JavascriptInterface
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
