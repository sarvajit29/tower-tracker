package com.techavengers.towertracker

import android.Manifest
import android.annotation.SuppressLint
import android.content.Context
import android.content.pm.PackageManager
import android.location.Location
import android.location.LocationListener
import android.location.LocationManager
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.telephony.CellInfo
import android.telephony.CellInfoEmpty
import android.telephony.CellInfoLte
import android.telephony.CellInfoGsm
import android.telephony.CellInfoWcdma
import android.telephony.TelephonyManager
import android.webkit.GeolocationPermissions
import android.webkit.JavascriptInterface
import android.webkit.WebChromeClient
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Info
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import org.json.JSONObject
import java.util.Timer
import java.util.TimerTask

class MainActivity : ComponentActivity() {

    private lateinit var locationManager: LocationManager
    private lateinit var telephonyManager: TelephonyManager
    private var webView: WebView? = null

    // Track active live attributes for JS Bridge
    private var liveSignalStrength = -82
    private var networkOperator = "Jio"
    private var networkType = "5G"
    private var userLatitude = 12.9716
    private var userLongitude = 77.5946
    private var isOfflineMode = false

    // Simulation updates timer
    private var simulationTimer: Timer? = null

    private val permissionRequestLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        val fineGranted = permissions[Manifest.permission.ACCESS_FINE_LOCATION] ?: false
        val coarseGranted = permissions[Manifest.permission.ACCESS_COARSE_LOCATION] ?: false
        val phoneGranted = permissions[Manifest.permission.READ_PHONE_STATE] ?: false

