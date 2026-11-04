# Full Screen Plus

A full-screen "now playing" view for [Spicetify](https://spicetify.app): big cover art, an animated background made from the album art, synced lyrics, and the controls you need.

![Full Screen Plus with synced lyrics](screenshots/hero.jpg)

## Features

- **Three layouts:** cover beside the details, centred, or a TV-style view with a small cover in the corner
- **Moving backgrounds:** blurred album art that swirls or drifts, or the artist's image, a solid colour from the art, or your theme colour. Sliders adjust the speed, zoom, blur, colour and dimming.
- **Synced lyrics** from Spotify, or from [Lyrics Plus](https://github.com/spicetify/cli/tree/main/CustomApps/lyrics-plus) if you have it turned on
- **Up next** and **Playing from**, so you can see what's coming and where it's playing from
- **Controls:** like, shuffle and repeat, with an optional volume slider. Scroll the mouse wheel anywhere to change the volume.
- **Clickable links:** the song, artists, album and playlist each open their page in Spotify
- **Clock:** optional, in 12- or 24-hour format, with or without the date
- **Gets out of the way:** the cursor and controls hide when the mouse stops moving

| Cover beside details | Centred | TV |
| --- | --- | --- |
| ![Cover beside details](screenshots/layout-beside.jpg) | ![Centred](screenshots/layout-centred.jpg) | ![TV: small cover in the corner](screenshots/layout-tv.jpg) |

## Install

1. Download [`full-screen-plus.js`](full-screen-plus.js).
2. Put it in your Spicetify `Extensions` folder. To find that folder, run `spicetify path userdata` and look inside it for `Extensions`.
3. Run:
   ```
   spicetify config extensions full-screen-plus.js
   spicetify apply
   ```
4. Optional: to use Lyrics Plus as the lyrics source, also run:
   ```
   spicetify config custom_apps lyrics-plus
   spicetify apply
   ```

## Use

Click the expand button at the right of the playbar, or press **F**. Press **F** or **Esc** to leave.

<img src="screenshots/settings.png" alt="Settings panel" width="260" align="right">

Press **,** (comma) or click the gear icon to open the settings. Settings are saved automatically.

### Keyboard shortcuts

| Key | Action |
| --- | --- |
| Space | Play / pause |
| ← → | Back / forward 10 seconds |
| P N | Previous / next song |
| ↑ ↓ | Volume |
| M | Mute |
| S | Shuffle |
| R | Repeat |
| H | Like |
| L | Lyrics on / off |
| V | Next layout |
| B | Next background |
| , | Settings |
| ? | Show these shortcuts |
| F / Esc | Close |

## Requirements

Tested on Spotify 1.3.6 with Spicetify 2.46. It should work with any theme, because it takes its colours from the theme you have.

## Credits

The Lyrics Plus integration works the same way as in [daksh2k's Full Screen](https://github.com/daksh2k/Spicetify-stuff/tree/master/Extensions/full-screen), which this extension was built to replace on newer versions of Spotify.
