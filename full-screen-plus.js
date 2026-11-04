(async function fullScreenPlus() {
    // Player.data stays empty until something has played, so wait for the player itself
    // and let the overlay cope with "nothing playing".
    while (
        !Spicetify?.Player?.origin ||
        !Spicetify?.Playbar?.Button ||
        !Spicetify?.Mousetrap ||
        !Spicetify?.React ||
        !Spicetify?.ReactDOM ||
        !Spicetify?.ReactComponent?.ButtonPrimary ||
        !Spicetify?.ReactComponent?.ButtonTertiary ||
        !Spicetify?.ReactComponent?.IconComponent ||
        !Spicetify?.Platform
    ) {
        await new Promise((resolve) => setTimeout(resolve, 100));
    }

    const { React, ReactDOM, ReactComponent, Player } = Spicetify;
    const h = React.createElement;

    const SHORTCUT = "f";
    const IDLE_MS = 3000;
    const FADE_MS = 600;
    const UP_NEXT_MS = 30000;
    // The background bitmaps are tiny on purpose: the GPU scales them up, which makes the blur almost free.
    const BG_SIZE = 128;
    // So the background is blurred from a small copy of the art, not the full-size one.
    const BG_SOURCE_MIN = 200;
    const SETTINGS_KEY = "fsa-settings";

    // Spotify's own 16px icons, taken from its app bundle so the controls match the native ones.
    const ICONS = {
        expand: `<path d="M6.53 9.47a.75.75 0 0 1 0 1.06l-2.72 2.72h1.018a.75.75 0 0 1 0 1.5H1.25v-3.579a.75.75 0 0 1 1.5 0v1.018l2.72-2.72a.75.75 0 0 1 1.06 0zm2.94-2.94a.75.75 0 0 1 0-1.06l2.72-2.72h-1.018a.75.75 0 1 1 0-1.5h3.578v3.579a.75.75 0 0 1-1.5 0V3.81l-2.72 2.72a.75.75 0 0 1-1.06 0"/>`,
        collapse: `<path d="M14.53 1.47a.75.75 0 0 1 0 1.06l-2.72 2.72h1.018a.75.75 0 1 1 0 1.5H9.25V3.171a.75.75 0 1 1 1.5 0V4.19l2.72-2.72a.75.75 0 0 1 1.06 0M1.47 14.53a.75.75 0 0 1 0-1.06l2.72-2.72H3.171a.75.75 0 0 1 0-1.5H6.75v3.579a.75.75 0 1 1-1.5 0V11.81l-2.72 2.72a.75.75 0 0 1-1.06 0"/>`,
        play: `<path d="M3 1.713a.7.7 0 0 1 1.05-.607l10.89 6.288a.7.7 0 0 1 0 1.212L4.05 14.894A.7.7 0 0 1 3 14.288z"/>`,
        pause: `<path d="M2.7 1a.7.7 0 0 0-.7.7v12.6a.7.7 0 0 0 .7.7h2.6a.7.7 0 0 0 .7-.7V1.7a.7.7 0 0 0-.7-.7zm8 0a.7.7 0 0 0-.7.7v12.6a.7.7 0 0 0 .7.7h2.6a.7.7 0 0 0 .7-.7V1.7a.7.7 0 0 0-.7-.7z"/>`,
        back: `<path d="M3.3 1a.7.7 0 0 1 .7.7v5.15l9.95-5.744a.7.7 0 0 1 1.05.606v12.575a.7.7 0 0 1-1.05.607L4 9.149V14.3a.7.7 0 0 1-.7.7H1.7a.7.7 0 0 1-.7-.7V1.7a.7.7 0 0 1 .7-.7z"/>`,
        next: `<path d="M12.7 1a.7.7 0 0 0-.7.7v5.15L2.05 1.107A.7.7 0 0 0 1 1.712v12.575a.7.7 0 0 0 1.05.607L12 9.149V14.3a.7.7 0 0 0 .7.7h1.6a.7.7 0 0 0 .7-.7V1.7a.7.7 0 0 0-.7-.7z"/>`,
        track: `<path d="M10 2v9.5a2.75 2.75 0 1 1-2.75-2.75H8.5V2zm-1.5 8.25H7.25A1.25 1.25 0 1 0 8.5 11.5z"/>`,
        shuffle: `<path d="M13.151.922a.75.75 0 1 0-1.06 1.06L13.109 3H11.16a3.75 3.75 0 0 0-2.873 1.34l-6.173 7.356A2.25 2.25 0 0 1 .39 12.5H0V14h.391a3.75 3.75 0 0 0 2.873-1.34l6.173-7.356a2.25 2.25 0 0 1 1.724-.804h1.947l-1.017 1.018a.75.75 0 0 0 1.06 1.06L15.98 3.75zM.391 3.5H0V2h.391c1.109 0 2.16.49 2.873 1.34L4.89 5.277l-.979 1.167-1.796-2.14A2.25 2.25 0 0 0 .39 3.5z"/><path d="m7.5 10.723.98-1.167.957 1.14a2.25 2.25 0 0 0 1.724.804h1.947l-1.017-1.018a.75.75 0 1 1 1.06-1.06l2.829 2.828-2.829 2.828a.75.75 0 1 1-1.06-1.06L13.109 13H11.16a3.75 3.75 0 0 1-2.873-1.34l-.787-.938z"/>`,
        smartShuffle: `<path d="M4.502 0a.637.637 0 0 1 .634.58 4.84 4.84 0 0 0 .81 2.184c.515.739 1.297 1.356 2.487 1.486a.637.637 0 0 1 0 1.267c-1.19.13-1.972.747-2.487 1.487a4.8 4.8 0 0 0-.81 2.185.637.637 0 0 1-1.268 0 4.8 4.8 0 0 0-.81-2.185C2.543 6.265 1.76 5.648.57 5.518a.637.637 0 0 1 0-1.268c1.19-.13 1.972-.747 2.487-1.486a4.84 4.84 0 0 0 .81-2.185A.637.637 0 0 1 4.502 0m4.765 11.878c.056.065.126.15.198.236l.33.397.013.015A3 3 0 0 0 12.1 13.59h1.009l-.444.443a.75.75 0 0 0 1.061 1.06l2.254-2.253-2.254-2.254a.75.75 0 0 0-1.06 1.06l.443.444H12.1a1.5 1.5 0 0 1-1.146-.533l-.004-.005-.333-.4-.288-.343-.031-.035-.02-.021-.037-.037-.974 1.16Z"/><path d="M12.69 4.196a.75.75 0 0 1 1.06 0l2.254 2.254-2.254 2.254a.75.75 0 0 1-1.06-1.06l.443-.444h-1.008a1.5 1.5 0 0 0-1.15.536l-4.63 5.517c-.344.411-.982 1.021-1.822 1.021v-1.5c.122 0 .371-.124.674-.485l4.63-5.517A3 3 0 0 1 12.125 5.7h1.008l-.443-.443a.75.75 0 0 1 0-1.061"/>`,
        repeat: `<path d="M0 4.75A3.75 3.75 0 0 1 3.75 1h8.5A3.75 3.75 0 0 1 16 4.75v5a3.75 3.75 0 0 1-3.75 3.75H9.81l1.018 1.018a.75.75 0 1 1-1.06 1.06L6.939 12.75l2.829-2.828a.75.75 0 1 1 1.06 1.06L9.811 12h2.439a2.25 2.25 0 0 0 2.25-2.25v-5a2.25 2.25 0 0 0-2.25-2.25h-8.5A2.25 2.25 0 0 0 1.5 4.75v5A2.25 2.25 0 0 0 3.75 12H5v1.5H3.75A3.75 3.75 0 0 1 0 9.75z"/>`,
        repeatOne: `<path d="M0 4.75A3.75 3.75 0 0 1 3.75 1h.75v1.5h-.75A2.25 2.25 0 0 0 1.5 4.75v5A2.25 2.25 0 0 0 3.75 12H5v1.5H3.75A3.75 3.75 0 0 1 0 9.75zM12.25 2.5a2.25 2.25 0 0 1 2.25 2.25v5A2.25 2.25 0 0 1 12.25 12H9.81l1.018-1.018a.75.75 0 0 0-1.06-1.06L6.939 12.75l2.829 2.828a.75.75 0 1 0 1.06-1.06L9.811 13.5h2.439A3.75 3.75 0 0 0 16 9.75v-5A3.75 3.75 0 0 0 12.25 1h-.75v1.5z"/><path d="m8 1.85.77.694H6.095V1.488q1.046-.077 1.507-.385.474-.308.583-.913h1.32V8H8z"/><path d="M8.77 2.544 8 1.85v.693z"/>`,
        like: `<path d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8"/><path d="M11.75 8a.75.75 0 0 1-.75.75H8.75V11a.75.75 0 0 1-1.5 0V8.75H5a.75.75 0 0 1 0-1.5h2.25V5a.75.75 0 0 1 1.5 0v2.25H11a.75.75 0 0 1 .75.75"/>`,
        liked: `<path d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8m11.748-1.97a.75.75 0 0 0-1.06-1.06l-4.47 4.47-1.405-1.406a.75.75 0 1 0-1.061 1.06l2.466 2.467 5.53-5.53z"/>`,
        lyrics: `<path d="M4 4a4 4 0 1 1 8 0v3a4 4 0 0 1-8 0zm4-2.5A2.5 2.5 0 0 0 5.5 4v3a2.5 2.5 0 0 0 5 0V4A2.5 2.5 0 0 0 8 1.5"/><path d="M2.25 6v1a5.75 5.75 0 0 0 11.5 0V6h1.5v1a7.25 7.25 0 0 1-6.5 7.212V16h-1.5v-1.788A7.25 7.25 0 0 1 .75 7V6z"/>`,
        song: `<path d="M4 1h11v11.75A2.75 2.75 0 1 1 12.25 10h1.25V2.5h-8v10.25A2.75 2.75 0 1 1 2.75 10H4zm0 10.5H2.75A1.25 1.25 0 1 0 4 12.75zm9.5 0h-1.25a1.25 1.25 0 1 0 1.25 1.25z"/>`,
        artist: `<path d="M11.757 2.987A4.36 4.36 0 0 0 7.618 0a4.36 4.36 0 0 0-4.139 2.987 5.5 5.5 0 0 0-.22 1.894 5.6 5.6 0 0 0 1.4 3.312l.125.152a.748.748 0 0 1-.2 1.128l-2.209 1.275A4.75 4.75 0 0 0 0 14.857v1.142h8.734A5.5 5.5 0 0 1 8.15 14.5H1.517a3.25 3.25 0 0 1 1.6-2.454l2.21-1.275a2.25 2.25 0 0 0 .6-3.386l-.128-.153a4.1 4.1 0 0 1-1.05-2.44A4 4 0 0 1 4.89 3.47a2.8 2.8 0 0 1 1.555-1.713 2.89 2.89 0 0 1 3.293.691c.265.296.466.644.589 1.022.12.43.169.876.144 1.322a4.12 4.12 0 0 1-1.052 2.44l-.127.153a2.24 2.24 0 0 0-.2 2.58c.338-.45.742-.845 1.2-1.173 0-.162.055-.32.156-.447l.126-.152a5.6 5.6 0 0 0 1.4-3.312 5.5 5.5 0 0 0-.218-1.894zm3.493 3.771a.75.75 0 0 0-.75.75v3.496h-1a2.5 2.5 0 0 0-2.31 1.542 2.497 2.497 0 0 0 1.822 3.406A2.502 2.502 0 0 0 16 13.502V7.508a.75.75 0 0 0-.75-.75m-.75 6.744a.998.998 0 0 1-1.707.707 1 1 0 0 1 .707-1.706h1z"/>`,
        album: `<path d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8"/><path d="M8 6.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3M5 8a3 3 0 1 1 6 0 3 3 0 0 1-6 0"/>`,
        volumeHigh: `<path d="M9.741.85a.75.75 0 0 1 .375.65v13a.75.75 0 0 1-1.125.65l-6.925-4a3.64 3.64 0 0 1-1.33-4.967 3.64 3.64 0 0 1 1.33-1.332l6.925-4a.75.75 0 0 1 .75 0zm-6.924 5.3a2.14 2.14 0 0 0 0 3.7l5.8 3.35V2.8zm8.683 4.29V5.56a2.75 2.75 0 0 1 0 4.88"/><path d="M11.5 13.614a5.752 5.752 0 0 0 0-11.228v1.55a4.252 4.252 0 0 1 0 8.127z"/>`,
        volumeMid: `<path d="M9.741.85a.75.75 0 0 1 .375.65v13a.75.75 0 0 1-1.125.65l-6.925-4a3.64 3.64 0 0 1-1.33-4.967 3.64 3.64 0 0 1 1.33-1.332l6.925-4a.75.75 0 0 1 .75 0zm-6.924 5.3a2.14 2.14 0 0 0 0 3.7l5.8 3.35V2.8zm8.683 6.087a4.502 4.502 0 0 0 0-8.474v1.65a3 3 0 0 1 0 5.175z"/>`,
        volumeLow: `<path d="M9.741.85a.75.75 0 0 1 .375.65v13a.75.75 0 0 1-1.125.65l-6.925-4a3.64 3.64 0 0 1-1.33-4.967 3.64 3.64 0 0 1 1.33-1.332l6.925-4a.75.75 0 0 1 .75 0zm-6.924 5.3a2.14 2.14 0 0 0 0 3.7l5.8 3.35V2.8zm8.683 4.29V5.56a2.75 2.75 0 0 1 0 4.88"/>`,
        volumeMuted: `<path d="M13.86 5.47a.75.75 0 0 0-1.061 0l-1.47 1.47-1.47-1.47A.75.75 0 0 0 8.8 6.53L10.269 8l-1.47 1.47a.75.75 0 1 0 1.06 1.06l1.47-1.47 1.47 1.47a.75.75 0 0 0 1.06-1.06L12.39 8l1.47-1.47a.75.75 0 0 0 0-1.06"/><path d="M10.116 1.5A.75.75 0 0 0 8.991.85l-6.925 4a3.64 3.64 0 0 0-1.33 4.967 3.64 3.64 0 0 0 1.33 1.332l6.925 4a.75.75 0 0 0 1.125-.649v-1.906a4.7 4.7 0 0 1-1.5-.694v1.3L2.817 9.852a2.14 2.14 0 0 1-.781-2.92c.187-.324.456-.594.78-.782l5.8-3.35v1.3c.45-.313.956-.55 1.5-.694z"/>`,
        settings: `<path d="m15.51 7.484-1.09-.406a.55.55 0 0 1-.3-.412.53.53 0 0 1 .1-.472l.8-.846a.76.76 0 0 0 .13-.87 8.3 8.3 0 0 0-2.082-2.645.75.75 0 0 0-.865-.064l-.9.55a.56.56 0 0 1-.543-.016.59.59 0 0 1-.349-.42L10.273.818a.76.76 0 0 0-.194-.417.75.75 0 0 0-.396-.227 8.1 8.1 0 0 0-3.339 0 .75.75 0 0 0-.396.227.76.76 0 0 0-.194.416L5.62 1.851a.63.63 0 0 1-.369.441.6.6 0 0 1-.569.017l-.88-.538a.74.74 0 0 0-.865.065 8.2 8.2 0 0 0-1.175 1.216q-.527.668-.906 1.43a.77.77 0 0 0 .13.87l.784.826a.54.54 0 0 1 .1.484.57.57 0 0 1-.3.424l-1.082.406a.75.75 0 0 0-.359.283.77.77 0 0 0-.13.442 8.4 8.4 0 0 0 .743 3.298.75.75 0 0 0 .751.44l1.294-.122a.45.45 0 0 1 .366.19.47.47 0 0 1 .11.413l-.4 1.233a.77.77 0 0 0 .257.84 8.1 8.1 0 0 0 3.007 1.468.73.73 0 0 0 .537-.069.75.75 0 0 0 .27-.253l.76-1.174a.457.457 0 0 1 .64.013l.75 1.162a.75.75 0 0 0 .807.321 8.2 8.2 0 0 0 3.008-1.468.76.76 0 0 0 .255-.84l-.41-1.259a.46.46 0 0 1 .107-.397.41.41 0 0 1 .354-.183l1.3.122a.745.745 0 0 0 .75-.44 8.35 8.35 0 0 0 .743-3.297.77.77 0 0 0-.128-.445.75.75 0 0 0-.36-.286m-1.176 2.075q-.095.42-.24.823l-.747-.072a1.9 1.9 0 0 0-.918.161 1.95 1.95 0 0 0-.738.576 1.95 1.95 0 0 0-.37 1.834l.236.725a6 6 0 0 1-.737.42 7 7 0 0 1-.784.322l-.447-.692a1.9 1.9 0 0 0-.69-.62A1.86 1.86 0 0 0 8 12.821a1.8 1.8 0 0 0-.883.21 1.85 1.85 0 0 0-.678.612l-.455.71a6.7 6.7 0 0 1-1.522-.743l.228-.7a1.98 1.98 0 0 0-.376-1.852 1.96 1.96 0 0 0-.743-.579 1.9 1.9 0 0 0-.923-.162l-.741.071a7 7 0 0 1-.376-1.667l.563-.212c.31-.131.583-.335.8-.595a2.15 2.15 0 0 0 .427-1.906 2.14 2.14 0 0 0-.466-.887l-.4-.421a6.7 6.7 0 0 1 1.053-1.338l.405.248a2.07 2.07 0 0 0 2 .048 2.13 2.13 0 0 0 1.2-1.61l.062-.475a6.6 6.6 0 0 1 1.69 0l.065.507a2.2 2.2 0 0 0 .404.94c.206.276.474.498.782.649a2.13 2.13 0 0 0 1.966-.051l.429-.262a6.8 6.8 0 0 1 1.053 1.337l-.421.443a2.146 2.146 0 0 0-.037 2.772c.214.258.486.46.794.59l.57.215a7 7 0 0 1-.136.845Z"/><path d="M8 6.25a1.75 1.75 0 1 0 0 3.5 1.75 1.75 0 0 0 0-3.5M4.75 8a3.25 3.25 0 1 1 6.5 0 3.25 3.25 0 0 1-6.5 0"/>`,
    };

    const svg = (paths, size = "100%") =>
        `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 16 16" fill="currentColor">${paths}</svg>`;

    const iconComponent = (paths, iconSize) => {
        const html = { __html: svg(paths) };
        return () => h(ReactComponent.IconComponent, { iconSize, dangerouslySetInnerHTML: html });
    };
    const Icon = {
        play: iconComponent(ICONS.play, 24),
        pause: iconComponent(ICONS.pause, 24),
        back: iconComponent(ICONS.back, 24),
        next: iconComponent(ICONS.next, 24),
        shuffle: iconComponent(ICONS.shuffle, 20),
        smartShuffle: iconComponent(ICONS.smartShuffle, 20),
        repeat: iconComponent(ICONS.repeat, 20),
        repeatOne: iconComponent(ICONS.repeatOne, 20),
        like: iconComponent(ICONS.like, 20),
        liked: iconComponent(ICONS.liked, 20),
        lyrics: iconComponent(ICONS.lyrics, 20),
        volumeHigh: iconComponent(ICONS.volumeHigh, 20),
        volumeMid: iconComponent(ICONS.volumeMid, 20),
        volumeLow: iconComponent(ICONS.volumeLow, 20),
        volumeMuted: iconComponent(ICONS.volumeMuted, 20),
        settings: iconComponent(ICONS.settings, 20),
        collapse: iconComponent(ICONS.collapse, 20),
    };

    function spotifyText(key, fallback) {
        try {
            const text = Spicetify.Locale?.get?.(key);
            if (typeof text === "string" && text && text !== key) return text;
        } catch {}
        return fallback;
    }

    const LABEL_OPEN = "Full Screen Plus (F)";
    const LABEL_CLOSE = "Exit Full Screen Plus (F)";

    // ---------- Settings ----------

    const CHOICES = {
        layout: [
            ["side", "Cover beside details"],
            ["center", "Centred"],
            ["corner", "TV: small cover in the corner"],
        ],
        background: [
            ["art", "Blurred art"],
            ["artist", "Artist image"],
            ["color", "Solid colour from the art"],
            ["theme", "Theme colour"],
        ],
        bgMotion: [
            ["swirl", "Swirl"],
            ["drift", "Drift"],
            ["still", "Still"],
        ],
        upNext: [
            ["end", "Near the end of a song"],
            ["always", "Always"],
            ["mouse", "When the mouse moves"],
            ["off", "Off"],
        ],
        context: [
            ["always", "Always"],
            ["mouse", "When the mouse moves"],
            ["off", "Off"],
        ],
        lyricsSource: [
            ["spotify", "Spotify"],
            ["lyricsPlus", "Lyrics Plus"],
        ],
        clock: [
            ["off", "Off"],
            ["12h", "12-hour (9:41 PM)"],
            ["24h", "24-hour (21:41)"],
            ["12hDate", "12-hour with date"],
            ["24hDate", "24-hour with date"],
        ],
        infoIcons: [
            ["off", "Off"],
            ["always", "Always"],
            ["hover", "On hover"],
        ],
    };

    // Background sliders. Each is a multiplier where 1 is the standard look: animation speed, layer size,
    // blur radius (BG_BLUR), saturation (BG_SATURATE) and shade strength.
    const SLIDERS = {
        bgSpeed: { label: "Speed", min: 0.2, max: 3, step: 0.1, format: (v) => `${v.toFixed(1)}×` },
        bgZoom: { label: "Zoom", min: 1, max: 2.5, step: 0.05 },
        bgBlur: { label: "Blur", min: 0.2, max: 2.4, step: 0.05 },
        bgColor: { label: "Colour", min: 0.3, max: 2, step: 0.05 },
        bgDim: { label: "Dimming", min: 0, max: 2, step: 0.05 },
    };
    const BG_BLUR = 10;
    // Blurring averages colours towards grey, so the standard look gives some saturation back.
    const BG_SATURATE = 1.6;
    // What the steps of earlier versions' dropdowns were, as multipliers.
    const OLD_STEPS = {
        bgSpeed: { slowest: 0.4, slow: 0.7, normal: 1, fast: 1.6, fastest: 2.5 },
        bgBlur: { low: 0.6, normal: 1, high: 1.6 },
        bgColor: { muted: 0.7, normal: 1, vivid: 1.45 },
        bgDim: { light: 0.5, normal: 1, dark: 1.6 },
    };

    const DEFAULTS = {
        layout: "side",
        background: "art",
        bgMotion: "swirl",
        bgSpeed: 1,
        bgZoom: 1,
        bgBlur: 1,
        bgColor: 1,
        bgDim: 1,
        lyrics: false,
        lyricsSource: "spotify",
        clock: "off",
        context: "always",
        upNext: "end",
        album: true,
        infoIcons: "off",
        progress: true,
        extraControls: true,
        volume: false,
        idle: true,
        fullscreen: true,
    };

    function readStored(key, fallback) {
        try {
            return JSON.parse(Spicetify.LocalStorage?.get(key) || "null") ?? fallback;
        } catch {
            return fallback;
        }
    }

    function store(key, value) {
        try {
            Spicetify.LocalStorage?.set(key, JSON.stringify(value));
        } catch {}
    }

    // Full, valid settings from whatever was saved (possibly by an earlier version, or edited by hand).
    function sanitize(stored) {
        if (!stored || typeof stored !== "object") stored = {};
        // Earlier versions had moving and still blurred art as separate backgrounds.
        if (stored.background === "animated") stored.background = "art";
        if (stored.background === "blur") stored = { ...stored, background: "art", bgMotion: "still" };
        // "Playing from" was an on/off switch.
        if (typeof stored.context === "boolean") stored.context = stored.context ? "always" : "off";
        const result = { ...DEFAULTS };
        for (const key of Object.keys(DEFAULTS)) {
            let value = stored[key];
            if (SLIDERS[key]) {
                value = OLD_STEPS[key]?.[value] ?? value;
                if (Number.isFinite(value)) result[key] = clampSlider(key, value);
            } else if (CHOICES[key] ? CHOICES[key].some(([choice]) => choice === value) : typeof value === typeof DEFAULTS[key]) {
                result[key] = value;
            }
        }
        return result;
    }

    function clampSlider(key, value) {
        const { min, max, step } = SLIDERS[key];
        // Rounded to the step, so float noise from the slider doesn't end up in the saved settings.
        return Number(Math.min(Math.max(Math.round(value / step) * step, min), max).toFixed(2));
    }

    let settings = sanitize(readStored(SETTINGS_KEY, {}));
    let settingsOpen = false;
    let helpOpen = false;

    const SECTIONS_KEY = "fsa-sections";
    let openSections = readStored(SECTIONS_KEY, { Look: true });

    function toggleSection(title) {
        openSections = { ...openSections, [title]: !openSections[title] };
        store(SECTIONS_KEY, openSections);
        renderAll();
    }

    function updateSettings(patch) {
        const previous = settings;
        settings = { ...settings, ...patch };
        store(SETTINGS_KEY, settings);
        if (isOpen && previous.fullscreen !== settings.fullscreen) {
            if (settings.fullscreen) enterFullscreen();
            else leaveFullscreen();
        }
        if (previous.background === "color" && settings.background !== "color") applyColor("");
        // Turning lyrics back on says again if the song has none.
        if (!settings.lyrics) notedMissing = "";
        syncLyricsPlus();
        applyClasses();
        if (isOpen) showArt(currentTrack);
        loadExtras();
        renderAll();
        resync();
        updateClock();
        noteMissingLyrics();
    }

    // ---------- Track data ----------

    // Rough widths for Spotify's image labels, so labelled and measured images can be compared.
    const LABEL_WIDTHS = { small: 64, standard: 300, default: 300, large: 640, xlarge: 1000 };

    function toHttpImage(url) {
        return typeof url === "string" ? url.replace(/^spotify:image:/, "https://i.scdn.co/image/") : "";
    }

    function imageCandidates(item) {
        const meta = item.metadata ?? {};
        const candidates = [...(item.images ?? []), ...(item.album?.images ?? [])]
            .filter((image) => image?.url)
            .map((image) => ({ url: image.url, width: image.width ?? LABEL_WIDTHS[image.label] ?? 0 }));
        for (const [key, width] of [
            ["image_xlarge_url", 1000],
            ["image_large_url", 640],
            ["image_url", 300],
            ["image_small_url", 64],
        ]) {
            if (meta[key]) candidates.push({ url: meta[key], width });
        }
        return candidates.sort((a, b) => b.width - a.width);
    }

    // The image list has moved between Spotify versions, so look everywhere. Largest by default;
    // with `minWidth`, the smallest that's at least that wide.
    function pickImage(item, minWidth = 0) {
        const candidates = imageCandidates(item);
        const fitting = minWidth ? candidates.filter((image) => image.width >= minWidth).pop() : null;
        return toHttpImage((fitting ?? candidates[0])?.url);
    }

    // Big enough for the cover on this screen, and no bigger: a size Spotify's own views have often
    // loaded already (640px on a 1080p screen), rather than the largest, which has to be downloaded.
    function coverPixels() {
        const { width = 0, height = 0 } = window.screen ?? {};
        return Math.round(Math.min(height * 0.62, width * 0.4) * (window.devicePixelRatio || 1) * 0.9);
    }

    function artistNames(item) {
        const meta = item.metadata ?? {};
        let artists = (item.artists ?? []).map((artist) => artist?.name).filter(Boolean);
        if (!artists.length) {
            artists = Object.keys(meta)
                .filter((key) => key.startsWith("artist_name"))
                .sort()
                .map((key) => meta[key]);
        }
        return artists.join(", ") || item.show?.name || "";
    }

    function readTrack() {
        const item = Player.data?.item;
        if (!item) return null;
        const meta = item.metadata ?? {};
        return {
            uri: item.uri,
            isTrack: typeof item.uri === "string" && item.uri.startsWith("spotify:track:"),
            title: item.name || meta.title || "",
            artists: artistNames(item),
            artistUri: item.artists?.[0]?.uri || meta.artist_uri || "",
            artistLinks: (item.artists ?? []).filter((artist) => artist?.name).map(({ name, uri }) => ({ name, uri })),
            album: item.album?.name || meta.album_title || "",
            albumUri: item.album?.uri || meta.album_uri || "",
            image: pickImage(item, coverPixels()),
            bgImage: pickImage(item, BG_SOURCE_MIN),
            // Spotify's lyrics endpoint takes the cover's own (spotify:image:) URL.
            lyricsImage: imageCandidates(item)[0]?.url || "",
        };
    }

    const CONTEXT_LABELS = {
        playlist: "Playing from playlist",
        album: "Playing from album",
        artist: "Playing from artist",
        show: "Playing from podcast",
        station: "Playing from radio",
        search: "Playing from search",
    };

    function readContext(data) {
        const context = data?.context;
        const name = context?.metadata?.context_description;
        if (!context?.uri || !name) return null;
        const type = context.uri.split(":")[1];
        return { label: CONTEXT_LABELS[type] ?? "Playing from", name, uri: context.uri };
    }

    // The app's own path for a spotify: URI ("/album/…"), or null for things without a page.
    function uriToPath(uri) {
        if (!uri) return null;
        try {
            const path = Spicetify.URI?.fromString?.(uri)?.toURLPath?.(true);
            if (path) return path;
        } catch {}
        const [, type, id] = uri.split(":");
        return ["album", "artist", "playlist", "show", "episode"].includes(type) && id ? `/${type}/${id}` : null;
    }

    function readNext() {
        try {
            const queue = Player.origin.getQueue?.();
            const item = queue?.queued?.[0] ?? queue?.nextUp?.[0];
            if (!item) return null;
            return { title: item.name || item.metadata?.title || "", artists: artistNames(item), image: pickImage(item, 200) };
        } catch {
            return null;
        }
    }

    // ---------- Overlay DOM (built once, toggled with a class) ----------

    const style = document.createElement("style");
    style.id = "fsa-style";
    style.textContent = `
#fsa-root {
    position: fixed;
    inset: 0;
    /* Above Spotify's app (#main is z-index 0 and isolated), below Spicetify's modals (100) and tooltips. */
    z-index: 99;
    display: none;
    overflow: hidden;
    contain: strict;
    background-color: var(--spice-main);
    user-select: none;
    -webkit-app-region: no-drag;
    /* Text colours go through these so the solid-colour background can swap them for contrast. */
    --fsa-text: var(--spice-text);
    --fsa-subtext: var(--spice-subtext);
    --fsa-rgb-text: var(--spice-rgb-text);
    --fsa-cover-size: min(62vh, 40vw);
    --fsa-zoom: 1;
    --fsa-dim: 1;
    color: var(--fsa-text);
}
#fsa-root:focus {
    outline: none;
}
#fsa-root.fsa-open {
    display: block;
    animation: fsa-fade-in 300ms ease-out;
}
#fsa-root.fsa-idle,
#fsa-root.fsa-idle * {
    cursor: none !important;
}

/* ----- Background ----- */
.fsa-bg,
.fsa-blur,
.fsa-layer,
.fsa-artist,
.fsa-color,
.fsa-shade {
    position: absolute;
    inset: 0;
}
.fsa-blur,
.fsa-artist,
.fsa-color {
    display: none;
}
#fsa-root:is(.fsa-mode-art, .fsa-mode-artist) .fsa-blur,
#fsa-root.fsa-mode-artist .fsa-artist,
#fsa-root.fsa-mode-color .fsa-color {
    display: block;
}
/* Each layer is its own stacking context so its two crossfading copies only stack against each other. */
.fsa-layer,
.fsa-artist {
    z-index: 0;
}
/* Tiny canvases stretched over the screen: the GPU scales their small textures, so nothing this big is ever rasterised. */
.fsa-bg-img {
    position: absolute;
    left: 50%;
    top: 50%;
    /* Zoom only ever makes layers bigger, so their edges stay off screen. */
    width: calc(160vmax * var(--fsa-zoom));
    height: calc(160vmax * var(--fsa-zoom));
    transform: translate(-50%, -50%);
    will-change: transform, opacity;
}
/* The soft layers' blobs fill the middle half of their bitmap, so these are twice the blob size. */
.fsa-layer-a .fsa-bg-img {
    left: 22%;
    top: 28%;
    width: calc(230vmax * var(--fsa-zoom));
    height: calc(230vmax * var(--fsa-zoom));
}
/* Mirrored, so it doesn't look like a copy of the layer above. */
.fsa-layer-b .fsa-bg-img {
    left: 78%;
    top: 72%;
    width: calc(210vmax * var(--fsa-zoom));
    height: calc(210vmax * var(--fsa-zoom));
    transform: translate(-50%, -50%) scaleX(-1);
}

/* Motion (only applied to the blurred art background). The speed setting is applied to these
   animations' playback rate from script, so changing it doesn't make them jump. */
#fsa-root.fsa-motion-swirl .fsa-bg-img {
    animation: fsa-spin 90s linear infinite;
}
#fsa-root.fsa-motion-swirl .fsa-layer-a .fsa-bg-img {
    animation-duration: 64s;
    animation-direction: reverse;
    animation-delay: -20s;
}
#fsa-root.fsa-motion-swirl .fsa-layer-b .fsa-bg-img {
    animation-name: fsa-spin-mirror;
    animation-duration: 48s;
    animation-delay: -31s;
}
#fsa-root.fsa-motion-drift .fsa-layer-base .fsa-bg-img {
    animation: fsa-breathe 40s ease-in-out infinite alternate;
}
#fsa-root.fsa-motion-drift .fsa-layer-a .fsa-bg-img {
    animation: fsa-drift-a 26s ease-in-out -9s infinite alternate;
}
#fsa-root.fsa-motion-drift .fsa-layer-b .fsa-bg-img {
    animation: fsa-drift-b 20s ease-in-out -13s infinite alternate;
}
/* Important because the motion rules above use the animation shorthand, which would set it back to running. */
#fsa-root.fsa-paused .fsa-bg-img {
    animation-play-state: paused !important;
}
.fsa-artist-img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center 30%;
}
.fsa-color {
    transition: background-color ${FADE_MS}ms ease;
}
.fsa-shade {
    background: radial-gradient(
        ellipse at 50% 50%,
        rgba(var(--spice-rgb-main), calc(0.2 * var(--fsa-dim))),
        rgba(var(--spice-rgb-main), calc(0.55 * var(--fsa-dim)))
    );
}
#fsa-root.fsa-mode-artist .fsa-shade {
    background: linear-gradient(
        to top,
        rgba(var(--spice-rgb-main), calc(0.85 * var(--fsa-dim))),
        rgba(var(--spice-rgb-main), calc(0.35 * var(--fsa-dim))) 50%,
        rgba(var(--spice-rgb-main), calc(0.45 * var(--fsa-dim)))
    );
}
#fsa-root:is(.fsa-mode-color, .fsa-mode-theme) .fsa-shade {
    display: none;
}

/* Crossfade states: the incoming copy fades in on top of the outgoing one, so there's no dip. */
.fsa-art {
    opacity: 0;
    visibility: hidden;
}
.fsa-art[data-fsa-state="front"] {
    z-index: 1;
    opacity: 1;
    visibility: visible;
    transition: opacity ${FADE_MS}ms ease;
}
.fsa-art[data-fsa-state="back"] {
    opacity: 1;
    visibility: visible;
}
.fsa-art[data-fsa-state="out"] {
    visibility: visible;
    transition: opacity ${FADE_MS}ms ease;
}

/* ----- Stage: cover, details, lyrics ----- */
.fsa-stage {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6vw;
    padding: 8vh 7vw;
    box-sizing: border-box;
}
.fsa-cover {
    position: relative;
    flex: none;
    width: var(--fsa-cover-size);
    height: var(--fsa-cover-size);
    border-radius: 8px;
    overflow: hidden;
    background-color: rgba(var(--fsa-rgb-text), 0.08);
    box-shadow: 0 24px 64px rgba(var(--spice-rgb-shadow), 0.5);
}
.fsa-cover-img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
}
.fsa-cover-empty {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--fsa-subtext);
}
.fsa-cover-empty svg {
    width: 28%;
    height: 28%;
}

.fsa-panel {
    flex: 0 1 min(44vw, 760px);
    min-width: 0;
    display: flex;
    flex-direction: column;
}
.fsa-title {
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    overflow: hidden;
    overflow-wrap: anywhere;
    font-family: var(--encore-title-font-stack);
    font-size: clamp(28px, 4.4vw, 84px);
    font-weight: 700;
    line-height: 1.12;
    letter-spacing: -0.02em;
}
.fsa-artists,
.fsa-album {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
}
.fsa-artists {
    margin-top: 0.6em;
    font-size: clamp(16px, 1.9vw, 34px);
    font-weight: 600;
}
.fsa-album {
    margin-top: 0.4em;
    font-size: clamp(14px, 1.3vw, 22px);
}
.fsa-artists:empty,
.fsa-album:empty {
    display: none;
}
/* Sized to each line's text. On hover they keep their space, so the text doesn't move when they appear. */
.fsa-info-icon {
    display: inline-block;
    width: 0.85em;
    height: 0.85em;
    margin-right: 0.35em;
    vertical-align: -0.12em;
    transition: opacity 0.2s;
}
.fsa-title .fsa-info-icon {
    width: 0.55em;
    height: 0.55em;
    margin-right: 0.25em;
}
.fsa-info-icon svg {
    display: block;
}
#fsa-root.fsa-icons-hover .fsa-info-icon {
    opacity: 0;
}
#fsa-root.fsa-icons-hover .fsa-panel:hover .fsa-info-icon {
    opacity: 1;
}
/* Inside Spotify something else colours links; without this they differ from the rest of their line. */
#fsa-root .fsa-link {
    color: inherit !important;
}
.fsa-link {
    text-decoration: none;
    cursor: pointer;
}
.fsa-link:hover {
    text-decoration: underline;
}

.fsa-progress {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-top: 5vh;
}
.fsa-time {
    flex: none;
    min-width: 40px;
    font-size: clamp(12px, 0.95vw, 16px);
    font-variant-numeric: tabular-nums;
    color: var(--fsa-subtext);
}
.fsa-time-total {
    text-align: right;
}
.fsa-bar {
    position: relative;
    flex: 1;
    padding: 8px 0;
}
.fsa-seekable {
    cursor: pointer;
}
.fsa-track {
    height: 4px;
    border-radius: 3px;
    overflow: hidden;
    background-color: rgba(var(--fsa-rgb-text), 0.25);
    transition: height 150ms ease;
}
.fsa-seekable:hover .fsa-track {
    height: 6px;
}
.fsa-bar-tip {
    position: absolute;
    bottom: calc(100% + 4px);
    padding: 3px 8px;
    border-radius: 4px;
    background-color: rgba(var(--spice-rgb-main), 0.85);
    color: var(--spice-text);
    font-size: 12px;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
    transform: translateX(-50%);
    pointer-events: none;
    opacity: 0;
    transition: opacity 150ms ease;
}
.fsa-seekable:hover .fsa-bar-tip {
    opacity: 1;
}
.fsa-fill {
    width: 100%;
    height: 100%;
    background-color: var(--fsa-text);
    transform: translateX(-100%);
}
.fsa-seekable:hover .fsa-fill {
    background-color: var(--spice-button);
}

.fsa-controls {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
    gap: 12px;
    margin-top: 2.5vh;
    transition: opacity 400ms ease;
}
.fsa-controls-main,
.fsa-controls-side {
    display: flex;
    align-items: center;
    gap: 16px;
}
.fsa-controls-start {
    justify-self: start;
}
.fsa-controls-end {
    justify-self: end;
}
.fsa-active,
.fsa-liked {
    color: var(--spice-button-active) !important;
}
.fsa-active {
    position: relative;
}
.fsa-active::after {
    content: "";
    position: absolute;
    left: 50%;
    bottom: 2px;
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background-color: currentColor;
    transform: translateX(-50%);
}

/* ----- Lyrics ----- */
.fsa-lyrics {
    display: none;
    position: relative;
    min-width: 0;
    overflow: hidden;
    -webkit-mask-image: linear-gradient(to bottom, transparent, #000 14%, #000 86%, transparent);
    mask-image: linear-gradient(to bottom, transparent, #000 14%, #000 86%, transparent);
}
.fsa-lyrics.fsa-unsynced {
    overflow-y: auto;
    scrollbar-width: none;
}
.fsa-lyrics-list {
    padding: 30vh 0;
    transition: transform 500ms cubic-bezier(0.3, 0, 0.2, 1);
}
.fsa-lyric {
    margin: 0 0 0.8em;
    font-family: var(--encore-title-font-stack);
    font-size: clamp(22px, 2.6vw, 52px);
    font-weight: 800;
    line-height: 1.18;
    letter-spacing: -0.02em;
    text-align: right;
    overflow-wrap: anywhere;
    opacity: 0.35;
    transition: opacity 300ms ease;
}
.fsa-lyrics:not(.fsa-unsynced) .fsa-lyric {
    cursor: pointer;
}
.fsa-lyrics:not(.fsa-unsynced) .fsa-lyric:hover {
    opacity: 0.7;
}
.fsa-lyrics .fsa-lyric.fsa-lyric-active,
.fsa-unsynced .fsa-lyric {
    opacity: 1;
}
/* Lyrics Plus in the same column. In this mode it leaves its colours and sizes to the host. */
.fsa-lyrics-plus {
    position: absolute;
    inset: 0;
}
#fsa-root .fsa-lyrics-plus .lyrics-lyricsContainer-LyricsContainer {
    --lyrics-color-active: var(--fsa-text);
    --lyrics-color-inactive: rgba(var(--fsa-rgb-text), 0.35);
    --lyrics-color-background: transparent;
    --lyrics-highlight-background: rgba(var(--fsa-rgb-text), 0.15);
    --lyrics-align-text: right;
    --lyrics-font-size: clamp(26px, 3vw, 60px);
    --animation-tempo: 0.2s;
    height: 100%;
    font-family: var(--encore-title-font-stack);
    font-weight: 800;
    letter-spacing: -0.02em;
    scrollbar-width: none;
}
/* It enlarges the current line by 10% from its aligned edge; leave room so the column doesn't clip it. */
#fsa-root .fsa-lyrics-plus .lyrics-lyricsContainer-LyricsLine {
    margin-left: 10%;
    margin-right: 0;
}

/* ----- Chrome: context, up next, volume, corner buttons, settings ----- */
/* Above the stage, whose front cover image is z-index 1, so panels can overlap the art. */
.fsa-chrome {
    position: absolute;
    inset: 0;
    z-index: 2;
    pointer-events: none;
}
.fsa-chrome > * {
    pointer-events: auto;
}
.fsa-context {
    position: absolute;
    left: 4vw;
    top: 5vh;
    max-width: 40vw;
    transition: opacity 400ms ease;
}
.fsa-context-label {
    font-size: clamp(11px, 0.9vw, 16px);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--fsa-subtext);
}
.fsa-context-name {
    margin-top: 2px;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    font-size: clamp(14px, 1.15vw, 22px);
    font-weight: 700;
}
.fsa-upnext {
    position: absolute;
    right: 4vw;
    top: 5vh;
    display: flex;
    align-items: center;
    gap: 16px;
    max-width: min(30vw, 520px);
    padding: 0 20px 0 0;
    border-radius: 8px;
    overflow: hidden;
    background-color: rgba(var(--spice-rgb-main), 0.75);
    box-shadow: 0 8px 24px rgba(var(--spice-rgb-shadow), 0.3);
    opacity: 0;
    transform: translateY(-8px);
    pointer-events: none;
    transition: opacity 400ms ease, transform 400ms ease;
}
#fsa-root.fsa-near-end .fsa-upnext,
.fsa-upnext.fsa-upnext-always {
    opacity: 1;
    transform: none;
}
.fsa-upnext-img {
    flex: none;
    width: clamp(56px, 5.5vw, 104px);
    height: clamp(56px, 5.5vw, 104px);
    object-fit: cover;
}
.fsa-upnext-text {
    min-width: 0;
    padding: 12px 0;
}
.fsa-upnext-label {
    font-size: clamp(11px, 0.85vw, 15px);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--spice-subtext);
}
.fsa-upnext-title {
    margin-top: 4px;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    font-size: clamp(14px, 1.1vw, 20px);
    font-weight: 700;
    color: var(--spice-text);
}
.fsa-clock {
    position: absolute;
    right: 4vw;
    top: 5vh;
    font-size: clamp(20px, 2vw, 40px);
    font-weight: 700;
    line-height: 1.2;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
    color: var(--fsa-text);
}
/* Up next shares the top right, so it moves below the clock. */
#fsa-root.fsa-clock-on .fsa-upnext {
    top: calc(5vh + 1.2 * clamp(20px, 2vw, 40px) + 1.5vh);
}
.fsa-volume {
    position: absolute;
    left: 2.2vw;
    top: 50%;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    transform: translateY(-50%);
    transition: opacity 400ms ease;
}
.fsa-volume-value {
    font-size: 13px;
    font-variant-numeric: tabular-nums;
    color: var(--fsa-subtext);
}
.fsa-volume-slider {
    width: 6px;
    height: 26vh;
    margin: 0;
    writing-mode: vertical-lr;
    direction: rtl;
    accent-color: var(--fsa-text);
    cursor: pointer;
}
.fsa-corner {
    position: absolute;
    right: 2vw;
    bottom: 3vh;
    display: flex;
    gap: 4px;
    transition: opacity 400ms ease;
}
#fsa-root.fsa-idle :is(.fsa-controls, .fsa-volume, .fsa-corner),
#fsa-root.fsa-still .fsa-chrome .fsa-on-hover {
    opacity: 0;
    pointer-events: none;
}

.fsa-settings {
    position: absolute;
    right: 2vw;
    bottom: calc(3vh + 56px);
    width: min(380px, 90vw);
    max-height: calc(100vh - 3vh - 96px);
    overflow-y: auto;
    padding: 8px 20px 16px;
    box-sizing: border-box;
    border-radius: 12px;
    background-color: var(--spice-main-elevated);
    color: var(--spice-text);
    box-shadow: 0 16px 48px rgba(var(--spice-rgb-shadow), 0.5);
    user-select: none;
}
.fsa-settings-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 16px;
    font-weight: 700;
}
.fsa-settings-section {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    margin: 8px 0 0;
    padding: 12px 0;
    border: 0;
    border-top: 1px solid rgba(var(--spice-rgb-text), 0.1);
    background: none;
    color: var(--spice-subtext);
    font: inherit;
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    cursor: pointer;
}
.fsa-settings-section:hover {
    color: var(--spice-text);
}
.fsa-chevron {
    width: 6px;
    height: 6px;
    margin-right: 4px;
    border-right: 1.5px solid currentColor;
    border-bottom: 1.5px solid currentColor;
    transform: translateY(-2px) rotate(45deg);
    transition: transform 150ms ease;
}
.fsa-settings-section[aria-expanded="false"] .fsa-chevron {
    transform: rotate(-45deg);
}
.fsa-settings-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    min-height: 40px;
    font-size: 14px;
}
.fsa-select {
    max-width: 200px;
    padding: 6px 8px;
    border: 1px solid rgba(var(--spice-rgb-text), 0.2);
    border-radius: 4px;
    background-color: var(--spice-main);
    color: var(--spice-text);
    font: inherit;
    font-size: 13px;
}
.fsa-slider {
    display: flex;
    align-items: center;
    gap: 10px;
}
.fsa-range {
    width: 150px;
    margin: 0;
    accent-color: var(--spice-button-active);
    cursor: pointer;
}
.fsa-slider-value {
    min-width: 40px;
    text-align: right;
    font-size: 13px;
    font-variant-numeric: tabular-nums;
    color: var(--spice-subtext);
}
.fsa-button {
    flex: none;
    padding: 6px 14px;
    border: 1px solid rgba(var(--spice-rgb-text), 0.3);
    border-radius: 999px;
    background: none;
    color: var(--spice-text);
    font: inherit;
    font-size: 13px;
    cursor: pointer;
}
.fsa-button:hover:not(:disabled) {
    border-color: var(--spice-text);
}
.fsa-button:disabled {
    opacity: 0.4;
    cursor: default;
}
.fsa-settings-note {
    margin: 4px 0;
    font-size: 12px;
    color: var(--spice-subtext);
}

.fsa-help {
    position: absolute;
    left: 50%;
    top: 50%;
    width: min(460px, 90vw);
    max-height: 86vh;
    overflow-y: auto;
    padding: 8px 24px 20px;
    box-sizing: border-box;
    border-radius: 12px;
    background-color: var(--spice-main-elevated);
    color: var(--spice-text);
    box-shadow: 0 16px 48px rgba(var(--spice-rgb-shadow), 0.5);
    transform: translate(-50%, -50%);
}
.fsa-help-list {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 10px 20px;
    align-items: center;
    margin: 12px 0 0;
    font-size: 14px;
}
.fsa-help-list dt {
    white-space: nowrap;
    color: var(--spice-subtext);
}
.fsa-help-list dd {
    margin: 0;
}
.fsa-help kbd {
    display: inline-block;
    min-width: 14px;
    margin-right: 4px;
    padding: 2px 7px;
    border: 1px solid rgba(var(--spice-rgb-text), 0.25);
    border-bottom-width: 2px;
    border-radius: 5px;
    font: inherit;
    font-size: 12px;
    font-weight: 700;
    text-align: center;
    color: var(--spice-text);
}

.fsa-toast {
    position: absolute;
    left: 50%;
    top: 5vh;
    z-index: 2;
    max-width: 60vw;
    padding: 10px 22px;
    border-radius: 999px;
    background-color: rgba(var(--spice-rgb-main), 0.85);
    color: var(--spice-text);
    box-shadow: 0 8px 24px rgba(var(--spice-rgb-shadow), 0.3);
    font-size: 15px;
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    opacity: 0;
    transform: translate(-50%, -8px);
    pointer-events: none;
    transition: opacity 200ms ease, transform 200ms ease;
}
.fsa-toast.fsa-toast-on {
    opacity: 1;
    transform: translate(-50%, 0);
}

/* ----- Layouts ----- */
/* Stacked, so everything is a size smaller than side by side, leaving the same breathing room at the edges. */
#fsa-root.fsa-layout-center .fsa-stage {
    flex-direction: column;
    gap: 3.5vh;
    padding: 10vh 7vw;
}
#fsa-root.fsa-layout-center .fsa-cover {
    --fsa-cover-size: min(40vh, 50vw);
}
#fsa-root.fsa-layout-center .fsa-panel {
    flex: none;
    width: min(60vw, 680px);
    text-align: center;
}
#fsa-root.fsa-layout-center .fsa-title {
    font-size: clamp(26px, 3vw, 60px);
}
#fsa-root.fsa-layout-center .fsa-artists {
    font-size: clamp(15px, 1.5vw, 28px);
}
#fsa-root.fsa-layout-center .fsa-progress {
    margin-top: 3vh;
}
#fsa-root.fsa-layout-center .fsa-controls {
    margin-top: 2vh;
}

#fsa-root.fsa-layout-corner .fsa-stage {
    justify-content: flex-start;
    align-items: flex-end;
    gap: 3vw;
    padding: 6vh 4vw;
}
#fsa-root.fsa-layout-corner .fsa-cover {
    --fsa-cover-size: min(28vh, 22vw);
}
#fsa-root.fsa-layout-corner .fsa-panel {
    flex: 0 1 min(56vw, 960px);
}
#fsa-root.fsa-layout-corner .fsa-title {
    font-size: clamp(32px, 4.6vw, 104px);
}
#fsa-root.fsa-layout-corner .fsa-progress {
    margin-top: 3vh;
}

@media (max-aspect-ratio: 1/1) {
    #fsa-root.fsa-layout-side .fsa-stage {
        flex-direction: column;
        gap: 5vh;
    }
    #fsa-root.fsa-layout-side .fsa-cover {
        --fsa-cover-size: min(48vh, 78vw);
    }
    #fsa-root.fsa-layout-side .fsa-panel {
        flex: none;
        width: min(88vw, 640px);
        text-align: center;
    }
}

#fsa-root.fsa-lyrics-on .fsa-stage {
    display: grid;
    grid-template-columns: minmax(0, min(32vw, 560px)) minmax(0, 1fr);
    grid-template-rows: 1fr auto auto 1fr;
    column-gap: 7vw;
    row-gap: 3vh;
    padding: 6vh 5vw 6vh 6vw;
}
#fsa-root.fsa-lyrics-on .fsa-cover {
    grid-column: 1;
    grid-row: 2;
    justify-self: center;
    --fsa-cover-size: min(44vh, 30vw);
}
#fsa-root.fsa-lyrics-on .fsa-panel {
    grid-column: 1;
    grid-row: 3;
    text-align: center;
}
#fsa-root.fsa-lyrics-on .fsa-title {
    font-size: clamp(22px, 2.3vw, 44px);
}
#fsa-root.fsa-lyrics-on .fsa-artists {
    font-size: clamp(14px, 1.3vw, 24px);
}
#fsa-root.fsa-lyrics-on .fsa-progress {
    margin-top: 2.5vh;
}
#fsa-root.fsa-lyrics-on .fsa-lyrics {
    display: block;
    grid-column: 2;
    grid-row: 1 / -1;
    /* Fill its cell rather than growing to the whole song's height. */
    align-self: stretch;
}
@media (max-aspect-ratio: 1/1) {
    #fsa-root.fsa-lyrics-on .fsa-stage {
        grid-template-columns: minmax(0, 1fr);
        grid-template-rows: auto auto minmax(0, 1fr);
        padding: 14vh 6vw 10vh;
    }
    #fsa-root.fsa-lyrics-on .fsa-cover {
        grid-row: 1;
        --fsa-cover-size: min(24vh, 50vw);
    }
    #fsa-root.fsa-lyrics-on .fsa-panel {
        grid-row: 2;
        justify-self: center;
        width: min(88vw, 640px);
    }
    #fsa-root.fsa-lyrics-on .fsa-lyrics {
        grid-column: 1;
        grid-row: 3;
    }
    #fsa-root.fsa-lyrics-on .fsa-lyric {
        text-align: center;
    }
    #fsa-root .fsa-lyrics-plus .lyrics-lyricsContainer-LyricsContainer {
        --lyrics-align-text: center;
    }
    #fsa-root .fsa-lyrics-plus .lyrics-lyricsContainer-LyricsLine {
        margin-left: 5%;
        margin-right: 5%;
    }
}

@media (prefers-reduced-motion: reduce) {
    #fsa-root.fsa-open,
    .fsa-bg-img {
        animation: none !important;
    }
    .fsa-lyrics-list {
        transition: none;
    }
}

@keyframes fsa-fade-in {
    from {
        opacity: 0;
    }
}
@keyframes fsa-spin {
    from {
        transform: translate(-50%, -50%) rotate(0turn);
    }
    to {
        transform: translate(-50%, -50%) rotate(1turn);
    }
}
@keyframes fsa-spin-mirror {
    from {
        transform: translate(-50%, -50%) rotate(0turn) scaleX(-1);
    }
    to {
        transform: translate(-50%, -50%) rotate(1turn) scaleX(-1);
    }
}
/* Drift keeps every layer at least its full size and moves it by under a tenth of it,
   so the layers' edges stay off screen in any window shape. */
@keyframes fsa-breathe {
    from {
        transform: translate(-50%, -50%) rotate(-6deg) scale(1);
    }
    to {
        transform: translate(-50%, -50%) rotate(6deg) scale(1.15);
    }
}
@keyframes fsa-drift-a {
    0% {
        transform: translate(-50%, -50%) rotate(0deg) scale(1);
    }
    50% {
        transform: translate(-43%, -56%) rotate(20deg) scale(1.08);
    }
    100% {
        transform: translate(-56%, -45%) rotate(-14deg) scale(1.02);
    }
}
@keyframes fsa-drift-b {
    0% {
        transform: translate(-50%, -50%) rotate(0deg) scale(-1, 1);
    }
    50% {
        transform: translate(-57%, -44%) rotate(-18deg) scale(-1.08, 1.08);
    }
    100% {
        transform: translate(-45%, -55%) rotate(12deg) scale(-1.02, 1.02);
    }
}
`;

    function el(tag, className, parent) {
        const node = document.createElement(tag);
        node.className = className;
        parent?.appendChild(node);
        return node;
    }

    function artImg(className, parent) {
        const img = el("img", `fsa-art ${className}`, parent);
        img.alt = "";
        img.draggable = false;
        img.decoding = "async";
        return img;
    }

    const host = el("div", "");
    host.id = "fsa-root";
    host.tabIndex = -1;
    host.setAttribute("role", "dialog");
    host.setAttribute("aria-label", "Full Screen Plus");

    // Background: an opaque base copy of the art plus two soft-edged copies drifting over it,
    // the artist's image, or a solid colour. Each image has two slots to crossfade between.
    const bg = el("div", "fsa-bg", host);
    const blur = el("div", "fsa-blur", bg);
    function bgCanvas(parent) {
        const canvas = el("canvas", "fsa-art fsa-bg-img", parent);
        canvas.width = canvas.height = BG_SIZE;
        return canvas;
    }
    const layerCanvases = ["fsa-layer-base", "fsa-layer-a", "fsa-layer-b"].map((name) => {
        const layer = el("div", `fsa-layer ${name}`, blur);
        return [bgCanvas(layer), bgCanvas(layer)];
    });
    const artistLayer = el("div", "fsa-artist", bg);
    const artistImgs = [artImg("fsa-artist-img", artistLayer), artImg("fsa-artist-img", artistLayer)];
    const colorLayer = el("div", "fsa-color", bg);
    el("div", "fsa-shade", bg);

    const stage = el("div", "fsa-stage", host);
    const cover = el("div", "fsa-cover", stage);
    el("div", "fsa-cover-empty", cover).innerHTML = svg(ICONS.track);
    const coverImgs = [artImg("fsa-cover-img", cover), artImg("fsa-cover-img", cover)];
    const panel = el("div", "fsa-panel", stage);
    const lyricsBox = el("div", "fsa-lyrics", stage);
    const lyricsList = el("div", "fsa-lyrics-list", lyricsBox);
    const chrome = el("div", "fsa-chrome", host);
    const toast = el("div", "fsa-toast", host);
    toast.setAttribute("role", "status");

    function applyClasses() {
        for (const [layout] of CHOICES.layout) host.classList.toggle(`fsa-layout-${layout}`, settings.layout === layout);
        for (const [mode] of CHOICES.background) host.classList.toggle(`fsa-mode-${mode}`, settings.background === mode);
        for (const [motion] of CHOICES.bgMotion) {
            host.classList.toggle(`fsa-motion-${motion}`, settings.background === "art" && settings.bgMotion === motion);
        }
        host.style.setProperty("--fsa-zoom", settings.bgZoom);
        host.style.setProperty("--fsa-dim", settings.bgDim);
        applySpeed();
        // Keep the lyrics layout while the next song's lyrics load, so it doesn't jump on every song change.
        const lyricsOn =
            settings.lyrics &&
            (lyricsPlusBox.isConnected
                ? lyricsPlusStatus !== "none"
                : lyrics?.uri === currentTrack?.uri && lyrics?.status !== "none");
        host.classList.toggle("fsa-lyrics-on", !!lyricsOn);
        host.classList.toggle("fsa-settings-open", settingsOpen);
        host.classList.toggle("fsa-clock-on", settings.clock !== "off");
        host.classList.toggle("fsa-icons-hover", settings.infoIcons === "hover");
    }

    // The background's animations are made by CSS whenever they start (opening, changing motion),
    // so this runs after each of those. A playback rate keeps an animation where it is when it changes.
    function applySpeed() {
        if (!isOpen) return;
        for (const canvas of blur.querySelectorAll(".fsa-bg-img")) {
            for (const animation of canvas.getAnimations?.() ?? []) animation.playbackRate = settings.bgSpeed;
        }
    }

    // ---------- Crossfading ----------

    function setState(img, state) {
        img.dataset.fsaState = state;
    }

    // Pairs of stacked elements; the back one of each pair is repainted, then faded in over the front one.
    function makeFader(pairs) {
        let front = 0;
        let timer = 0;
        // Hide whatever the last crossfade left behind the front copies.
        const settle = () => {
            clearTimeout(timer);
            timer = 0;
            for (const pair of pairs) setState(pair[1 - front], "");
        };
        return {
            back: () => pairs.map((pair) => pair[1 - front]),
            current: () => pairs.map((pair) => pair[front]),
            settle,
            show(on) {
                pairs.forEach((pair, index) => {
                    setState(pair[1 - front], on[index] ? "front" : "");
                    setState(pair[front], on[index] ? "back" : "out");
                });
                front = 1 - front;
                clearTimeout(timer);
                timer = setTimeout(settle, FADE_MS + 100);
            },
        };
    }

    const artFader = makeFader([coverImgs, ...layerCanvases]);
    const artistFader = makeFader([artistImgs]);

    // No CORS needed anywhere: the canvases are only drawn on, never read back. Plain requests also
    // share the cache with Spotify's own images.
    async function loadInto(img, url) {
        img.src = url;
        try {
            await img.decode();
            return true;
        } catch {
            return false;
        }
    }

    function paintBlur(canvas, image, soft) {
        const ctx = canvas.getContext("2d");
        const blurPx = Number((BG_BLUR * settings.bgBlur).toFixed(1));
        const saturate = Number((BG_SATURATE * settings.bgColor).toFixed(2));
        ctx.globalCompositeOperation = "source-over";
        ctx.filter = "none";
        ctx.clearRect(0, 0, BG_SIZE, BG_SIZE);
        // Soft copies only fill the middle of the bitmap. Their square layers are drawn twice as big, so the
        // edges of a rotating layer never come on screen (a rotated edge shows as a thin line, even when transparent).
        const inset = soft ? BG_SIZE / 4 : 0;
        // Over-draw past the edges so the blur doesn't pull in transparency from outside.
        const pad = blurPx * 2;
        const size = BG_SIZE - inset * 2 + pad * 2;
        ctx.filter = `blur(${blurPx}px) saturate(${saturate})`;
        ctx.drawImage(image, inset - pad, inset - pad, size, size);
        if (soft) {
            // Fade the blob out to nothing well inside the bitmap. Only the alpha matters here.
            const r = BG_SIZE / 2;
            const fade = ctx.createRadialGradient(r, r, 0, r, r, r - inset);
            fade.addColorStop(0, "rgba(0, 0, 0, 0.85)");
            fade.addColorStop(0.55, "rgba(0, 0, 0, 0.55)");
            fade.addColorStop(1, "rgba(0, 0, 0, 0)");
            ctx.filter = "none";
            ctx.globalCompositeOperation = "destination-in";
            ctx.fillStyle = fade;
            ctx.fillRect(0, 0, BG_SIZE, BG_SIZE);
        }
    }

    let shownArt = null;
    let artToken = 0;
    let onScreen = { cover: null, bg: null, source: null };

    async function showArt(track) {
        const coverUrl = track?.image || "";
        const bgUrl = track?.bgImage || "";
        // The blur and colour settings are part of what's shown, so changing them redraws the background.
        const key = [coverUrl, bgUrl, settings.bgBlur, settings.bgColor].join(" ");
        if (key === shownArt) return;
        shownArt = key;
        const token = ++artToken;
        if (coverUrl === onScreen.cover && bgUrl === onScreen.bg) {
            // Same art, new blur or colour: redraw what's showing in place, so dragging a slider is instant.
            if (onScreen.source) {
                artFader.current().slice(1).forEach((canvas, index) => paintBlur(canvas, onScreen.source, index > 0));
            }
            return;
        }
        // The back copies are about to be repainted, so they mustn't still be showing under a crossfade.
        artFader.settle();
        const [coverImg, ...bgCanvases] = artFader.back();

        const source = document.createElement("img");
        if (!coverUrl) coverImg.removeAttribute("src");
        const [coverOn, sourceOn] = await Promise.all([
            coverUrl ? loadInto(coverImg, coverUrl) : false,
            bgUrl ? loadInto(source, bgUrl) : false,
        ]);
        if (token !== artToken) return;

        let bgOn = false;
        if (sourceOn) {
            try {
                bgCanvases.forEach((canvas, index) => paintBlur(canvas, source, index > 0));
                bgOn = true;
            } catch {}
        }
        artFader.show([coverOn, bgOn, bgOn, bgOn]);
        onScreen = { cover: coverUrl, bg: bgUrl, source: bgOn ? source : null };
    }

    // ---------- Extras: artist image, solid colour, lyrics (fetched only when a setting needs them) ----------

    const cache = { artistImage: new Map(), color: new Map(), lyrics: new Map() };

    function remember(map, key, value) {
        map.set(key, value);
        if (map.size > 60) map.delete(map.keys().next().value);
    }

    function loadExtras() {
        if (!isOpen || !currentTrack) return;
        if (settings.background === "artist") loadArtistImage(currentTrack);
        if (settings.background === "color") loadColor(currentTrack);
        if (settings.lyrics && !usingLyricsPlus()) loadLyrics(currentTrack);
    }

    async function fetchArtistImage(artistUri) {
        const definition = Spicetify.GraphQL?.Definitions?.queryArtistOverview;
        if (!definition || !artistUri) return "";
        // GraphQL reports errors in the response rather than throwing, so check what came back.
        const res = await Spicetify.GraphQL.Request(definition, { uri: artistUri, locale: "", preReleaseV2: false });
        const artist = res?.data?.artistUnion;
        const largest = (sources) =>
            [...(sources ?? [])].sort((a, b) => (b.maxWidth ?? b.width ?? 0) - (a.maxWidth ?? a.width ?? 0))[0]?.url;
        return toHttpImage(
            largest(artist?.headerImage?.data?.sources) ||
                largest(artist?.visuals?.headerImage?.sources) ||
                largest(artist?.visuals?.avatarImage?.sources) ||
                ""
        );
    }

    let artistLoadToken = 0;
    let shownArtist = null;
    let artistShowToken = 0;

    async function loadArtistImage(track) {
        const token = ++artistLoadToken;
        let url = cache.artistImage.get(track.artistUri);
        if (url === undefined) {
            try {
                url = await fetchArtistImage(track.artistUri);
                remember(cache.artistImage, track.artistUri, url);
            } catch {
                url = "";
            }
        }
        if (token !== artistLoadToken || settings.background !== "artist") return;
        showArtistImage(url);
    }

    // Without an artist image the still blurred art underneath shows through.
    async function showArtistImage(url) {
        if (url === shownArtist) return;
        shownArtist = url;
        const token = ++artistShowToken;
        artistFader.settle();
        const [img] = artistFader.back();
        let ok = false;
        if (url) ok = await loadInto(img, url);
        else img.removeAttribute("src");
        if (token !== artistShowToken) return;
        artistFader.show([ok]);
    }

    let colorToken = 0;

    async function loadColor(track) {
        const token = ++colorToken;
        let hex = cache.color.get(track.uri);
        if (hex === undefined) {
            try {
                const colors = await Spicetify.colorExtractor?.(track.uri);
                hex = colors?.VIBRANT_NON_ALARMING || colors?.DARK_VIBRANT || colors?.DESATURATED || colors?.PROMINENT || "";
                if (!/^#[0-9a-f]{6}$/i.test(hex)) hex = "";
                remember(cache.color, track.uri, hex);
            } catch {
                hex = "";
            }
        }
        if (token !== colorToken || settings.background !== "color") return;
        applyColor(hex);
    }

    // A solid background needs text that contrasts with it, so this overrides the theme's text colours.
    // Black or white is the point here, not a theme colour.
    function applyColor(hex) {
        const vars = ["--fsa-text", "--fsa-subtext", "--fsa-rgb-text", "--text-base", "--text-subdued"];
        colorLayer.style.backgroundColor = hex;
        if (!hex) {
            for (const name of vars) host.style.removeProperty(name);
            return;
        }
        const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
        const rgb = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 > 0.6 ? "0, 0, 0" : "255, 255, 255";
        host.style.setProperty("--fsa-rgb-text", rgb);
        host.style.setProperty("--fsa-text", `rgb(${rgb})`);
        host.style.setProperty("--fsa-subtext", `rgba(${rgb}, 0.7)`);
        host.style.setProperty("--text-base", `rgb(${rgb})`);
        host.style.setProperty("--text-subdued", `rgba(${rgb}, 0.7)`);
    }

    // { uri, status: "loading" | "ready" | "none", synced, lines: [{ start, text }] }
    let lyrics = null;
    let lyricsTimer = 0;
    let activeLine = -1;

    async function fetchLyrics(track) {
        const id = track.uri.split(":")[2];
        const url = `https://spclient.wg.spotify.com/color-lyrics/v2/track/${id}/image/${encodeURIComponent(
            track.lyricsImage
        )}?format=json&vocalRemoval=false&market=from_token`;
        const res = await Spicetify.CosmosAsync.get(url, null, { "app-platform": "WebPlayer" });
        const lines = (res?.lyrics?.lines ?? [])
            .map((line) => ({ start: Number(line.startTimeMs) || 0, text: (line.words ?? "").trim() || "♪" }))
            .filter((line, index, all) => line.text !== "♪" || all[index - 1]?.text !== "♪");
        if (!lines.length) return { uri: track.uri, status: "none" };
        return { uri: track.uri, status: "ready", synced: res.lyrics.syncType === "LINE_SYNCED", lines };
    }

    async function loadLyrics(track) {
        if (lyrics?.uri === track.uri) return;
        if (!track.isTrack || !Spicetify.CosmosAsync?.get) {
            setLyrics({ uri: track.uri, status: "none" });
            return;
        }
        const cached = cache.lyrics.get(track.uri);
        if (cached) {
            setLyrics(cached);
            return;
        }
        setLyrics({ uri: track.uri, status: "loading" });
        let result;
        try {
            result = await fetchLyrics(track);
            remember(cache.lyrics, track.uri, result);
        } catch {
            // Usually "no lyrics" (404). Not cached, so a network blip doesn't hide them for the session.
            result = { uri: track.uri, status: "none" };
        }
        if (currentTrack?.uri === track.uri) setLyrics(result);
    }

    function setLyrics(next) {
        lyrics = next;
        // Layout first: placing the current line measures the lyrics column.
        applyClasses();
        renderLyrics();
        renderAll();
        noteMissingLyrics();
    }

    // The lyrics column folding away could look like a fault, so say why: once per song while lyrics stay on.
    let notedMissing = "";

    function lyricsMissing() {
        if (lyricsPlusBox.isConnected) return lyricsPlusStatus === "none";
        return lyrics?.uri === currentTrack?.uri && lyrics?.status === "none";
    }

    function noteMissingLyrics() {
        if (!isOpen || !settings.lyrics || !currentTrack || notedMissing === currentTrack.uri || !lyricsMissing()) return;
        notedMissing = currentTrack.uri;
        showToast("No lyrics for this song");
    }

    function renderLyrics() {
        clearTimeout(lyricsTimer);
        lyricsTimer = 0;
        activeLine = -1;
        lyricsList.textContent = "";
        lyricsList.style.transform = "";
        lyricsBox.scrollTop = 0;
        lyricsBox.classList.toggle("fsa-unsynced", lyrics?.status === "ready" && !lyrics.synced);
        if (lyrics?.status !== "ready") return;
        for (const line of lyrics.lines) {
            const node = el("div", "fsa-lyric", lyricsList);
            node.textContent = line.text;
            if (lyrics.synced) node.addEventListener("click", () => seekTo(line.start));
        }
        scheduleLyrics();
    }

    function setActiveLine(index) {
        if (index === activeLine) return;
        lyricsList.children[activeLine]?.classList.remove("fsa-lyric-active");
        activeLine = index;
        const node = lyricsList.children[Math.max(index, 0)];
        if (!node) return;
        if (index >= 0) node.classList.add("fsa-lyric-active");
        // Keep the current line a little above the middle.
        const offset = lyricsBox.clientHeight * 0.4 - (node.offsetTop + node.offsetHeight / 2);
        lyricsList.style.transform = `translateY(${Math.round(offset)}px)`;
    }

    // Wakes up only when the next line starts, rather than polling.
    function scheduleLyrics() {
        clearTimeout(lyricsTimer);
        lyricsTimer = 0;
        if (!isOpen || document.hidden || lyrics?.status !== "ready" || !lyrics.synced) return;
        if (!host.classList.contains("fsa-lyrics-on")) return;
        const position = Player.getProgress?.() || 0;
        let index = -1;
        while (index + 1 < lyrics.lines.length && lyrics.lines[index + 1].start <= position) index++;
        setActiveLine(index);
        const next = lyrics.lines[index + 1];
        if (next && Player.data?.isPaused === false) {
            lyricsTimer = setTimeout(scheduleLyrics, Math.max(next.start - position, 20));
        }
    }

    // ---------- Lyrics Plus (Spicetify's custom app) in the lyrics column instead of ours ----------
    // While its page is open, Lyrics Plus renders into an element with this id if there is one (an arrangement
    // made for the old Full App Display), and looks again on "fad-request". It fetches and syncs by itself.

    const LYRICS_PLUS_ROUTE = "/lyrics-plus";
    const lyricsPlusBox = document.createElement("div");
    lyricsPlusBox.id = "fad-lyrics-plus-container";
    lyricsPlusBox.className = "fsa-lyrics-plus";
    // "loading" | "ready" | "none", read from what Lyrics Plus shows.
    let lyricsPlusStatus = "loading";
    let lyricsPlusPushed = false;

    const lyricsPlusInstalled = () => (Spicetify.Config?.custom_apps ?? []).includes("lyrics-plus");
    const usingLyricsPlus = () => settings.lyricsSource === "lyricsPlus" && lyricsPlusInstalled();

    // Its "no lyrics" page holds a spinner while loading, then a face.
    function readLyricsPlusStatus() {
        const unavailable = lyricsPlusBox.querySelector(".lyrics-lyricsContainer-LyricsUnavailablePage");
        if (!lyricsPlusBox.firstChild || unavailable?.querySelector("svg")) return "loading";
        return unavailable ? "none" : "ready";
    }

    const lyricsPlusObserver = new MutationObserver(() => {
        const status = readLyricsPlusStatus();
        if (status === lyricsPlusStatus) return;
        lyricsPlusStatus = status;
        applyClasses();
        noteMissingLyrics();
    });

    function syncLyricsPlus() {
        const wanted = isOpen && settings.lyrics && usingLyricsPlus();
        if (wanted === lyricsPlusBox.isConnected) return;
        const history = Spicetify.Platform?.History;
        if (wanted) {
            lyrics = null;
            renderLyrics();
            lyricsPlusStatus = "loading";
            lyricsBox.appendChild(lyricsPlusBox);
            lyricsPlusObserver.observe(lyricsPlusBox, { childList: true, subtree: true, characterData: true });
            // Its page (under the overlay) has to be open for it to run.
            if (history && history.location?.pathname !== LYRICS_PLUS_ROUTE) {
                history.push(LYRICS_PLUS_ROUTE);
                lyricsPlusPushed = true;
            }
        } else {
            lyricsPlusObserver.disconnect();
            lyricsPlusBox.remove();
            // Back to where Spotify was, unless something else has moved on from the lyrics page since.
            // Going on to a page from the overlay takes the lyrics page's place instead.
            if (lyricsPlusPushed && history?.location?.pathname === LYRICS_PLUS_ROUTE) {
                if (leavingTo) {
                    history.replace(leavingTo);
                    leavingTo = null;
                } else {
                    history.goBack();
                }
            }
            lyricsPlusPushed = false;
        }
        // Either way, Lyrics Plus looks again for where to render.
        window.dispatchEvent(new Event("fad-request"));
    }

    // ---------- Progress (one wake-up per second; CSS glides the bar in between) ----------

    const refs = {};
    // A new bar (first render, or the progress setting turned back on) is drawn at once rather than
    // gliding in from empty at the next tick.
    const fillRef = (node) => {
        refs.fill = node;
        if (node && isOpen) {
            expectedPosition = -1;
            Promise.resolve().then(() => isOpen && tick());
        }
    };
    const elapsedRef = (node) => (refs.elapsed = node);
    const totalRef = (node) => (refs.total = node);

    let tickTimer = 0;
    // Where the bar's glide ends up at the next tick; -1 means snap instead (after a seek, pause or song change).
    let expectedPosition = -1;

    function formatTime(ms) {
        const total = Math.floor(ms / 1000);
        const hours = Math.floor(total / 3600);
        const minutes = Math.floor(total / 60) % 60;
        const seconds = String(total % 60).padStart(2, "0");
        return hours ? `${hours}:${String(minutes).padStart(2, "0")}:${seconds}` : `${minutes}:${seconds}`;
    }

    function paintProgress(position, duration, glideTo, glideMs) {
        host.classList.toggle("fsa-near-end", duration > 0 && duration - position <= UP_NEXT_MS);
        if (refs.elapsed) refs.elapsed.textContent = duration ? formatTime(position) : "-:--";
        if (refs.total) refs.total.textContent = duration ? formatTime(duration) : "-:--";
        if (!refs.fill) return;
        const fraction = duration ? Math.min(Math.max(glideTo / duration, 0), 1) : 0;
        refs.fill.style.transition = glideMs ? `transform ${glideMs}ms linear` : "none";
        refs.fill.style.transform = `translateX(${(fraction - 1) * 100}%)`;
    }

    function stopTick() {
        clearTimeout(tickTimer);
        tickTimer = 0;
    }

    function tick() {
        stopTick();
        if (!isOpen || document.hidden) return;
        const duration = Player.getDuration?.() || 0;
        const position = Math.min(Player.getProgress?.() || 0, duration);
        if (!duration || Player.data?.isPaused !== false) {
            expectedPosition = -1;
            paintProgress(position, duration, position, 0);
            return;
        }
        // Land just past the next whole second so the elapsed time flips on time.
        const untilNextSecond = 1000 - (position % 1000) + 5;
        if (expectedPosition < 0 || Math.abs(position - expectedPosition) > 1500) {
            paintProgress(position, duration, position, 0);
        } else {
            paintProgress(position, duration, position + untilNextSecond, untilNextSecond);
        }
        expectedPosition = position + untilNextSecond;
        tickTimer = setTimeout(tick, untilNextSecond);
    }

    function resync() {
        expectedPosition = -1;
        tick();
        scheduleLyrics();
    }

    function seekTo(position) {
        const duration = Player.getDuration?.() || 0;
        if (!duration) return;
        // Spicetify reads whole numbers as milliseconds; passing a fraction would misread 0 and 1.
        position = Math.round(Math.min(Math.max(position, 0), duration));
        Player.seek(position);
        stopTick();
        expectedPosition = -1;
        paintProgress(position, duration, position, 0);
        // Give the player a moment to report the new position before reading it back.
        tickTimer = setTimeout(() => {
            tick();
            scheduleLyrics();
        }, 400);
    }

    function barFraction(event) {
        const rect = event.currentTarget.getBoundingClientRect();
        if (!rect.width) return null;
        return Math.min(Math.max((event.clientX - rect.left) / rect.width, 0), 1);
    }

    function seekFromBar(event) {
        const fraction = barFraction(event);
        if (fraction !== null) seekTo(fraction * (Player.getDuration?.() || 0));
    }

    const tipRef = (node) => (refs.tip = node);

    function showBarTime(event) {
        const fraction = barFraction(event);
        const duration = Player.getDuration?.() || 0;
        if (!refs.tip || fraction === null || !duration) return;
        refs.tip.textContent = formatTime(fraction * duration);
        refs.tip.style.left = `${fraction * 100}%`;
    }

    // ---------- Clock (wakes at the turn of each minute) ----------

    let clockTimer = 0;
    const clockRef = (node) => {
        refs.clock = node;
        updateClock();
    };

    function formatClock(date, format) {
        const time = date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", hour12: format.startsWith("12h") });
        if (!format.endsWith("Date")) return time;
        return `${date.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })} · ${time}`;
    }

    function updateClock() {
        clearTimeout(clockTimer);
        clockTimer = 0;
        if (!isOpen || document.hidden || settings.clock === "off" || !refs.clock) return;
        const now = new Date();
        refs.clock.textContent = formatClock(now, settings.clock);
        clockTimer = setTimeout(updateClock, 60000 - (now.getSeconds() * 1000 + now.getMilliseconds()) + 20);
    }

    // ---------- Player actions ----------

    let liked = false;
    let pendingVolume = null;

    function readLiked() {
        try {
            return !!Player.getHeart?.();
        } catch {
            return false;
        }
    }

    // The player's own flag can lag behind the library, so ask the library too.
    async function refreshLiked(track) {
        liked = readLiked();
        try {
            const result = await Spicetify.Platform?.LibraryAPI?.contains?.(track.uri);
            const value = Array.isArray(result) ? result[0] : result;
            if (typeof value === "boolean" && currentTrack?.uri === track.uri) {
                liked = value;
                renderAll();
            }
        } catch {}
    }

    function toggleLike() {
        if (!currentTrack?.isTrack) return;
        liked = !liked;
        try {
            Player.setHeart?.(liked);
        } catch {}
        renderAll();
    }

    function setVolume(value) {
        // Shown straight away; Spotify confirms with a volume event.
        pendingVolume = value;
        try {
            Player.setVolume(value);
        } catch {}
        renderAll();
    }

    function toggleMute() {
        const helper = Spicetify.Platform?.PlaybackAPI?.getMuteHelper?.();
        if (helper?.toggleMute) helper.toggleMute();
        else Player.toggleMute?.();
    }

    function toggleSettings(open = !settingsOpen) {
        settingsOpen = open;
        if (open) helpOpen = false;
        applyClasses();
        renderAll();
        if (open) onPointerMove();
        else host.focus({ preventScroll: true });
    }

    function toggleHelp(open = !helpOpen) {
        helpOpen = open;
        if (open) settingsOpen = false;
        applyClasses();
        renderAll();
        host.focus({ preventScroll: true });
    }

    // ---------- Keyboard (while open) ----------

    const SEEK_MS = 10000;
    const VOLUME_STEP = 0.05;

    // For the help list; the keys themselves are handled in keyAction.
    const SHORTCUTS = [
        [["Space"], "Play / pause"],
        [["←", "→"], "Back / forward 10 seconds"],
        [["P", "N"], "Previous / next song"],
        [["↑", "↓"], "Volume"],
        [["M"], "Mute"],
        [["S"], "Shuffle"],
        [["R"], "Repeat"],
        [["H"], "Like"],
        [["L"], "Lyrics"],
        [["V"], "Next layout"],
        [["B"], "Next background"],
        [[","], "Settings"],
        [["?"], "Keyboard shortcuts"],
        [["F", "Esc"], "Close"],
    ];

    let toastTimer = 0;

    function showToast(text) {
        toast.textContent = text;
        toast.classList.add("fsa-toast-on");
        clearTimeout(toastTimer);
        toastTimer = setTimeout(hideToast, 1400);
    }

    function hideToast() {
        clearTimeout(toastTimer);
        toastTimer = 0;
        toast.classList.remove("fsa-toast-on");
    }

    function seekBy(ms) {
        const duration = Player.getDuration?.() || 0;
        if (!duration || Player.data?.restrictions?.canSeek === false) return;
        const position = Math.min(Math.max((Player.getProgress?.() || 0) + ms, 0), duration);
        seekTo(position);
        showToast(`${formatTime(position)} / ${formatTime(duration)}`);
    }

    function changeVolume(step) {
        const current = pendingVolume ?? Player.getVolume?.() ?? 1;
        // Rounded in whole steps (dividing, not multiplying, so 55% is exactly 0.55).
        const steps = 1 / VOLUME_STEP;
        const value = Math.min(Math.max(Math.round((current + step) * steps) / steps, 0), 1);
        setVolume(value);
        showToast(`Volume ${Math.round(value * 100)}%`);
    }

    function cycleSetting(name, title) {
        const choices = CHOICES[name];
        const [value, label] = choices[(choices.findIndex(([choice]) => choice === settings[name]) + 1) % choices.length];
        updateSettings({ [name]: value });
        showToast(`${title}: ${label}`);
    }

    function keyAction(key) {
        const data = Player.data;
        const restrictions = data?.restrictions ?? {};
        switch (key) {
            case "ArrowLeft":
                return () => seekBy(-SEEK_MS);
            case "ArrowRight":
                return () => seekBy(SEEK_MS);
            case "ArrowUp":
                return () => changeVolume(VOLUME_STEP);
            case "ArrowDown":
                return () => changeVolume(-VOLUME_STEP);
            case "n":
                return () => Player.next();
            case "p":
                return () => Player.back();
            case "m":
                return () => {
                    const muted = (pendingVolume ?? Player.getVolume?.() ?? 1) === 0;
                    toggleMute();
                    showToast(muted ? "Unmuted" : "Muted");
                };
            case "s":
                return () => {
                    if (restrictions.canToggleShuffle === false) return showToast("Shuffle isn't available here");
                    Player.toggleShuffle();
                    showToast(data?.shuffle ? "Shuffle off" : "Shuffle on");
                };
            case "r":
                return () => {
                    if (restrictions.canToggleRepeatContext === false && restrictions.canToggleRepeatTrack === false) {
                        return showToast("Repeat isn't available here");
                    }
                    Player.toggleRepeat();
                    showToast(["Repeat off", "Repeat all", "Repeat one"][((Number(data?.repeat) || 0) + 1) % 3]);
                };
            case "h":
                return () => {
                    if (!currentTrack?.isTrack) return showToast("Only songs can be liked");
                    toggleLike();
                    showToast(liked ? "Added to Liked Songs" : "Removed from Liked Songs");
                };
            case "l":
                return () => {
                    // Noted first, so a "no lyrics" note for the song (possibly straight away) replaces it.
                    showToast(settings.lyrics ? "Lyrics off" : "Lyrics on");
                    updateSettings({ lyrics: !settings.lyrics });
                };
            case "v":
                return () => cycleSetting("layout", "Layout");
            case "b":
                return () => cycleSetting("background", "Background");
            case ",":
                return () => toggleSettings();
            case "?":
                return () => toggleHelp();
        }
        return null;
    }

    // Keys that belong to whatever has focus: typing in a text box, or arrows on a slider or list.
    function focusOwnsKey(target, key) {
        if (target?.closest?.("textarea, [contenteditable='true'], input:not([type=range]):not([type=checkbox])")) return true;
        return /^(Arrow|Page|Home|End)/.test(key) && !!target?.closest?.("select, input[type=range]");
    }

    // ---------- React: details, controls, chrome, settings ----------

    // Clicking mustn't leave focus on a button, or Space would press it as well as toggling playback.
    const keepFocus = (event) => event.preventDefault();

    function ControlButton({ component = ReactComponent.ButtonTertiary, label, icon, ...props }) {
        const button = h(component, { iconOnly: icon, "aria-label": label, onMouseDown: keepFocus, ...props });
        return ReactComponent.TooltipWrapper ? h(ReactComponent.TooltipWrapper, { label }, button) : button;
    }

    function Link({ uri, children }) {
        const path = uriToPath(uri);
        if (!path) return children;
        const onClick = (event) => {
            event.preventDefault();
            openPage(path);
        };
        return h("a", { className: "fsa-link", href: path, onMouseDown: keepFocus, onClick }, children);
    }

    function Controls(view) {
        const extra = view.settings.extraControls;
        const shuffleLabel = view.shuffle
            ? spotifyText("playback-control.disable-shuffle", "Disable shuffle")
            : spotifyText("playback-control.enable-shuffle", "Enable shuffle");
        const repeatLabel = [
            spotifyText("playback-control.enable-repeat", "Enable repeat"),
            spotifyText("playback-control.enable-repeat-one", "Enable repeat one"),
            spotifyText("playback-control.disable-repeat", "Disable repeat"),
        ][view.repeat] ?? "Repeat";
        return h(
            "div",
            { className: "fsa-controls" },
            h(
                "div",
                { className: "fsa-controls-side fsa-controls-start" },
                extra &&
                    view.canLike &&
                    h(ControlButton, {
                        label: view.liked ? "Remove from Liked Songs" : "Add to Liked Songs",
                        icon: view.liked ? Icon.liked : Icon.like,
                        size: "medium",
                        className: view.liked ? "fsa-liked" : undefined,
                        onClick: toggleLike,
                    }),
                extra &&
                    h(ControlButton, {
                        label: shuffleLabel,
                        icon: view.smartShuffle ? Icon.smartShuffle : Icon.shuffle,
                        size: "medium",
                        className: view.shuffle ? "fsa-active" : undefined,
                        disabled: !view.canShuffle,
                        onClick: () => Player.toggleShuffle(),
                    })
            ),
            h(
                "div",
                { className: "fsa-controls-main" },
                h(ControlButton, {
                    label: spotifyText("playback-control.skip-back", "Previous"),
                    icon: Icon.back,
                    size: "large",
                    disabled: !view.canBack,
                    onClick: () => Player.back(),
                }),
                h(ControlButton, {
                    component: ReactComponent.ButtonPrimary,
                    label: view.isPaused
                        ? spotifyText("playback-control.play", "Play")
                        : spotifyText("playback-control.pause", "Pause"),
                    icon: view.isPaused ? Icon.play : Icon.pause,
                    size: "large",
                    colorSet: "invertedLight",
                    disabled: !view.canPlay,
                    onClick: () => Player.togglePlay(),
                }),
                h(ControlButton, {
                    label: spotifyText("playback-control.skip-forward", "Next"),
                    icon: Icon.next,
                    size: "large",
                    disabled: !view.canNext,
                    onClick: () => Player.next(),
                })
            ),
            h(
                "div",
                { className: "fsa-controls-side fsa-controls-end" },
                extra &&
                    h(ControlButton, {
                        label: repeatLabel,
                        icon: view.repeat === 2 ? Icon.repeatOne : Icon.repeat,
                        size: "medium",
                        className: view.repeat ? "fsa-active" : undefined,
                        disabled: !view.canRepeat,
                        onClick: () => Player.toggleRepeat(),
                    }),
                extra &&
                    h(ControlButton, {
                        label: view.settings.lyrics ? "Hide lyrics" : "Show lyrics",
                        icon: Icon.lyrics,
                        size: "medium",
                        className: view.settings.lyrics ? "fsa-active" : undefined,
                        onClick: () => updateSettings({ lyrics: !view.settings.lyrics }),
                    })
            )
        );
    }

    // Songs only: an episode's "artist" is its show, which an artist icon would misdescribe.
    function InfoIcon({ name }) {
        return h("span", { className: "fsa-info-icon", "aria-hidden": "true", dangerouslySetInnerHTML: { __html: svg(ICONS[name]) } });
    }

    function Details(view) {
        const { track, settings: s } = view;
        const icon = (name) => s.infoIcons !== "off" && track?.isTrack && h(InfoIcon, { name });
        // Each artist links to their page; names read from metadata alone stay plain.
        const artists = track?.artistLinks?.length
            ? track.artistLinks.flatMap((artist, i) => [i > 0 && ", ", h(Link, { key: i, uri: artist.uri }, artist.name)])
            : track?.artists;
        return h(
            React.Fragment,
            null,
            h(
                "div",
                { className: "fsa-title" },
                // A song's title opens its album, as in Spotify's own player; an episode opens itself.
                track && icon("song"),
                track ? h(Link, { uri: track.isTrack ? track.albumUri : track.uri }, track.title) : "Nothing playing"
            ),
            // Icons only beside text, so an empty line still collapses.
            h("div", { className: "fsa-artists" }, artists?.length ? h(React.Fragment, null, icon("artist"), artists) : null),
            h(
                "div",
                { className: "fsa-album" },
                s.album && track?.album
                    ? h(React.Fragment, null, icon("album"), h(Link, { uri: track.albumUri }, track.album))
                    : null
            ),
            s.progress &&
                h(
                    "div",
                    { className: "fsa-progress" },
                    h("span", { className: "fsa-time", ref: elapsedRef }),
                    h(
                        "div",
                        {
                            className: view.canSeek ? "fsa-bar fsa-seekable" : "fsa-bar",
                            onClick: view.canSeek ? seekFromBar : undefined,
                            onMouseMove: view.canSeek ? showBarTime : undefined,
                        },
                        h("div", { className: "fsa-track" }, h("div", { className: "fsa-fill", ref: fillRef })),
                        view.canSeek && h("div", { className: "fsa-bar-tip", ref: tipRef })
                    ),
                    h("span", { className: "fsa-time fsa-time-total", ref: totalRef })
                ),
            h(Controls, view)
        );
    }

    function Volume({ volume }) {
        const percent = Math.round(Math.min(Math.max(volume, 0), 1) * 100);
        const icon = !percent ? Icon.volumeMuted : percent < 34 ? Icon.volumeLow : percent < 67 ? Icon.volumeMid : Icon.volumeHigh;
        return h(
            "div",
            { className: "fsa-volume" },
            h("span", { className: "fsa-volume-value" }, `${percent}%`),
            h("input", {
                className: "fsa-volume-slider",
                type: "range",
                min: 0,
                max: 100,
                step: 1,
                value: percent,
                "aria-label": "Volume",
                onChange: (event) => setVolume(event.target.valueAsNumber / 100),
            }),
            h(ControlButton, { label: percent ? "Mute" : "Unmute", icon, size: "medium", onClick: toggleMute })
        );
    }

    // `unavailable`: choices shown but greyed out, e.g. a source that isn't installed.
    function SettingSelect({ name, label, unavailable = [] }) {
        return h(
            "select",
            {
                className: "fsa-select",
                "aria-label": label,
                value: settings[name],
                onChange: (event) => updateSettings({ [name]: event.target.value }),
            },
            CHOICES[name].map(([value, label]) =>
                h("option", { key: value, value, disabled: unavailable.includes(value) }, label)
            )
        );
    }

    function SettingSlider({ name }) {
        const { label, min, max, step, format = (v) => `${Math.round(v * 100)}%` } = SLIDERS[name];
        return h(
            "div",
            { className: "fsa-slider" },
            h("input", {
                className: "fsa-range",
                type: "range",
                min,
                max,
                step,
                value: settings[name],
                "aria-label": label,
                onChange: (event) => updateSettings({ [name]: clampSlider(name, event.target.valueAsNumber) }),
                // Double-click puts a slider back to the standard look.
                onDoubleClick: () => updateSettings({ [name]: DEFAULTS[name] }),
            }),
            h("span", { className: "fsa-slider-value" }, format(settings[name]))
        );
    }

    function resetBackground() {
        updateSettings(Object.fromEntries(["bgMotion", ...Object.keys(SLIDERS)].map((key) => [key, DEFAULTS[key]])));
    }

    function SettingToggle({ name, label }) {
        const Toggle = ReactComponent.Toggle;
        const onSelected = (value) => updateSettings({ [name]: value });
        return Toggle
            ? h(Toggle, { id: `fsa-setting-${name}`, value: settings[name], onSelected, ariaLabel: label })
            : h("input", {
                  type: "checkbox",
                  checked: settings[name],
                  "aria-label": label,
                  onChange: (event) => onSelected(event.target.checked),
              });
    }

    function HelpPanel() {
        return h(
            "div",
            { className: "fsa-help", role: "dialog", "aria-label": "Keyboard shortcuts" },
            h(
                "div",
                { className: "fsa-settings-header" },
                h("span", null, "Keyboard shortcuts"),
                h(ControlButton, { label: "Close", icon: Icon.collapse, size: "small", onClick: () => toggleHelp(false) })
            ),
            h(
                "dl",
                { className: "fsa-help-list" },
                SHORTCUTS.map(([keys, description]) =>
                    h(
                        React.Fragment,
                        { key: description },
                        h(
                            "dt",
                            null,
                            keys.map((k) => h("kbd", { key: k }, k))
                        ),
                        h("dd", null, description)
                    )
                )
            )
        );
    }

    function SettingsPanel() {
        const row = (label, control) => h("div", { className: "fsa-settings-row", key: label }, h("span", null, label), control);
        const toggle = (name, label) => row(label, h(SettingToggle, { name, label }));
        const select = (name, label) => row(label, h(SettingSelect, { name, label }));
        const slider = (name) => row(SLIDERS[name].label, h(SettingSlider, { name }));
        const section = (title, rows) => {
            const open = !!openSections[title];
            return h(
                React.Fragment,
                { key: title },
                h(
                    "button",
                    {
                        className: "fsa-settings-section",
                        "aria-expanded": open,
                        onMouseDown: keepFocus,
                        onClick: () => toggleSection(title),
                    },
                    h("span", null, title),
                    h("span", { className: "fsa-chevron", "aria-hidden": true })
                ),
                open && rows
            );
        };
        const art = settings.background === "art";
        return h(
            "div",
            { className: "fsa-settings", role: "dialog", "aria-label": "Full Screen Plus settings" },
            h(
                "div",
                { className: "fsa-settings-header" },
                h("span", null, "Full Screen Plus"),
                h(ControlButton, { label: "Close settings", icon: Icon.collapse, size: "small", onClick: () => toggleSettings(false) })
            ),
            section("Look", [
                select("layout", "Layout"),
                select("background", "Background"),
                art && select("bgMotion", "Motion"),
                art && settings.bgMotion !== "still" && slider("bgSpeed"),
                art && slider("bgZoom"),
                art && slider("bgBlur"),
                art && slider("bgColor"),
                (art || settings.background === "artist") && slider("bgDim"),
                (art || settings.background === "artist") &&
                    h(
                        "div",
                        { className: "fsa-settings-row", key: "reset" },
                        h("span"),
                        h(
                            "button",
                            { className: "fsa-button fsa-reset", onMouseDown: keepFocus, onClick: resetBackground },
                            "Reset background"
                        )
                    ),
            ]),
            section("Show", [
                toggle("lyrics", "Lyrics"),
                settings.lyrics &&
                    row(
                        "Lyrics from",
                        h(SettingSelect, {
                            name: "lyricsSource",
                            label: "Lyrics from",
                            unavailable: lyricsPlusInstalled() ? [] : ["lyricsPlus"],
                        })
                    ),
                settings.lyrics &&
                    !lyricsPlusInstalled() &&
                    h(
                        "p",
                        { className: "fsa-settings-note", key: "lyrics-plus-note" },
                        "For Lyrics Plus, turn the app on: spicetify config custom_apps lyrics-plus"
                    ),
                select("clock", "Clock"),
                select("context", "Playing from"),
                select("upNext", "Up next"),
                toggle("album", "Album name"),
                select("infoIcons", "Icons by the song, artist and album"),
                toggle("progress", "Progress bar"),
                toggle("extraControls", "Like, shuffle, repeat and lyrics buttons"),
                toggle("volume", "Volume slider"),
            ]),
            section("Behaviour", [
                toggle("idle", "Hide controls when the mouse is still"),
                toggle("fullscreen", "Fill the screen (off: fill the Spotify window)"),
                h(
                    "div",
                    { className: "fsa-settings-row", key: "shortcuts" },
                    h("span", null, "Keyboard shortcuts"),
                    h("button", { className: "fsa-button", onMouseDown: keepFocus, onClick: () => toggleHelp(true) }, "Show (?)")
                ),
            ])
        );
    }

    function Chrome(view) {
        const s = view.settings;
        return h(
            React.Fragment,
            null,
            s.context !== "off" &&
                view.context &&
                h(
                    "div",
                    { className: s.context === "mouse" ? "fsa-context fsa-on-hover" : "fsa-context" },
                    h("div", { className: "fsa-context-label" }, view.context.label),
                    h("div", { className: "fsa-context-name" }, h(Link, { uri: view.context.uri }, view.context.name))
                ),
            s.clock !== "off" && h("div", { className: "fsa-clock", ref: clockRef }),
            s.upNext !== "off" &&
                view.next &&
                h(
                    "div",
                    {
                        className: {
                            always: "fsa-upnext fsa-upnext-always",
                            mouse: "fsa-upnext fsa-upnext-always fsa-on-hover",
                        }[s.upNext] ?? "fsa-upnext",
                    },
                    view.next.image && h("img", { className: "fsa-upnext-img", src: view.next.image, alt: "" }),
                    h(
                        "div",
                        { className: "fsa-upnext-text" },
                        h("div", { className: "fsa-upnext-label" }, "Up next"),
                        h(
                            "div",
                            { className: "fsa-upnext-title" },
                            view.next.artists ? `${view.next.title} • ${view.next.artists}` : view.next.title
                        )
                    )
                ),
            s.volume && h(Volume, view),
            h(
                "div",
                { className: "fsa-corner" },
                h(ControlButton, {
                    label: "Settings",
                    icon: Icon.settings,
                    size: "medium",
                    className: settingsOpen ? "fsa-active" : undefined,
                    onClick: () => toggleSettings(),
                }),
                h(ControlButton, { label: LABEL_CLOSE, icon: Icon.collapse, size: "medium", onClick: () => close() })
            ),
            settingsOpen && h(SettingsPanel, view),
            helpOpen && h(HelpPanel)
        );
    }

    const createRoot = (node) => {
        const root = ReactDOM.createRoot?.(node);
        return (element) => (root ? root.render(element) : ReactDOM.render(element, node));
    };
    const renderPanel = createRoot(panel);
    const renderChrome = createRoot(chrome);
    let currentTrack = null;

    function viewState() {
        const data = Player.data;
        const restrictions = data?.restrictions ?? {};
        const can = (key) => !!data?.item && restrictions[key] !== false;
        return {
            settings,
            track: currentTrack,
            isPaused: data?.isPaused !== false,
            // Same rule as Spotify's own back button: it restarts the track when it can't go back.
            canBack: can("canSkipPrevious") || can("canSeek"),
            canNext: can("canSkipNext"),
            canPlay: data?.isPaused === false ? can("canPause") : can("canResume"),
            canSeek: can("canSeek"),
            canShuffle: can("canToggleShuffle"),
            canRepeat: can("canToggleRepeatContext") || can("canToggleRepeatTrack"),
            canLike: !!currentTrack?.isTrack,
            shuffle: !!data?.shuffle,
            smartShuffle: !!data?.smartShuffle,
            repeat: Number(data?.repeat) || 0,
            liked,
            volume: pendingVolume ?? Player.getVolume?.() ?? 1,
            context: readContext(data),
            next: settings.upNext === "off" ? null : readNext(),
        };
    }

    function renderAll() {
        const view = viewState();
        renderPanel(h(Details, view));
        renderChrome(h(Chrome, view));
    }

    // ---------- Idle: hide cursor and controls ----------

    let idleTimer = 0;
    let lastMove = 0;

    // Runs on every pointer move, so it only records the time; the timer works out the rest.
    function onPointerMove() {
        lastMove = performance.now();
        if (host.classList.contains("fsa-still")) host.classList.remove("fsa-still", "fsa-idle");
        if (!idleTimer) idleTimer = setTimeout(checkIdle, IDLE_MS);
    }

    function checkIdle() {
        idleTimer = 0;
        if (!isOpen) return;
        const remaining = lastMove + IDLE_MS - performance.now();
        if (remaining > 0) {
            idleTimer = setTimeout(checkIdle, remaining);
            return;
        }
        // Don't hide anything that's in use or under a resting pointer.
        const busy =
            settingsOpen ||
            helpOpen ||
            host.querySelector(
                ".fsa-controls:hover, .fsa-corner:hover, .fsa-volume:hover, .fsa-settings:hover, .fsa-on-hover:hover"
            );
        if (busy) {
            idleTimer = setTimeout(checkIdle, IDLE_MS);
            return;
        }
        // "Still" hides what's set to show only when the mouse moves; "idle" also hides the controls and cursor.
        host.classList.add("fsa-still");
        if (settings.idle) host.classList.add("fsa-idle");
    }

    host.addEventListener("pointermove", onPointerMove);
    host.addEventListener("pointerdown", onPointerMove);

    // ---------- Mouse wheel: volume ----------

    // A mouse notch (100) is one step; trackpads report smaller amounts, which add up.
    const WHEEL_STEP = 100;
    let wheelTotal = 0;

    function onWheel(event) {
        // Ctrl+wheel is zoom (and Lyrics Plus's text size); panels and scrolling lyrics scroll.
        if (event.ctrlKey || event.target.closest?.(".fsa-settings, .fsa-help, .fsa-lyrics-plus, .fsa-unsynced")) return;
        const delta = event.deltaMode === 1 ? event.deltaY * 40 : event.deltaY;
        if (Math.sign(delta) !== Math.sign(wheelTotal)) wheelTotal = 0;
        wheelTotal += delta;
        while (Math.abs(wheelTotal) >= WHEEL_STEP) {
            const direction = Math.sign(wheelTotal);
            wheelTotal -= direction * WHEEL_STEP;
            changeVolume(-direction * VOLUME_STEP);
        }
    }

    host.addEventListener("wheel", onWheel, { passive: true });

    // ---------- Open / close ----------

    let isOpen = false;
    let ownsFullscreen = false;
    let unsubscribe = [];
    let leavingTo = null;

    function openPage(path) {
        leavingTo = path;
        close();
    }

    // Spotify's emitters return an unsubscribe function from addListener; fall back to removeListener.
    function listen(emitter, name, callback) {
        if (!emitter?.addListener) return () => {};
        const off = emitter.addListener(name, callback);
        return typeof off === "function" ? off : () => emitter.removeListener?.(name, callback);
    }

    function onSongChange() {
        currentTrack = readTrack();
        if (currentTrack) refreshLiked(currentTrack);
        if (lyrics?.uri !== currentTrack?.uri) {
            lyrics = null;
            renderLyrics();
        }
        applyClasses();
        renderAll();
        resync();
        showArt(currentTrack);
        loadExtras();
        noteMissingLyrics();
    }

    function onPlayPause() {
        renderAll();
        resync();
    }

    // Any change to the player's state (restrictions settling after a skip, shuffle, a seek...).
    // Spotify's own buttons re-render on these; without it, controls disabled mid-skip stayed disabled.
    function onPlayerUpdate() {
        renderAll();
        tick();
        scheduleLyrics();
    }

    function onVolume(event) {
        const volume = event?.data?.volume ?? event?.volume;
        pendingVolume = typeof volume === "number" ? volume : null;
        renderAll();
    }

    // Plain keys only: Spotify's own shortcuts use Ctrl or Alt (and Shift+C), and Space stays its play/pause.
    function onKeyDown(event) {
        if (event.defaultPrevented) return;
        // Leave keys to a modal opened over the overlay.
        if (document.querySelector("generic-modal, dialog[open]")) return;
        const consume = () => {
            event.preventDefault();
            event.stopPropagation();
        };
        if (event.key === "Escape") {
            consume();
            if (helpOpen) toggleHelp(false);
            else if (settingsOpen) toggleSettings(false);
            else close();
            return;
        }
        if (event.ctrlKey || event.metaKey || event.altKey || focusOwnsKey(event.target, event.key)) return;
        const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
        // "?" needs Shift on most keyboards; any other Shift combination is left alone.
        if (event.shiftKey && key !== "?") return;
        const action = keyAction(key);
        if (!action) return;
        consume();
        // Holding a key repeats seeking and volume, not toggles.
        if (event.repeat && !key.startsWith("Arrow")) return;
        action();
    }

    // In browser full screen the browser takes Esc itself, so closing follows full screen too.
    function onFullscreenChange() {
        if (ownsFullscreen && !document.fullscreenElement) {
            ownsFullscreen = false;
            close();
        }
    }

    function onVisibilityChange() {
        host.classList.toggle("fsa-paused", document.hidden);
        if (document.hidden) {
            stopTick();
            clearTimeout(lyricsTimer);
            lyricsTimer = 0;
            clearTimeout(clockTimer);
            clockTimer = 0;
        } else {
            resync();
            updateClock();
        }
    }

    function enterFullscreen() {
        const root = document.documentElement;
        if (document.fullscreenElement === root || !root.requestFullscreen) return;
        const request = () =>
            root.requestFullscreen().then(
                () => {
                    if (isOpen) ownsFullscreen = true;
                    else document.exitFullscreen().catch(() => {});
                },
                // Refused (e.g. no user gesture): the overlay still works inside the window.
                () => {}
            );
        // Only the page root can show the overlay, so swap out anything else that's full screen (e.g. a video).
        if (document.fullscreenElement) document.exitFullscreen().then(() => isOpen && request(), () => {});
        else request();
    }

    function leaveFullscreen() {
        const owned = ownsFullscreen;
        // Cleared first, so leaving full screen on purpose doesn't also close the overlay.
        ownsFullscreen = false;
        if (owned && document.fullscreenElement) document.exitFullscreen().catch(() => {});
    }

    function open() {
        if (isOpen) return;
        isOpen = true;
        settingsOpen = false;
        helpOpen = false;
        pendingVolume = null;
        notedMissing = "";
        host.classList.remove("fsa-still", "fsa-idle", "fsa-paused");
        host.classList.add("fsa-open");
        applySpeed();
        toggleButton.icon = svg(ICONS.collapse, 16);
        toggleButton.label = LABEL_CLOSE;

        Player.addEventListener("songchange", onSongChange);
        Player.addEventListener("onplaypause", onPlayPause);
        unsubscribe = [
            listen(Player.origin?._events, "update", onPlayerUpdate),
            listen(Player.origin?._events, "queue_update", renderAll),
            listen(Spicetify.Platform?.PlaybackAPI?.getEvents?.(), "volume", onVolume),
        ];
        document.addEventListener("keydown", onKeyDown, true);
        document.addEventListener("fullscreenchange", onFullscreenChange);
        document.addEventListener("visibilitychange", onVisibilityChange);

        // Take focus off the playbar button underneath, so Space still means play/pause.
        host.focus({ preventScroll: true });
        if (settings.fullscreen) enterFullscreen();
        syncLyricsPlus();
        onSongChange();
        onPointerMove();
        updateClock();
    }

    function close() {
        if (!isOpen) return;
        isOpen = false;
        settingsOpen = false;
        helpOpen = false;
        hideToast();
        host.classList.remove("fsa-open", "fsa-still", "fsa-idle", "fsa-paused", "fsa-settings-open");
        toggleButton.icon = svg(ICONS.expand, 16);
        toggleButton.label = LABEL_OPEN;

        Player.removeEventListener("songchange", onSongChange);
        Player.removeEventListener("onplaypause", onPlayPause);
        for (const off of unsubscribe) off();
        unsubscribe = [];
        document.removeEventListener("keydown", onKeyDown, true);
        document.removeEventListener("fullscreenchange", onFullscreenChange);
        document.removeEventListener("visibilitychange", onVisibilityChange);
        stopTick();
        clearTimeout(lyricsTimer);
        lyricsTimer = 0;
        clearTimeout(idleTimer);
        idleTimer = 0;
        clearTimeout(clockTimer);
        clockTimer = 0;
        // Takes Spotify off the Lyrics Plus page, or straight on to `leavingTo` from it.
        syncLyricsPlus();
        if (leavingTo) {
            Spicetify.Platform?.History?.push(leavingTo);
            leavingTo = null;
        }
        renderAll();
        leaveFullscreen();
    }

    function toggle() {
        if (isOpen) close();
        else open();
    }

    // ---------- Mount ----------

    document.head.appendChild(style);
    document.body.appendChild(host);
    applyClasses();
    renderAll();

    const toggleButton = new Spicetify.Playbar.Button(LABEL_OPEN, svg(ICONS.expand, 16), toggle);
    Spicetify.Mousetrap.bind(SHORTCUT, () => {
        toggle();
        return false;
    });
})();
