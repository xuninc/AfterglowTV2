package tv.afterglow.app

import android.os.Bundle
import android.webkit.WebSettings
import android.webkit.WebView
import com.getcapacitor.BridgeActivity

class MainActivity : BridgeActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // Native Performance and Video Optimizer for Android App Shell
        val webView = this.bridge?.webView
        if (webView != null) {
            configureNativeWebViewSettings(webView)
        }
    }

    private fun configureNativeWebViewSettings(webView: WebView) {
        val settings = webView.settings
        
        // Enable mixed content to allow native playback of custom HTTP/HLS IPTV video feeds
        settings.mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
        
        // Performance optimizations for modern streaming IPTV players
        settings.mediaPlaybackRequiresUserGesture = false
        settings.domStorageEnabled = true
        settings.databaseEnabled = true
        settings.javaScriptEnabled = true
        settings.useWideViewPort = true
        settings.loadWithOverviewMode = true
        
        // Enable Hardware Acceleration for rendering high framerate stream layouts
        settings.cacheMode = WebSettings.LOAD_DEFAULT
        webView.setLayerType(WebView.LAYER_TYPE_HARDWARE, null)
    }
}
