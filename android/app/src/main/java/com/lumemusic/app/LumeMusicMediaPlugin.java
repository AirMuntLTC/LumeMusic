package com.lumemusic.app;

import android.content.ComponentName;
import android.content.Context;

import androidx.annotation.NonNull;
import androidx.media3.common.MediaItem;
import androidx.media3.common.MediaMetadata;
import androidx.media3.common.util.UnstableApi;
import androidx.media3.session.MediaController;
import androidx.media3.session.SessionToken;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.common.util.concurrent.ListenableFuture;

@UnstableApi
@CapacitorPlugin(name = "LumeMusicMedia")
public class LumeMusicMediaPlugin extends Plugin {

    private static LumeMusicMediaPlugin instance;

    private MediaController controller;
    private ListenableFuture<MediaController> controllerFuture;

    @Override
    public void load() {
        super.load();
        instance = this;
    }

    /*
     * Connect to the native Media3 playback service.
     */
    private void connectController(
            @NonNull PluginCall call,
            @NonNull Runnable action
    ) {
        if (controller != null) {
            action.run();
            return;
        }

        Context context = getContext();

        if (context == null) {
            call.reject(
                    "LumeMusic context is unavailable"
            );
            return;
        }

        SessionToken token = new SessionToken(
                context,
                new ComponentName(
                        context,
                        PlaybackService.class
                )
        );

        controllerFuture = new MediaController.Builder(
                context,
                token
        ).buildAsync();

        controllerFuture.addListener(() -> {
            try {
                controller = controllerFuture.get();

                if (getActivity() != null) {
                    getActivity().runOnUiThread(action);
                } else {
                    call.reject(
                            "LumeMusic activity is no longer available"
                    );
                }

            } catch (Exception e) {
                call.reject(
                        "Unable to connect to LumeMusic Media3 service",
                        e
                );
            }
        }, getActivity().getMainExecutor());
    }

    /*
     * Start native Media3 playback.
     */
    @PluginMethod
    public void play(PluginCall call) {
        String url = call.getString("url");

        if (url == null || url.trim().isEmpty()) {
            call.reject("Media URL is required");
            return;
        }

        String title = call.getString(
                "title",
                "LumeMusic"
        );

        String artist = call.getString(
                "artist",
                "LumeMusic"
        );

        connectController(call, () -> {

            MediaMetadata metadata =
                    new MediaMetadata.Builder()
                            .setTitle(title)
                            .setArtist(artist)
                            .build();

            MediaItem item =
                    new MediaItem.Builder()
                            .setUri(url.trim())
                            .setMediaMetadata(metadata)
                            .build();

            controller.setMediaItem(item);
            controller.prepare();
            controller.play();

            call.resolve();
        });
    }

    /*
     * Pause native Media3 playback.
     */
    @PluginMethod
    public void pause(PluginCall call) {
        if (controller != null) {
            controller.pause();
        }

        call.resolve();
    }

    /*
     * Resume native Media3 playback.
     */
    @PluginMethod
    public void resume(PluginCall call) {
        if (controller != null) {
            controller.play();
        }

        call.resolve();
    }

    /*
     * Resume native Media3 playback from Java.
     */
    public static void resumePlayback() {
        if (instance != null && instance.controller != null) {
            instance.controller.play();
        }
    }

    /*
     * Show the native AdMob fullscreen interstitial.
     */
    @PluginMethod
    public void showInterstitial(PluginCall call) {

        if (getActivity() == null) {
            call.reject(
                    "LumeMusic activity is no longer available"
            );
            return;
        }

        getActivity().runOnUiThread(() -> {

            try {

                LumeMusicInterstitial.show(
                        getActivity()
                );

                call.resolve();

            } catch (Exception e) {

                call.reject(
                        "Unable to show LumeMusic interstitial",
                        e
                );
            }
        });
    }

    /*
     * Check whether the native AdMob interstitial
     * is currently loaded and ready to show.
     */
    @PluginMethod
    public void isReady(PluginCall call) {

        JSObject result = new JSObject();

        result.put(
                "ready",
                LumeMusicInterstitial.isReady()
        );

        call.resolve(result);
    }

    /*
     * Stop native Media3 playback.
     */
    @PluginMethod
    public void stop(PluginCall call) {
        if (controller != null) {
            controller.stop();
        }

        call.resolve();
    }

    /*
     * Check whether native Media3 playback is active.
     */
    @PluginMethod
    public void isPlaying(PluginCall call) {

        JSObject result = new JSObject();

        result.put(
                "playing",
                controller != null &&
                controller.isPlaying()
        );

        call.resolve(result);
    }

    /*
     * Return the current native Media3 playback state.
     */
    @PluginMethod
    public void getState(PluginCall call) {

        JSObject result = new JSObject();

        if (controller == null) {

            result.put(
                    "connected",
                    false
            );

            result.put(
                    "playing",
                    false
            );

            result.put(
                    "position",
                    0
            );

            result.put(
                    "duration",
                    0
            );

            call.resolve(result);
            return;
        }

        result.put(
                "connected",
                true
        );

        result.put(
                "playing",
                controller.isPlaying()
        );

        result.put(
                "position",
                controller.getCurrentPosition()
        );

        result.put(
                "duration",
                controller.getDuration()
        );

        MediaItem currentItem =
                controller.getCurrentMediaItem();

        if (currentItem != null) {

            MediaMetadata metadata =
                    currentItem.mediaMetadata;

            if (metadata.title != null) {

                result.put(
                        "title",
                        metadata.title.toString()
                );
            }

            if (metadata.artist != null) {

                result.put(
                        "artist",
                        metadata.artist.toString()
                );
            }
        }

        call.resolve(result);
    }

    /*
     * Seek native Media3 playback.
     *
     * Position is supplied in milliseconds.
     */
    @PluginMethod
    public void seekTo(PluginCall call) {

        if (controller == null) {

            call.reject(
                    "Media controller is not connected"
            );

            return;
        }

        Double position =
                call.getDouble("position");

        if (position == null) {

            call.reject(
                    "Position is required"
            );

            return;
        }

        controller.seekTo(
                Math.max(
                        0L,
                        position.longValue()
                )
        );

        call.resolve();
    }

    /*
     * Clean up the native Media3 controller.
     */
    @Override
    protected void handleOnDestroy() {

        if (controller != null) {

            controller.release();
            controller = null;
        }

        if (controllerFuture != null) {

            controllerFuture.cancel(false);
            controllerFuture = null;
        }

        if (instance == this) {
            instance = null;
        }

        super.handleOnDestroy();
    }
}
