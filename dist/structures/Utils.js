"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TrackSourceTypes = exports.SeverityTypes = exports.TrackEndReasonTypes = exports.StateTypes = exports.LoadTypes = exports.Structure = exports.AutoPlayUtils = exports.TrackUtils = void 0;
const tslib_1 = require("tslib");
const Manager_1 = require("./Manager");
const axios_1 = tslib_1.__importDefault(require("axios"));
const jsdom_1 = require("jsdom");
const crypto_1 = tslib_1.__importDefault(require("crypto"));
/** @hidden */
const SIZES = ["0", "1", "2", "3", "default", "mqdefault", "hqdefault", "maxresdefault"];
class TrackUtils {
    static trackPartial = null;
    static manager;
    /**
     * Initializes the TrackUtils class with the given manager.
     * @param manager The manager instance to use.
     * @hidden
     */
    static init(manager) {
        // Set the manager instance for TrackUtils.
        this.manager = manager;
    }
    /**
     * Sets the partial properties for the Track class. If a Track has some of its properties removed by the partial,
     * it will be considered a partial Track.
     * @param {TrackPartial} partial The array of string property names to remove from the Track class.
     */
    static setTrackPartial(partial) {
        if (!Array.isArray(partial) || !partial.every((str) => typeof str === "string"))
            throw new Error("Provided partial is not an array or not a string array.");
        const defaultProperties = [
            Manager_1.TrackPartial.Track,
            Manager_1.TrackPartial.Title,
            Manager_1.TrackPartial.Identifier,
            Manager_1.TrackPartial.Author,
            Manager_1.TrackPartial.Duration,
            Manager_1.TrackPartial.Isrc,
            Manager_1.TrackPartial.IsSeekable,
            Manager_1.TrackPartial.IsStream,
            Manager_1.TrackPartial.Uri,
            Manager_1.TrackPartial.ArtworkUrl,
            Manager_1.TrackPartial.SourceName,
            Manager_1.TrackPartial.ThumbNail,
            Manager_1.TrackPartial.Requester,
            Manager_1.TrackPartial.PluginInfo,
            Manager_1.TrackPartial.CustomData,
        ];
        /** The array of property names that will be removed from the Track class */
        this.trackPartial = Array.from(new Set([...defaultProperties, ...partial]));
        /** Make sure that the "track" property is always included */
        if (!this.trackPartial.includes(Manager_1.TrackPartial.Track))
            this.trackPartial.unshift(Manager_1.TrackPartial.Track);
    }
    /**
     * Checks if the provided argument is a valid Track.
     * If provided an array then every element will be checked.
     * @param trackOrTracks The Track or array of Tracks to check.
     * @returns {boolean} Whether the provided argument is a valid Track.
     */
    static validate(trackOrTracks) {
        if (typeof trackOrTracks !== "object" || trackOrTracks === null) {
            return false;
        }
        const isValidTrack = (track) => {
            if (typeof track !== "object" || track === null) {
                return false;
            }
            const t = track;
            return (typeof t.track === "string" && typeof t.title === "string" && typeof t.identifier === "string" && typeof t.isrc === "string" && typeof t.uri === "string");
        };
        if (Array.isArray(trackOrTracks)) {
            return trackOrTracks.every(isValidTrack);
        }
        return isValidTrack(trackOrTracks);
    }
    /**
     * Builds a Track from the raw data from Lavalink and a optional requester.
     * @param data The raw data from Lavalink to build the Track from.
     * @param requester The user who requested the track, if any.
     * @returns The built Track.
     */
    static build(data, requester) {
        if (typeof data === "undefined")
            throw new RangeError('Argument "data" must be present.');
        try {
            const sourceNameMap = {
                applemusic: "AppleMusic",
                bandcamp: "Bandcamp",
                deezer: "Deezer",
                jiosaavn: "Jiosaavn",
                soundcloud: "SoundCloud",
                spotify: "Spotify",
                tidal: "Tidal",
                qobuz: "Qobuz",
                youtube: "YouTube",
                vkmusic: "VKMusic",
            };
            const track = {
                track: data.encoded,
                title: data.info.title,
                identifier: data.info.identifier,
                author: data.info.author,
                duration: data.info.length,
                isrc: data.info?.isrc,
                isSeekable: data.info.isSeekable,
                isStream: data.info.isStream,
                uri: data.info.uri,
                artworkUrl: data.info?.artworkUrl,
                sourceName: sourceNameMap[data.info?.sourceName?.toLowerCase() ?? ""] ?? data.info?.sourceName,
                thumbnail: data.info.uri.includes("youtube") ? `https://img.youtube.com/vi/${data.info.identifier}/default.jpg` : null,
                displayThumbnail(size = "default") {
                    const finalSize = SIZES.find((s) => s === size) ?? "default";
                    return this.uri.includes("youtube") ? `https://img.youtube.com/vi/${data.info.identifier}/${finalSize}.jpg` : null;
                },
                requester: requester,
                pluginInfo: data.pluginInfo,
                customData: {},
            };
            track.displayThumbnail = track.displayThumbnail.bind(track);
            if (this.trackPartial) {
                for (const key of Object.keys(track)) {
                    if (this.trackPartial.includes(key))
                        continue;
                    delete track[key];
                }
            }
            return track;
        }
        catch (error) {
            throw new RangeError(`Argument "data" is not a valid track: ${error.message}`);
        }
    }
}
exports.TrackUtils = TrackUtils;
class AutoPlayUtils {
    static manager;
    /**
     * Initializes the AutoPlayUtils class with the given manager.
     * @param manager The manager instance to use.
     * @hidden
     */
    static init(manager) {
        if (!manager)
            throw new Error('AutoPlayUtils.init() requires a valid Manager instance.');
        this.manager = manager;
    }
    /**
     * Gets recommended tracks for the given track.
     * @param track The track to get recommended tracks for.
     * @returns An array of recommended tracks.
     */
    static async getRecommendedTracks(track) {
        const node = this.manager.useableNode;
        if (!node) {
            throw new Error('No available nodes.');
        }
        const apiKey = this.manager.options.lastFmApiKey;
        const enabledSources = node.info.sourceManagers;
        const autoPlaySearchPlatforms = this.manager.options.autoPlaySearchPlatforms;
        // Iterate over autoplay platforms in order of priority
        for (const platform of autoPlaySearchPlatforms) {
            if (enabledSources.includes(platform)) {
                const recommendedTracks = await this.getRecommendedTracksFromSource(track, platform);
                // If tracks are found, return them immediately
                if (recommendedTracks.length > 0) {
                    return recommendedTracks;
                }
            }
        }
        // Check if Last.fm API is available
        if (apiKey) {
            return await this.getRecommendedTracksFromLastFm(track, apiKey);
        }
        return [];
    }
    /**
     * Gets recommended tracks from Last.fm for the given track.
     * @param track The track to get recommended tracks for.
     * @param apiKey The API key for Last.fm.
     * @returns An array of recommended tracks.
     */
    static async getRecommendedTracksFromLastFm(track, apiKey) {
        let { author: artist } = track;
        const { title } = track;
        if (!artist || !title) {
            if (!title) {
                // No title provided, search for the artist's top tracks
                const noTitleUrl = `https://ws.audioscrobbler.com/2.0/?method=artist.getTopTracks&artist=${artist}&autocorrect=1&api_key=${apiKey}&format=json`;
                const response = await axios_1.default.get(noTitleUrl);
                if (response.data.error || !response.data.toptracks?.track?.length) {
                    return [];
                }
                const randomTrack = response.data.toptracks.track[Math.floor(Math.random() * response.data.toptracks.track.length)];
                const res = await this.manager.search({
                    query: `${randomTrack.artist.name} - ${randomTrack.name}`,
                    source: this.manager.options.defaultSearchPlatform,
                }, track.requester);
                if (res.loadType === LoadTypes.Empty || res.loadType === LoadTypes.Error) {
                    return [];
                }
                const filteredTracks = res.tracks.filter((t) => t.uri !== track.uri);
                if (!filteredTracks.length) {
                    return [];
                }
                return filteredTracks;
            }
            if (!artist) {
                // No artist provided, search for the track title
                const noArtistUrl = `https://ws.audioscrobbler.com/2.0/?method=track.search&track=${title}&api_key=${apiKey}&format=json`;
                const response = await axios_1.default.get(noArtistUrl);
                artist = response.data.results.trackmatches?.track?.[0]?.artist;
                if (!artist) {
                    return [];
                }
            }
        }
        // Search for similar tracks to the current track
        const url = `https://ws.audioscrobbler.com/2.0/?method=track.getSimilar&artist=${artist}&track=${title}&limit=10&autocorrect=1&api_key=${apiKey}&format=json`;
        let response;
        try {
            response = await axios_1.default.get(url);
        }
        catch (error) {
            console.error('[AutoPlay] Error fetching similar tracks from Last.fm:', error);
            return [];
        }
        if (response.data.error || !response.data.similartracks?.track?.length) {
            // Retry the request if the first attempt fails
            const retryUrl = `https://ws.audioscrobbler.com/2.0/?method=artist.getTopTracks&artist=${artist}&autocorrect=1&api_key=${apiKey}&format=json`;
            const retryResponse = await axios_1.default.get(retryUrl);
            if (retryResponse.data.error || !retryResponse.data.toptracks?.track?.length) {
                return [];
            }
            const randomTrack = retryResponse.data.toptracks.track[Math.floor(Math.random() * retryResponse.data.toptracks.track.length)];
            const res = await this.manager.search({
                query: `${randomTrack.artist.name} - ${randomTrack.name}`,
                source: this.manager.options.defaultSearchPlatform,
            }, track.requester);
            if (res.loadType === LoadTypes.Empty || res.loadType === LoadTypes.Error) {
                return [];
            }
            const filteredTracks = res.tracks.filter((t) => t.uri !== track.uri);
            if (!filteredTracks.length) {
                return [];
            }
            return filteredTracks;
        }
        const randomTrack = response.data.similartracks.track.sort(() => Math.random() - 0.5).shift();
        if (!randomTrack) {
            return [];
        }
        const res = await this.manager.search({
            query: `${randomTrack.artist.name} - ${randomTrack.name}`,
            source: this.manager.options.defaultSearchPlatform,
        }, track.requester);
        if (res.loadType === LoadTypes.Empty || res.loadType === LoadTypes.Error) {
            return [];
        }
        if (res.loadType === LoadTypes.Playlist)
            res.tracks = res.playlist.tracks;
        if (!res.tracks.length) {
            return [];
        }
        return res.tracks;
    }
    /**
     * Gets recommended tracks from the given source.
     * @param track The track to get recommended tracks for.
     * @param platform The source to get recommended tracks from.
     * @returns An array of recommended tracks.
     */
    static async getRecommendedTracksFromSource(track, platform) {
        switch (platform) {
            case 'spotify':
                {
                    try {
                        if (!track.uri.includes('spotify')) {
                            const res = await this.manager.search({ query: `${track.author} - ${track.title}`, source: Manager_1.SearchPlatform.Spotify }, track.requester);
                            if (res.loadType === LoadTypes.Empty || res.loadType === LoadTypes.Error) {
                                return [];
                            }
                            if (res.loadType === LoadTypes.Playlist) {
                                res.tracks = res.playlist.tracks;
                            }
                            if (!res.tracks.length) {
                                return [];
                            }
                            track = res.tracks[0];
                        }
                        const TOTP_SECRET = new Uint8Array([
                            53, 53, 48, 55, 49, 52, 53, 56, 53, 51, 52, 56, 55, 52, 57, 57, 53, 57, 50, 50, 52,
                            56, 54, 51, 48, 51, 50, 57, 51, 52, 55,
                        ]);
                        const hmac = crypto_1.default.createHmac('sha1', TOTP_SECRET);
                        function generateTotp() {
                            const counter = Math.floor(Date.now() / 30000);
                            const counterBuffer = Buffer.alloc(8);
                            counterBuffer.writeBigInt64BE(BigInt(counter));
                            hmac.update(counterBuffer);
                            const hmacResult = hmac.digest();
                            const offset = hmacResult[hmacResult.length - 1] & 15;
                            const truncatedValue = ((hmacResult[offset] & 127) << 24) |
                                ((hmacResult[offset + 1] & 255) << 16) |
                                ((hmacResult[offset + 2] & 255) << 8) |
                                (hmacResult[offset + 3] & 255);
                            const totp = (truncatedValue % 1000000).toString().padStart(6, '0');
                            return [totp, counter * 30000];
                        }
                        const [totp, timestamp] = generateTotp();
                        const params = {
                            reason: 'transport',
                            productType: 'embed',
                            totp: totp,
                            totpVer: 5,
                            ts: timestamp,
                        };
                        let body;
                        try {
                            const response = await axios_1.default.get('https://open.spotify.com/get_access_token', {
                                params,
                            });
                            body = response.data;
                        }
                        catch (error) {
                            console.error('[AutoPlay] Failed to get spotify access token:', error.response?.status, error.response?.data || error.message);
                            return [];
                        }
                        let json;
                        try {
                            const response = await axios_1.default.get(`https://api.spotify.com/v1/recommendations`, {
                                params: { limit: 10, seed_tracks: track.identifier },
                                headers: {
                                    Authorization: `Bearer ${body.accessToken}`,
                                    'Content-Type': 'application/json',
                                },
                            });
                            json = response.data;
                        }
                        catch (error) {
                            console.error('[AutoPlay] Failed to fetch spotify recommendations:', error.response?.status, error.response?.data || error.message);
                            return [];
                        }
                        if (!json.tracks || !json.tracks.length) {
                            return [];
                        }
                        const recommendedTrackId = json.tracks[Math.floor(Math.random() * json.tracks.length)].id;
                        const res = await this.manager.search({
                            query: `https://open.spotify.com/track/${recommendedTrackId}`,
                            source: Manager_1.SearchPlatform.Spotify,
                        }, track.requester);
                        if (res.loadType === LoadTypes.Empty || res.loadType === LoadTypes.Error) {
                            return [];
                        }
                        if (res.loadType === LoadTypes.Playlist) {
                            res.tracks = res.playlist.tracks;
                        }
                        if (!res.tracks.length) {
                            return [];
                        }
                        return res.tracks;
                    }
                    catch (error) {
                        console.error('[AutoPlay] Unexpected spotify error:', error.message || error);
                        return [];
                    }
                }
                break;
            case 'deezer':
                {
                    if (!track.uri.includes('deezer')) {
                        const res = await this.manager.search({ query: `${track.author} - ${track.title}`, source: Manager_1.SearchPlatform.Deezer }, track.requester);
                        if (res.loadType === LoadTypes.Empty || res.loadType === LoadTypes.Error) {
                            return [];
                        }
                        if (res.loadType === LoadTypes.Playlist) {
                            res.tracks = res.playlist.tracks;
                        }
                        if (!res.tracks.length) {
                            return [];
                        }
                        track = res.tracks[0];
                    }
                    const identifier = `dzrec:${track.identifier}`;
                    const recommendedResult = (await this.manager.useableNode.rest.get(`/v4/loadtracks?identifier=${encodeURIComponent(identifier)}`));
                    if (!recommendedResult) {
                        return [];
                    }
                    let tracks = [];
                    let playlist = null;
                    const requester = track.requester;
                    switch (recommendedResult.loadType) {
                        case LoadTypes.Search:
                            tracks = recommendedResult.data.map((track) => TrackUtils.build(track, requester));
                            break;
                        case LoadTypes.Track:
                            tracks = [
                                TrackUtils.build(recommendedResult.data, requester),
                            ];
                            break;
                        case LoadTypes.Playlist: {
                            const playlistData = recommendedResult.data;
                            tracks = playlistData.tracks.map((track) => TrackUtils.build(track, requester));
                            playlist = {
                                name: playlistData.info.name,
                                playlistInfo: playlistData.pluginInfo,
                                requester: requester,
                                tracks,
                                duration: tracks.reduce((acc, cur) => acc + (cur.duration || 0), 0),
                            };
                            break;
                        }
                    }
                    const result = { loadType: recommendedResult.loadType, tracks, playlist };
                    if (result.loadType === LoadTypes.Empty || result.loadType === LoadTypes.Error) {
                        return [];
                    }
                    if (result.loadType === LoadTypes.Playlist) {
                        result.tracks = result.playlist.tracks;
                    }
                    if (!result.tracks.length) {
                        return [];
                    }
                    return result.tracks;
                }
                break;
            case 'soundcloud':
                {
                    if (!track.uri.includes('soundcloud')) {
                        const res = await this.manager.search({ query: `${track.author} - ${track.title}`, source: Manager_1.SearchPlatform.SoundCloud }, track.requester);
                        if (res.loadType === LoadTypes.Empty || res.loadType === LoadTypes.Error) {
                            return [];
                        }
                        if (res.loadType === LoadTypes.Playlist) {
                            res.tracks = res.playlist.tracks;
                        }
                        if (!res.tracks.length) {
                            return [];
                        }
                        track = res.tracks[0];
                    }
                    try {
                        const recommendedRes = await axios_1.default.get(`${track.uri}/recommended`).catch((err) => {
                            console.error(`[AutoPlay] Failed to fetch SoundCloud recommendations. Status: ${err.response?.status || 'Unknown'}`, err.message);
                            return null;
                        });
                        if (!recommendedRes) {
                            return [];
                        }
                        const html = recommendedRes.data;
                        const dom = new jsdom_1.JSDOM(html);
                        const document = dom.window.document;
                        const secondNoscript = document.querySelectorAll('noscript')[1];
                        const sectionElement = secondNoscript.querySelector('section');
                        const articleElements = sectionElement.querySelectorAll('article');
                        if (!articleElements || articleElements.length === 0) {
                            return [];
                        }
                        const urls = Array.from(articleElements)
                            .map((articleElement) => {
                            const h2Element = articleElement.querySelector('h2[itemprop="name"]');
                            const aElement = h2Element?.querySelector('a[itemprop="url"]');
                            return aElement ? `https://soundcloud.com${aElement.getAttribute('href')}` : null;
                        })
                            .filter(Boolean);
                        if (!urls.length) {
                            return [];
                        }
                        const randomUrl = urls[Math.floor(Math.random() * urls.length)];
                        const res = await this.manager.search({ query: randomUrl, source: Manager_1.SearchPlatform.SoundCloud }, track.requester);
                        if (res.loadType === LoadTypes.Empty || res.loadType === LoadTypes.Error) {
                            return [];
                        }
                        if (res.loadType === LoadTypes.Playlist) {
                            res.tracks = res.playlist.tracks;
                        }
                        if (!res.tracks.length) {
                            return [];
                        }
                        return res.tracks;
                    }
                    catch (error) {
                        console.error('[AutoPlay] Error occurred while fetching soundcloud recommendations:', error);
                        return [];
                    }
                }
                break;
            case 'youtube':
                {
                    const hasYouTubeURL = ['youtube.com', 'youtu.be'].some((url) => track.uri.includes(url));
                    let videoID = null;
                    if (hasYouTubeURL) {
                        videoID = track.uri.split('=').pop();
                    }
                    else {
                        const searchResult = await this.manager.search({ query: `${track.author} - ${track.title}`, source: Manager_1.SearchPlatform.YouTube }, track.requester);
                        videoID = searchResult.tracks[0]?.uri.split('=').pop();
                    }
                    if (!videoID) {
                        return [];
                    }
                    let randomIndex;
                    let searchURI;
                    do {
                        randomIndex = Math.floor(Math.random() * 23) + 2;
                        searchURI = `https://www.youtube.com/watch?v=${videoID}&list=RD${videoID}&index=${randomIndex}`;
                    } while (track.uri.includes(searchURI));
                    const res = await this.manager.search({ query: searchURI, source: Manager_1.SearchPlatform.YouTube }, track.requester);
                    if (res.loadType === LoadTypes.Empty || res.loadType === LoadTypes.Error) {
                        return [];
                    }
                    const filteredTracks = res.tracks.filter((t) => t.uri !== track.uri);
                    return filteredTracks;
                }
                break;
            case 'tidal':
                {
                    if (!track.uri.includes('tidal')) {
                        const res = await this.manager.search({ query: `${track.author} - ${track.title}`, source: Manager_1.SearchPlatform.Tidal }, track.requester);
                        if (res.loadType === LoadTypes.Empty || res.loadType === LoadTypes.Error) {
                            return [];
                        }
                        if (res.loadType === LoadTypes.Playlist) {
                            res.tracks = res.playlist.tracks;
                        }
                        if (!res.tracks.length) {
                            return [];
                        }
                        track = res.tracks[0];
                    }
                    const identifier = `tdrec:${track.identifier}`;
                    const recommendedResult = (await this.manager.useableNode.rest.get(`/v4/loadtracks?identifier=${encodeURIComponent(identifier)}`));
                    if (!recommendedResult) {
                        return [];
                    }
                    let tracks = [];
                    let playlist = null;
                    const requester = track.requester;
                    switch (recommendedResult.loadType) {
                        case LoadTypes.Search:
                            tracks = recommendedResult.data.map((track) => TrackUtils.build(track, requester));
                            break;
                        case LoadTypes.Track:
                            tracks = [
                                TrackUtils.build(recommendedResult.data, requester),
                            ];
                            break;
                        case LoadTypes.Playlist: {
                            const playlistData = recommendedResult.data;
                            tracks = playlistData.tracks.map((track) => TrackUtils.build(track, requester));
                            playlist = {
                                name: playlistData.info.name,
                                playlistInfo: playlistData.pluginInfo,
                                requester: requester,
                                tracks,
                                duration: tracks.reduce((acc, cur) => acc + (cur.duration || 0), 0),
                            };
                            break;
                        }
                    }
                    const result = { loadType: recommendedResult.loadType, tracks, playlist };
                    if (result.loadType === LoadTypes.Empty || result.loadType === LoadTypes.Error) {
                        return [];
                    }
                    if (result.loadType === LoadTypes.Playlist) {
                        result.tracks = result.playlist.tracks;
                    }
                    if (!result.tracks.length) {
                        return [];
                    }
                    return result.tracks;
                }
                break;
            case 'vkmusic':
                {
                    if (!track.uri.includes('vk.com') && !track.uri.includes('vk.ru')) {
                        const res = await this.manager.search({ query: `${track.author} - ${track.title}`, source: Manager_1.SearchPlatform.VKMusic }, track.requester);
                        if (res.loadType === LoadTypes.Empty || res.loadType === LoadTypes.Error) {
                            return [];
                        }
                        if (res.loadType === LoadTypes.Playlist) {
                            res.tracks = res.playlist.tracks;
                        }
                        if (!res.tracks.length) {
                            return [];
                        }
                        track = res.tracks[0];
                    }
                    const identifier = `vkrec:${track.identifier}`;
                    const recommendedResult = (await this.manager.useableNode.rest.get(`/v4/loadtracks?identifier=${encodeURIComponent(identifier)}`));
                    if (!recommendedResult) {
                        return [];
                    }
                    let tracks = [];
                    let playlist = null;
                    const requester = track.requester;
                    switch (recommendedResult.loadType) {
                        case LoadTypes.Search:
                            tracks = recommendedResult.data.map((track) => TrackUtils.build(track, requester));
                            break;
                        case LoadTypes.Track:
                            tracks = [
                                TrackUtils.build(recommendedResult.data, requester),
                            ];
                            break;
                        case LoadTypes.Playlist: {
                            const playlistData = recommendedResult.data;
                            tracks = playlistData.tracks.map((track) => TrackUtils.build(track, requester));
                            playlist = {
                                name: playlistData.info.name,
                                playlistInfo: playlistData.pluginInfo,
                                requester: requester,
                                tracks,
                                duration: tracks.reduce((acc, cur) => acc + (cur.duration || 0), 0),
                            };
                            break;
                        }
                    }
                    const result = { loadType: recommendedResult.loadType, tracks, playlist };
                    if (result.loadType === LoadTypes.Empty || result.loadType === LoadTypes.Error) {
                        return [];
                    }
                    if (result.loadType === LoadTypes.Playlist) {
                        result.tracks = result.playlist.tracks;
                    }
                    if (!result.tracks.length) {
                        return [];
                    }
                    return result.tracks;
                }
                break;
            case 'qobuz':
                {
                    if (!track.uri.includes('qobuz.com')) {
                        const res = await this.manager.search({ query: `${track.author} - ${track.title}`, source: Manager_1.SearchPlatform.Qobuz }, track.requester);
                        if (res.loadType === LoadTypes.Empty || res.loadType === LoadTypes.Error) {
                            return [];
                        }
                        if (res.loadType === LoadTypes.Playlist) {
                            res.tracks = res.playlist.tracks;
                        }
                        if (!res.tracks.length) {
                            return [];
                        }
                        track = res.tracks[0];
                    }
                    const identifier = `qbrec:${track.identifier}`;
                    const recommendedResult = (await this.manager.useableNode.rest.get(`/v4/loadtracks?identifier=${encodeURIComponent(identifier)}`));
                    if (!recommendedResult) {
                        return [];
                    }
                    let tracks = [];
                    let playlist = null;
                    const requester = track.requester;
                    switch (recommendedResult.loadType) {
                        case LoadTypes.Search:
                            tracks = recommendedResult.data.map((track) => TrackUtils.build(track, requester));
                            break;
                        case LoadTypes.Track:
                            tracks = [
                                TrackUtils.build(recommendedResult.data, requester),
                            ];
                            break;
                        case LoadTypes.Playlist: {
                            const playlistData = recommendedResult.data;
                            tracks = playlistData.tracks.map((track) => TrackUtils.build(track, requester));
                            playlist = {
                                name: playlistData.info.name,
                                playlistInfo: playlistData.pluginInfo,
                                requester: requester,
                                tracks,
                                duration: tracks.reduce((acc, cur) => acc + (cur.duration || 0), 0),
                            };
                            break;
                        }
                    }
                    const result = { loadType: recommendedResult.loadType, tracks, playlist };
                    if (result.loadType === LoadTypes.Empty || result.loadType === LoadTypes.Error) {
                        return [];
                    }
                    if (result.loadType === LoadTypes.Playlist) {
                        result.tracks = result.playlist.tracks;
                    }
                    if (!result.tracks.length) {
                        return [];
                    }
                    return result.tracks;
                }
                break;
            default:
                return [];
        }
    }
}
exports.AutoPlayUtils = AutoPlayUtils;
/** Gets or extends structures to extend the built in, or already extended, classes to add more functionality. */
class Structure {
    /**
     * Extends a class.
     * @param name
     * @param extender
     */
    static extend(name, extender) {
        if (!structures[name])
            throw new TypeError(`"${name} is not a valid structure`);
        const extended = extender(structures[name]);
        structures[name] = extended;
        return extended;
    }
    /**
     * Get a structure from available structures by name.
     * @param name
     */
    static get(name) {
        const structure = structures[name];
        if (!structure)
            throw new TypeError('"structure" must be provided.');
        return structure;
    }
}
exports.Structure = Structure;
const structures = {
    Player: require("./Player").Player,
    Queue: require("./Queue").Queue,
    Node: require("./Node").Node,
    Filters: require("./Filters").Filters,
    Manager: require("./Manager").Manager,
    Plugin: require("./Plugin").Plugin,
    Rest: require("./Rest").Rest,
    Utils: require("./Utils"),
};
var LoadTypes;
(function (LoadTypes) {
    LoadTypes["Track"] = "track";
    LoadTypes["Playlist"] = "playlist";
    LoadTypes["Search"] = "search";
    LoadTypes["Empty"] = "empty";
    LoadTypes["Error"] = "error";
})(LoadTypes || (exports.LoadTypes = LoadTypes = {}));
var StateTypes;
(function (StateTypes) {
    StateTypes["Connected"] = "CONNECTED";
    StateTypes["Connecting"] = "CONNECTING";
    StateTypes["Disconnected"] = "DISCONNECTED";
    StateTypes["Disconnecting"] = "DISCONNECTING";
    StateTypes["Destroying"] = "DESTROYING";
})(StateTypes || (exports.StateTypes = StateTypes = {}));
var TrackEndReasonTypes;
(function (TrackEndReasonTypes) {
    TrackEndReasonTypes["Finished"] = "finished";
    TrackEndReasonTypes["LoadFailed"] = "loadFailed";
    TrackEndReasonTypes["Stopped"] = "stopped";
    TrackEndReasonTypes["Replaced"] = "replaced";
    TrackEndReasonTypes["Cleanup"] = "cleanup";
})(TrackEndReasonTypes || (exports.TrackEndReasonTypes = TrackEndReasonTypes = {}));
var SeverityTypes;
(function (SeverityTypes) {
    SeverityTypes["Common"] = "common";
    SeverityTypes["Suspicious"] = "suspicious";
    SeverityTypes["Fault"] = "fault";
})(SeverityTypes || (exports.SeverityTypes = SeverityTypes = {}));
var TrackSourceTypes;
(function (TrackSourceTypes) {
    TrackSourceTypes["AppleMusic"] = "applemusic";
    TrackSourceTypes["Bandcamp"] = "bandcamp";
    TrackSourceTypes["Deezer"] = "deezer";
    TrackSourceTypes["Jiosaavn"] = "jiosaavn";
    TrackSourceTypes["SoundCloud"] = "soundcloud";
    TrackSourceTypes["Spotify"] = "spotify";
    TrackSourceTypes["Tidal"] = "tidal";
    TrackSourceTypes["Qobuz"] = "qobuz";
    TrackSourceTypes["VKMusic"] = "vkmusic";
    TrackSourceTypes["YouTube"] = "youtube";
})(TrackSourceTypes || (exports.TrackSourceTypes = TrackSourceTypes = {}));