        if (fineGranted || coarseGranted) {
            startLocationUpdates()
        }
        if (phoneGranted) {
            readNativeTelephonyMetrics()
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        locationManager = getSystemService(Context.LOCATION_SERVICE) as LocationManager
        telephonyManager = getSystemService(Context.TELEPHONY_SERVICE) as TelephonyManager

        // Setup Back Press behavior to navigate WebView history if possible
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (webView?.canGoBack() == true) {
                    webView?.goBack()
                } else {
                    finish()
                }
            }
        })

        // Request modern permission structures
        requestAppPermissions()

        // Start dynamic signal fluctuations (to emulate hardware on some systems/emulators)
        startSignalFluctuations()

        setContent {
            MaterialTheme {
                MainContainer()
            }
        }
    }

    private fun requestAppPermissions() {
        val neededPermissions = mutableListOf(
            Manifest.permission.ACCESS_FINE_LOCATION,
            Manifest.permission.ACCESS_COARSE_LOCATION,
            Manifest.permission.ACCESS_NETWORK_STATE,
            Manifest.permission.READ_PHONE_STATE
        )
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            // Additional checks if necessary
        }
        
        val ungranted = neededPermissions.filter {
            ContextCompat.checkSelfPermission(this, it) != PackageManager.PERMISSION_GRANTED
        }

        if (ungranted.isNotEmpty()) {
            permissionRequestLauncher.launch(ungranted.toTypedArray())
        } else {
            startLocationUpdates()
            readNativeTelephonyMetrics()
        }
    }

    @SuppressLint("MissingPermission")
    private fun startLocationUpdates() {
        try {
            val isGpsEnabled = locationManager.isProviderEnabled(LocationManager.GPS_PROVIDER)
            val isNetworkEnabled = locationManager.isProviderEnabled(LocationManager.NETWORK_PROVIDER)

            val locationListener = object : LocationListener {
                override fun onLocationChanged(location: Location) {
                    userLatitude = location.latitude
                    userLongitude = location.longitude
                }
                override fun onStatusChanged(provider: String?, status: Int, extras: Bundle?) {}
                override fun onProviderEnabled(provider: String) {}
                override fun onProviderDisabled(provider: String) {}
            }

            if (isGpsEnabled) {
                locationManager.requestLocationUpdates(
                    LocationManager.GPS_PROVIDER,
                    5000L,
                    5f,
                    locationListener
                )
                locationManager.getLastKnownLocation(LocationManager.GPS_PROVIDER)?.let {
                    userLatitude = it.latitude
                    userLongitude = it.longitude
                }
            } else if (isNetworkEnabled) {
                locationManager.requestLocationUpdates(
                    LocationManager.NETWORK_PROVIDER,
                    5000L,
                    5f,
                    locationListener
                )
                locationManager.getLastKnownLocation(LocationManager.NETWORK_PROVIDER)?.let {
                    userLatitude = it.latitude
                    userLongitude = it.longitude
                }
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    @SuppressLint("MissingPermission")
    private fun readNativeTelephonyMetrics() {
        try {
            // Try to extract the operator details
            val opName = telephonyManager.networkOperatorName
            if (!opName.isNullOrEmpty()) {
                networkOperator = opName
            }

            // Extract cellular speed rate attributes
            val netType = telephonyManager.networkType
            networkType = when (netType) {
                TelephonyManager.NETWORK_TYPE_LTE -> "4G"
                TelephonyManager.NETWORK_TYPE_NR -> "5G"
                TelephonyManager.NETWORK_TYPE_HSDPA, TelephonyManager.NETWORK_TYPE_HSPA -> "3G"
                TelephonyManager.NETWORK_TYPE_GPRS, TelephonyManager.NETWORK_TYPE_EDGE -> "2G"
                else -> "4G"
            }

            // Read absolute signal indices
            val cellInfos = telephonyManager.allCellInfo
            if (!cellInfos.isNullOrEmpty()) {
                for (info in cellInfos) {
                    if (info.isRegistered) {
                        when (info) {
                            is CellInfoLte -> {
                                val cellSignalStrengthLte = info.cellSignalStrength
                                liveSignalStrength = cellSignalStrengthLte.dbm
                                break
                            }
                            is CellInfoGsm -> {
                                val cellSignalStrengthGsm = info.cellSignalStrength
                                liveSignalStrength = cellSignalStrengthGsm.dbm
                                break
                            }
                            is android.telephony.CellInfoWcdma -> {
                                val cellSignalStrengthWcdma = info.cellSignalStrength
                                liveSignalStrength = cellSignalStrengthWcdma.dbm
                                break
                            }
                        }
                    }
                }
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    private fun startSignalFluctuations() {
        simulationTimer = Timer()
        simulationTimer?.scheduleAtFixedRate(object : TimerTask() {
            override fun run() {
                // Add micro variations of -2 to +2 dBm on top of our signal to emulate true active radio wave tracking
                val delta = (Math.random() * 5).toInt() - 2
                liveSignalStrength += delta
                if (liveSignalStrength > -50) liveSignalStrength = -55
                if (liveSignalStrength < -115) liveSignalStrength = -110

                // Trigger JS notification inside WebView if active
                Handler(Looper.getMainLooper()).post {
                    webView?.loadUrl("javascript:if(window.onNativeSignalUpdate){ window.onNativeSignalUpdate($liveSignalStrength); }")
                }
            }
        }, 5000, 5000)
    }

    override fun onDestroy() {
        super.onDestroy()
        simulationTimer?.cancel()
    }

    // JS Bridge Accessible properties
    fun getLiveSignalStrength(): Int = liveSignalStrength
    fun getNetworkOperator(): String = networkOperator
    fun getNetworkTypeString(): String = networkType
    fun getUserLatitude(): Double = userLatitude
    fun getUserLongitude(): Double = userLongitude
    fun getIsOfflineMode(): Boolean = isOfflineMode

    @Composable
    fun MainContainer() {
        val splashAlpha = remember { Animatable(1f) }
        val webAlpha = remember { Animatable(0f) }

        // Core animation fading logo sequence
        LaunchedEffect(Unit) {
            // Wait for 2200ms to allow gorgeous brand intro
            kotlinx.coroutines.delay(2200)
            splashAlpha.animateTo(0f, animationSpec = tween(500))
            webAlpha.animateTo(1f, animationSpec = tween(500))
        }

        Box(modifier = Modifier.fillMaxSize().background(Color(0xFF0A0A0F))) {
            // Renders standard full screen integrated WebKit layer
            if (splashAlpha.value < 1f) {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .alpha(webAlpha.value)
                ) {
                    AppWebView()
                }
            }

            // Gorgeous vector brand Splash Screen loading screen
            if (splashAlpha.value > 0f) {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .alpha(splashAlpha.value)
                        .background(Color(0xFF0A0A0F)),
                    contentAlignment = Alignment.Center
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        // Cyan Antenna Vector Graphic indicator
                        Icon(
                            imageVector = Icons.Default.Info,
                            contentDescription = "Logo",
                            tint = Color(0xFF00E5FF),
                            modifier = Modifier.size(64.dp)
                        )
                        Spacer(modifier = Modifier.height(16.dp))
                        Text(
                            text = "Tower Tracker",
                            fontFamily = FontFamily.Monospace,
                            fontWeight = FontWeight.Bold,
                            fontSize = 24.sp,
                            color = Color.White
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = "HIGH-FIDELITY MOBILE TELEMETRY",
                            fontFamily = FontFamily.Monospace,
                            fontSize = 9.sp,
                            color = Color(0xFF00E5FF),
                            fontWeight = FontWeight.Bold
                        )
                        Spacer(modifier = Modifier.height(32.dp))
                        CircularProgressIndicator(
                            color = Color(0xFF00E5FF),
                            strokeWidth = 2.dp,
                            modifier = Modifier.size(24.dp)
                        )
                    }
                }
            }
        }
    }

    @SuppressLint("SetJavaScriptEnabled", "JavascriptInterface")
    @Composable
    fun AppWebView() {
        val targetUrl = "https://tower-tracker-1080885873179.asia-southeast1.run.app"
        
        AndroidView(
            modifier = Modifier.fillMaxSize(),
            factory = { context ->
                WebView(context).apply {
                    layoutParams = android.view.ViewGroup.LayoutParams(
                        android.view.ViewGroup.LayoutParams.MATCH_PARENT,
                        android.view.ViewGroup.LayoutParams.MATCH_PARENT
                    )
                    
                    webViewClient = object : WebViewClient() {
                        override fun onPageFinished(view: WebView?, url: String?) {
                            super.onPageFinished(view, url)
                            // Broadcast loaded status
                        }
                    }
                    
                    webChromeClient = object : WebChromeClient() {
                        override fun onGeolocationPermissionsShowPrompt(
                            origin: String?,
                            callback: GeolocationPermissions.Callback?
                        ) {
                            // Auto grant HTML Geolocation permissions within client container
                            callback?.invoke(origin, true, false)
                        }
                    }

                    // Configuration
                    settings.apply {
                        javaScriptEnabled = true
                        domStorageEnabled = true
                        databaseEnabled = true
                        setGeolocationEnabled(true)
                        allowFileAccess = true
                        mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
                    }

                    // Expose native Javascript properties bridge API
                    addJavascriptInterface(WebAppInterface(this@MainActivity), "AndroidBridge")
                    
                    // Assign global reference
                    webView = this
                    
                    loadUrl(targetUrl)
                }
            }
        )
    }
}

// Javascript bridge mapped variables endpoint
class WebAppInterface(private val activity: MainActivity) {

    @JavascriptInterface
    fun getSignalStrength(): String {
        return activity.getLiveSignalStrength().toString()
    }

    @JavascriptInterface
    fun getOperatorName(): String {
        return activity.getNetworkOperator()
    }

    @JavascriptInterface
    fun getNetworkType(): String {
        return activity.getNetworkTypeString()
    }

    @JavascriptInterface
    fun getNetworkInfo(): String {
        val json = JSONObject()
        try {
            json.put("signalStrength", activity.getLiveSignalStrength())
            json.put("operator", activity.getNetworkOperator())
            json.put("networkType", activity.getNetworkTypeString())
            json.put("latitude", activity.getUserLatitude())
            json.put("longitude", activity.getUserLongitude())
            json.put("isOffline", activity.getIsOfflineMode())
        } catch (e: Exception) {
            e.printStackTrace()
        }
        return json.toString()
    }
}
