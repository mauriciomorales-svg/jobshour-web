package cl.dondemorales.jobshour;

import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.net.Uri;
import android.util.Log;
import androidx.browser.customtabs.CustomTabsIntent;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.List;

@CapacitorPlugin(name = "OAuthHelper")
public class OAuthHelperPlugin extends Plugin {

    @PluginMethod
    public void openExternalBrowser(PluginCall call) {
        String url = call.getString("url");
        Log.d("OAuthHelper", "openExternalBrowser called with url: " + url);
        if (url == null || url.isEmpty()) {
            call.reject("URL is required");
            return;
        }

        Activity activity = getActivity();
        if (activity == null) {
            call.reject("Activity not found");
            return;
        }

        try {
            // Crear Custom Tabs Intent
            CustomTabsIntent.Builder builder = new CustomTabsIntent.Builder();
            builder.setShowTitle(true);
            builder.setColorScheme(CustomTabsIntent.COLOR_SCHEME_LIGHT);
            
            CustomTabsIntent customTabsIntent = builder.build();
            
            // Verificar si hay navegador disponible
            PackageManager pm = activity.getPackageManager();
            Intent testIntent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
            List<ResolveInfo> resolveInfos = pm.queryIntentActivities(testIntent, 0);
            
            if (resolveInfos.isEmpty()) {
                // Fallback: abrir con intent normal
                Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                activity.startActivity(intent);
            } else {
                // Usar Chrome Custom Tabs
                customTabsIntent.launchUrl(activity, Uri.parse(url));
            }
            
            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
            
        } catch (Exception e) {
            call.reject("Error opening browser: " + e.getMessage());
        }
    }
}
