package com.lumemusic.app;

import android.app.Activity;

import androidx.annotation.NonNull;

import com.google.android.gms.ads.AdError;
import com.google.android.gms.ads.AdRequest;
import com.google.android.gms.ads.FullScreenContentCallback;
import com.google.android.gms.ads.LoadAdError;
import com.google.android.gms.ads.interstitial.InterstitialAd;
import com.google.android.gms.ads.interstitial.InterstitialAdLoadCallback;

public final class LumeMusicInterstitial {

    /*
     * Google test interstitial ID.
     *
     * Keep this while testing.
     * Replace with your real LumeMusic interstitial
     * ad unit ID before production.
     */
    private static final String AD_UNIT_ID =
            "ca-app-pub-3940256099942544/1033173712";

    private static InterstitialAd interstitialAd;
    private static boolean isLoading = false;

    private LumeMusicInterstitial() {
        // Utility class.
    }

    /*
     * Preload the next interstitial.
     */
    public static void load(Activity activity) {

        if (activity == null || activity.isFinishing()) {
            return;
        }

        if (interstitialAd != null || isLoading) {
            return;
        }

        isLoading = true;

        AdRequest request =
                new AdRequest.Builder()
                        .build();

        InterstitialAd.load(
                activity,
                AD_UNIT_ID,
                request,
                new InterstitialAdLoadCallback() {

                    @Override
                    public void onAdLoaded(
                            @NonNull InterstitialAd ad
                    ) {
                        isLoading = false;
                        interstitialAd = ad;
                    }

                    @Override
                    public void onAdFailedToLoad(
                            @NonNull LoadAdError error
                    ) {
                        isLoading = false;
                        interstitialAd = null;
                    }
                }
        );
    }

    /*
     * Show the fullscreen AdMob interstitial.
     */
    public static void show(Activity activity) {

        if (activity == null || activity.isFinishing()) {
            return;
        }

        activity.runOnUiThread(() -> {

            /*
             * If an ad isn't ready yet, preload one.
             * We do not interrupt the user's music.
             */
            if (interstitialAd == null) {
                load(activity);
                return;
            }

            InterstitialAd ad = interstitialAd;

            interstitialAd = null;

            ad.setFullScreenContentCallback(
                    new FullScreenContentCallback() {

                        @Override
                        public void onAdShowedFullScreenContent() {
                            /*
                             * Ad is now covering the app.
                             *
                             * The YouTube player was already
                             * paused before this method was called.
                             */
                        }

                        @Override
                        public void onAdDismissedFullScreenContent() {

                            /*
                             * Immediately preload the next ad.
                             */
                            load(activity);

                            /*
                             * Tell the WebView YouTube player
                             * to resume if it was playing before
                             * the advertisement.
                             */
                            resumeYouTubeAfterAd(activity);
                        }

                        @Override
                        public void onAdFailedToShowFullScreenContent(
                                @NonNull AdError adError
                        ) {

                            /*
                             * The ad failed to appear.
                             * Prepare another one and resume
                             * the YouTube player.
                             */
                            load(activity);

                            resumeYouTubeAfterAd(activity);
                        }
                    }
            );

            ad.show(activity);
        });
    }

    /*
     * Call the JavaScript method inside the V3 WebView.
     */
    private static void resumeYouTubeAfterAd(
            Activity activity
    ) {

        if (activity == null || activity.isFinishing()) {
            return;
        }

        activity.runOnUiThread(() -> {

            try {

                if (!(activity instanceof MainActivity)) {
                    return;
                }

                MainActivity mainActivity =
                        (MainActivity) activity;

                mainActivity
                        .getBridge()
                        .getWebView()
                        .evaluateJavascript(
                                "window.Lume && " +
                                "Lume.player && " +
                                "Lume.player.resumeAfterAd();",
                                null
                        );

            } catch (Exception e) {

                /*
                 * Do not crash the app if the WebView
                 * is already being destroyed.
                 */
                e.printStackTrace();
            }
        });
    }

    /*
     * Check whether an interstitial is ready.
     */
    public static boolean isReady() {
        return interstitialAd != null;
    }

    /*
     * Release the currently loaded advertisement.
     */
    public static void destroy() {

        interstitialAd = null;
        isLoading = false;
    }
}
