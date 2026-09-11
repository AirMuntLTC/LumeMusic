package com.lumemusic.app;

import android.content.ComponentName;
import android.content.Context;

import androidx.annotation.Nullable;
import androidx.media3.common.MediaItem;
import androidx.media3.common.MediaMetadata;
import androidx.media3.common.util.UnstableApi;
import androidx.media3.session.MediaController;
import androidx.media3.session.SessionToken;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.PluginMethod;

import com.google.common.util.concurrent.ListenableFuture;

@UnstableApi
@CapacitorPlugin(name = "LumeMusicMedia")
public class LumeMusicMediaPlugin extends Plugin {

    private MediaController controller;
    private ListenableFuture<MediaController> controllerFuture;

    private void connectController() {
        if (controller != null) {
            return;
        }

        Context context = getContext();

        SessionToken sessionToken = new SessionToken(
                context,
                new ComponentName(context, PlaybackService.class)
        );

        controllerFuture = new MediaController.Builder(context, sessionToken)
                .buildAsync();

        controllerFuture.addListener(() -> {
            try {
                controller = controllerFuture.get();
            } catch (Exception e) {
                controller = null;
            }
        }, getActivity().getMainExecutor());
    }

    @PluginMethod
    public void play(PluginCall call) {
        String url = call.getString("url");

        if (url == null || url.trim().isEmpty()) {
            call.reject("Media URL is required");
            return;
        }

        connectController();

        if (controller == null) {
            call.reject("Media controller is not ready");
            return;
        }

        String title = call.getString("title", "LumeMusic");
        String artist = call.getString("artist", "LumeMusic");

        MediaMetadata metadata = new MediaMetadata.Builder()
                .setTitle(title)
                .setArtist(artist)
                .build();

        MediaItem item = new MediaItem.Builder()
                .setUri(url)
                .setMediaMetadata(metadata)
                .build();

        controller.setMediaItem(item);
        controller.prepare();
        controller.play();

        call.resolve();
    }

    @PluginMethod
    public void pause(PluginCall call) {
        connectController();

        if (controller == null) {
            call.reject("Media controller is not ready");
            return;
        }

        controller.pause();
        call.resolve();
    }

    @PluginMethod
    public void stop(PluginCall call) {
        connectController();

        if (controller == null) {
            call.reject("Media controller is not ready");
            return;
        }

        controller.stop();
        call.resolve();
    }

    @PluginMethod
    public void isPlaying(PluginCall call) {
        JSObject result = new JSObject();

        result.put(
                "playing",
                controller != null && controller.isPlaying()
        );

        call.resolve(result);
    }

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

        super.handleOnDestroy();
    }
}
