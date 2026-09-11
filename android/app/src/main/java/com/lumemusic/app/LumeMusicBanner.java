package com.lumemusic.app;

import android.app.Activity;
import android.graphics.Color;
import android.view.Gravity;
import android.view.ViewGroup;
import android.widget.FrameLayout;

import com.google.android.gms.ads.AdRequest;
import com.google.android.gms.ads.AdSize;
import com.google.android.gms.ads.AdView;
import com.google.android.gms.ads.MobileAds;

public final class LumeMusicBanner {

    /*
     * Google test banner ID.
     *
     * Keep this ID while developing/testing.
     * Replace it with your real LumeMusic banner ID only
     * when you are ready for the production build.
     */
    private static final String AD_UNIT_ID =
            "ca-app-pub-3940256099942544/9214589741";

    private static AdView adView;
    private static FrameLayout container;

    private LumeMusicBanner() {
        // Utility class.
    }

    public static void show(Activity activity) {
        if (activity == null || activity.isFinishing()) {
            return;
        }

        activity.runOnUiThread(() -> {

            // Prevent creating the banner more than once.
            if (container != null && container.getParent() != null) {
                return;
            }

            MobileAds.initialize(activity, initializationStatus -> {
                activity.runOnUiThread(() ->
                        createBanner(activity)
                );
            });
        });
    }

    private static void createBanner(Activity activity) {

        if (activity == null || activity.isFinishing()) {
            return;
        }

        // Prevent duplicate banners.
        if (container != null && container.getParent() != null) {
            return;
        }

        /*
         * Banner container.
         * It is placed at the bottom of the native Activity
         * without modifying the original LumeMusic V3 web UI.
         */
        container = new FrameLayout(activity);
        container.setBackgroundColor(Color.TRANSPARENT);

        FrameLayout.LayoutParams containerParams =
                new FrameLayout.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.WRAP_CONTENT
                );

        containerParams.gravity = Gravity.BOTTOM;

        ViewGroup contentView =
                activity.findViewById(android.R.id.content);

        contentView.addView(
                container,
                containerParams
        );

        /*
         * Create the AdMob banner.
         */
        adView = new AdView(activity);

        adView.setAdUnitId(AD_UNIT_ID);

        /*
         * Calculate the available width in dp
         * so the banner adapts to different phone sizes.
         */
        float density =
                activity.getResources()
                        .getDisplayMetrics()
                        .density;

        int widthPixels =
                activity.getResources()
                        .getDisplayMetrics()
                        .widthPixels;

        int widthDp =
                Math.max(
                        1,
                        (int) (widthPixels / density)
                );

        /*
         * Anchored adaptive banner.
         */
        AdSize adSize =
                AdSize.getLargeAnchoredAdaptiveBannerAdSize(
                        activity,
                        widthDp
                );

        adView.setAdSize(adSize);

        FrameLayout.LayoutParams adParams =
                new FrameLayout.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.WRAP_CONTENT
                );

        adParams.gravity = Gravity.CENTER;

        container.addView(
                adView,
                adParams
        );

        /*
         * Request the advertisement.
         */
        AdRequest request =
                new AdRequest.Builder()
                        .build();

        adView.loadAd(request);
    }

    public static void destroy() {

        if (adView != null) {
            adView.destroy();
            adView = null;
        }

        if (container != null) {

            ViewGroup parent =
                    (ViewGroup) container.getParent();

            if (parent != null) {
                parent.removeView(container);
            }

            container = null;
        }
    }
}
