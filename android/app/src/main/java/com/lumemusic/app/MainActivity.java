package com.lumemusic.app;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Register LumeMusic native Media3 plugin.
        registerPlugin(LumeMusicMediaPlugin.class);

        // Initialize the LumeMusic AdMob banner.
        LumeMusicBanner.show(this);
    }

    @Override
    public void onDestroy() {
        // Clean up the banner when the Activity is destroyed.
        LumeMusicBanner.destroy();

        super.onDestroy();
    }
}
