import { User, ClientUser, Message } from 'discord.js';
import WebSocket from 'ws';
import { Collection } from '@discordjs/collection';
import { EventEmitter } from 'events';

/** Represents an equalizer band. */
interface Band {
    /** The index of the equalizer band (0-12). */
    band: number;
    /** The gain value of the equalizer band (in decibels). */
    gain: number;
}

/** Handles the requests sent to the Lavalink REST API. */
declare class Rest {
    /** The Node that this Rest instance is connected to. */
    private node;
    /** The ID of the current session. */
    private sessionId;
    /** The password for the Node. */
    private readonly password;
    /** The URL of the Node. */
    private readonly url;
    /** The Manager instance. */
    manager: Manager;
    constructor(node: Node, manager: Manager);
    /**
     * Sets the session ID.
     * This method is used to set the session ID after a resume operation is done.
     * @param {string} sessionId The session ID to set.
     * @returns {string} Returns the set session ID.
     */
    setSessionId(sessionId: string): string;
    /**
     * Retrieves all the players that are currently running on the node.
     * @returns {Promise<unknown>} Returns the result of the GET request.
     */
    getAllPlayers(): Promise<unknown>;
    /**
     * Sends a PATCH request to update player related data.
     * @param {playOptions} options The options to update the player with.
     * @returns {Promise<unknown>} Returns the result of the PATCH request.
     */
    updatePlayer(options: playOptions): Promise<unknown>;
    /**
     * Sends a DELETE request to the server to destroy the player.
     * @param {string} guildId The guild ID of the player to destroy.
     * @returns {Promise<unknown>} Returns the result of the DELETE request.
     */
    destroyPlayer(guildId: string): Promise<unknown>;
    /**
     * Updates the session status for resuming.
     * This method sends a PATCH request to update the session's resuming status and timeout.
     *
     * @param {boolean} resuming - Indicates whether the session should be set to resuming.
     * @param {number} timeout - The timeout duration for the session resume.
     * @returns {Promise<unknown>} The result of the PATCH request.
     */
    updateSession(resuming: boolean, timeout: number): Promise<unknown>;
    /**
     * Sends a request to the specified endpoint and returns the response data.
     * @param {string} method The HTTP method to use for the request.
     * @param {string} endpoint The endpoint to send the request to.
     * @param {unknown} [body] The data to send in the request body.
     * @returns {Promise<unknown>} The response data of the request.
     */
    private request;
    /**
     * Sends a GET request to the specified endpoint and returns the response data.
     * @param {string} endpoint The endpoint to send the GET request to.
     * @returns {Promise<unknown>} The response data of the GET request.
     */
    get(endpoint: string): Promise<unknown>;
    /**
     * Sends a PATCH request to the specified endpoint and returns the response data.
     * @param {string} endpoint The endpoint to send the PATCH request to.
     * @param {unknown} body The data to send in the request body.
     * @returns {Promise<unknown>} The response data of the PATCH request.
     */
    patch(endpoint: string, body: unknown): Promise<unknown>;
    /**
     * Sends a POST request to the specified endpoint and returns the response data.
     * @param {string} endpoint The endpoint to send the POST request to.
     * @param {unknown} body The data to send in the request body.
     * @returns {Promise<unknown>} The response data of the POST request.
     */
    post(endpoint: string, body: unknown): Promise<unknown>;
    /**
     * Sends a PUT request to the specified endpoint and returns the response data.
     * @param {string} endpoint The endpoint to send the PUT request to.
     * @param {unknown} body The data to send in the request body.
     * @returns {Promise<unknown>} The response data of the PUT request.
     */
    put(endpoint: string, body: unknown): Promise<unknown>;
    /**
     * Sends a DELETE request to the specified endpoint.
     * @param {string} endpoint - The endpoint to send the DELETE request to.
     * @returns {Promise<unknown>} The response data of the DELETE request.
     */
    delete(endpoint: string): Promise<unknown>;
}
interface playOptions {
    guildId: string;
    data: {
        /** The base64 encoded track. */
        encodedTrack?: string;
        /** The track ID. */
        identifier?: string;
        /** The track time to start at. */
        startTime?: number;
        /** The track time to end at. */
        endTime?: number;
        /** The player volume level. */
        volume?: number;
        /** The player position in a track. */
        position?: number;
        /** Whether the player is paused. */
        paused?: boolean;
        /** The audio effects. */
        filters?: object;
        /** voice payload. */
        voice?: {
            token: string;
            sessionId: string;
            endpoint: string;
        };
        /** Whether to not replace the track if a play payload is sent. */
        noReplace?: boolean;
    };
}

declare enum SponsorBlockSegment {
    Sponsor = "sponsor",
    SelfPromo = "selfpromo",
    Interaction = "interaction",
    Intro = "intro",
    Outro = "outro",
    Preview = "preview",
    MusicOfftopic = "music_offtopic",
    Filler = "filler"
}
declare class Node {
    options: NodeOptions;
    /** The socket for the node. */
    socket: WebSocket | null;
    /** The stats for the node. */
    stats: NodeStats;
    /** The manager for the node */
    manager: Manager;
    /** The node's session ID. */
    sessionId: string | null;
    /** The REST instance. */
    readonly rest: Rest;
    /** Actual Lavalink information of the node. */
    info: LavalinkInfo | null;
    private static _manager;
    private reconnectTimeout?;
    private reconnectAttempts;
    /**
     * Creates an instance of Node.
     * @param options
     */
    constructor(options: NodeOptions);
    /** Returns if connected to the Node. */
    get connected(): boolean;
    /** Returns the address for this node. */
    get address(): string;
    /** @hidden */
    static init(manager: Manager): void;
    /**
     * Creates the sessionIds.json file if it doesn't exist. This file is used to
     * store the session IDs for each node. The session IDs are used to identify
     * the node when resuming a session.
     */
    createSessionIdsFile(): void;
    /**
     * Loads session IDs from the sessionIds.json file if it exists.
     * The session IDs are used to resume sessions for each node.
     *
     * The session IDs are stored in the sessionIds.json file as a composite key
     * of the node identifier and cluster ID. This allows multiple clusters to
     * be used with the same node identifier.
     */
    loadSessionIds(): void;
    /**
     * Updates the session ID in the sessionIds.json file.
     *
     * This method is called after the session ID has been updated, and it
     * writes the new session ID to the sessionIds.json file.
     *
     * @remarks
     * The session ID is stored in the sessionIds.json file as a composite key
     * of the node identifier and cluster ID. This allows multiple clusters to
     * be used with the same node identifier.
     */
    updateSessionId(): void;
    /**
     * Connects to the Node.
     *
     * @remarks
     * If the node is already connected, this method will do nothing.
     * If the node has a session ID, it will be sent in the headers of the WebSocket connection.
     * If the node has no session ID but the `resumeStatus` option is true, it will use the session ID
     * stored in the sessionIds.json file if it exists.
     */
    connect(): void;
    /**
     * Destroys the node and cleans up associated resources.
     *
     * This method emits a debug event indicating that the node is being destroyed and attempts
     * to automatically move all players connected to the node to a usable one. It then closes
     * the WebSocket connection, removes all event listeners, and clears the reconnect timeout.
     * Finally, it emits a "nodeDestroy" event and removes the node from the manager.
     *
     * @returns {Promise<void>} A promise that resolves when the node and its resources have been destroyed.
     */
    destroy(): Promise<void>;
    /**
     * Attempts to reconnect to the node if the connection is lost.
     *
     * This method is called when the WebSocket connection is closed
     * unexpectedly. It will attempt to reconnect to the node after a
     * specified delay, and will continue to do so until the maximum
     * number of retry attempts is reached or the node is manually destroyed.
     * If the maximum number of retry attempts is reached, an error event
     * will be emitted and the node will be destroyed.
     *
     * @returns {Promise<void>} - Resolves when the reconnection attempt is scheduled.
     * @emits {debug} - Emits a debug event indicating the node is attempting to reconnect.
     * @emits {nodeReconnect} - Emits a nodeReconnect event when the node is attempting to reconnect.
     * @emits {nodeError} - Emits an error event if the maximum number of retry attempts is reached.
     * @emits {nodeDestroy} - Emits a nodeDestroy event if the maximum number of retry attempts is reached.
     */
    private reconnect;
    /**
     * Handles the "open" event emitted by the WebSocket connection.
     *
     * This method is called when the WebSocket connection is established.
     * It clears any existing reconnect timeouts, emits a debug event
     * indicating the node is connected, and emits a "nodeConnect" event
     * with the node as the argument.
     */
    protected open(): void;
    /**
     * Handles the "close" event emitted by the WebSocket connection.
     *
     * This method is called when the WebSocket connection is closed.
     * It emits a "nodeDisconnect" event with the node and the close event as arguments,
     * and a debug event indicating the node is disconnected.
     * It then attempts to move all players connected to that node to a useable one.
     * If the close event was not initiated by the user, it will also attempt to reconnect.
     *
     * @param {number} code The close code of the WebSocket connection.
     * @param {string} reason The reason for the close event.
     * @returns {Promise<void>} A promise that resolves when the disconnection is handled.
     */
    protected close(code: number, reason: string): Promise<void>;
    /**
     * Handles the "error" event emitted by the WebSocket connection.
     *
     * This method is called when an error occurs on the WebSocket connection.
     * It emits a "nodeError" event with the node and the error as arguments and
     * a debug event indicating the error on the node.
     * @param {Error} error The error that occurred.
     */
    protected error(error: Error): void;
    /**
     * Handles incoming messages from the Lavalink WebSocket connection.
     * @param {Buffer | string} d The message received from the WebSocket connection.
     * @returns {Promise<void>} A promise that resolves when the message is handled.
     * @emits {debug} - Emits a debug event with the message received from the WebSocket connection.
     * @emits {nodeError} - Emits a nodeError event if an unexpected op is received.
     * @emits {nodeRaw} - Emits a nodeRaw event with the raw message received from the WebSocket connection.
     * @private
     */
    protected message(d: Buffer | string): Promise<void>;
    /**
     * Handles an event emitted from the Lavalink node.
     * @param {PlayerEvent & PlayerEvents} payload The event emitted from the node.
     * @returns {Promise<void>} A promise that resolves when the event has been handled.
     * @private
     */
    protected handleEvent(payload: PlayerEvent & PlayerEvents): Promise<void>;
    /**
     * Emitted when a new track starts playing.
     * @param {Player} player The player that started playing the track.
     * @param {Track} track The track that started playing.
     * @param {TrackStartEvent} payload The payload of the event emitted by the node.
     * @private
     */
    protected trackStart(player: Player, track: Track, payload: TrackStartEvent): void;
    /**
     * Emitted when a track ends playing.
     * @param {Player} player - The player that the track ended on.
     * @param {Track} track - The track that ended.
     * @param {TrackEndEvent} payload - The payload of the event emitted by the node.
     * @private
     */
    protected trackEnd(player: Player, track: Track, payload: TrackEndEvent): Promise<void>;
    /**
     * Handles autoplay logic for a player.
     * This method is responsible for selecting an appropriate method of autoplay
     * and executing it. If autoplay is not enabled or all attempts have failed,
     * it will return false.
     * @param {Player} player - The player to handle autoplay for.
     * @param {number} attempt - The current attempt number of the autoplay.
     * @returns {Promise<boolean>} A promise that resolves to a boolean indicating if autoplay was successful.
     * @private
     */
    private handleAutoplay;
    /**
     * Selects a platform from the given enabled sources.
     * @param {string[]} enabledSources - The enabled sources to select from.
     * @returns {SearchPlatform | null} - The selected platform or null if none was found.
     */
    private handleFailedTrack;
    /**
     * Handles the scenario when a track is repeated.
     * Shifts the queue to the next track and emits a track end event.
     * If there is no next track, handles the queue end scenario.
     * If autoplay is enabled, plays the next track.
     *
     * @param {Player} player - The player instance associated with the track.
     * @param {Track} track - The track that is repeated.
     * @param {TrackEndEvent} payload - The event payload containing details about the track end.
     * @returns {Promise<void>} A promise that resolves when the repeated track has been processed.
     * @private
     */
    private handleRepeatedTrack;
    /**
     * Plays the next track in the queue.
     * Updates the queue by shifting the current track to the previous track
     * and plays the next track if autoplay is enabled.
     *
     * @param {Player} player - The player associated with the track.
     * @param {Track} track - The track that has ended.
     * @param {TrackEndEvent} payload - The event payload containing additional data about the track end event.
     * @returns {void}
     * @private
     */
    private playNextTrack;
    /**
     * Handles the event when a queue ends.
     * If autoplay is enabled, attempts to play the next track in the queue using the autoplay logic.
     * If all attempts fail, resets the player state and emits the `queueEnd` event.
     * @param {Player} player - The player associated with the track.
     * @param {Track} track - The track that has ended.
     * @param {TrackEndEvent} payload - The event payload containing additional data about the track end event.
     * @returns {Promise<void>} A promise that resolves when the queue end processing is complete.
     */
    queueEnd(player: Player, track: Track, payload: TrackEndEvent): Promise<void>;
    /**
     * Fetches the lyrics of a track from the Lavalink node.
     * This method uses the `lavalyrics-plugin` to fetch the lyrics.
     * If the plugin is not available, it will throw a RangeError.
     *
     * @param {Track} track - The track to fetch the lyrics for.
     * @param {boolean} [skipTrackSource=false] - Whether to skip using the track's source URL.
     * @returns {Promise<Lyrics>} A promise that resolves with the lyrics data.
     */
    getLyrics(track: Track, skipTrackSource?: boolean): Promise<Lyrics>;
    /**
     * Handles the event when a track becomes stuck during playback.
     * Stops the current track and emits a `trackStuck` event.
     *
     * @param {Player} player - The player associated with the track that became stuck.
     * @param {Track} track - The track that became stuck.
     * @param {TrackStuckEvent} payload - The event payload containing additional data about the track stuck event.
     * @returns {void}
     * @protected
     */
    protected trackStuck(player: Player, track: Track, payload: TrackStuckEvent): Promise<void>;
    /**
     * Handles the event when a track has an error during playback.
     * Stops the current track and emits a `trackError` event.
     *
     * @param {Player} player - The player associated with the track that had an error.
     * @param {Track} track - The track that had an error.
     * @param {TrackExceptionEvent} payload - The event payload containing additional data about the track error event.
     * @returns {void}
     * @protected
     */
    protected trackError(player: Player, track: Track, payload: TrackExceptionEvent): Promise<void>;
    /**
     * Emitted when the WebSocket connection for a player closes.
     * The payload of the event will contain the close code and reason if provided.
     * @param {Player} player - The player associated with the WebSocket connection.
     * @param {WebSocketClosedEvent} payload - The event payload containing additional data about the WebSocket close event.
     */
    protected socketClosed(player: Player, payload: WebSocketClosedEvent): void;
    /**
     * Emitted when the segments for a track are loaded.
     * The payload of the event will contain the segments.
     * @param {Player} player - The player associated with the segments.
     * @param {Track} track - The track associated with the segments.
     * @param {SponsorBlockSegmentsLoaded} payload - The event payload containing additional data about the segments loaded event.
     */
    private sponsorBlockSegmentLoaded;
    /**
     * Emitted when a segment of a track is skipped using the sponsorblock plugin.
     * The payload of the event will contain the skipped segment.
     * @param {Player} player - The player associated with the skipped segment.
     * @param {Track} track - The track associated with the skipped segment.
     * @param {SponsorBlockSegmentSkipped} payload - The event payload containing additional data about the segment skipped event.
     */
    private sponsorBlockSegmentSkipped;
    /**
     * Emitted when chapters for a track are loaded using the sponsorblock plugin.
     * The payload of the event will contain the chapters.
     * @param {Player} player - The player associated with the chapters.
     * @param {Track} track - The track associated with the chapters.
     * @param {SponsorBlockChaptersLoaded} payload - The event payload containing additional data about the chapters loaded event.
     */
    private sponsorBlockChaptersLoaded;
    /**
     * Emitted when a chapter of a track is started using the sponsorblock plugin.
     * The payload of the event will contain the started chapter.
     * @param {Player} player - The player associated with the started chapter.
     * @param {Track} track - The track associated with the started chapter.
     * @param {SponsorBlockChapterStarted} payload - The event payload containing additional data about the chapter started event.
     */
    private sponsorBlockChapterStarted;
    /**
     * Fetches Lavalink node information.
     * @returns {Promise<LavalinkInfo>} A promise that resolves to the Lavalink node information.
     */
    fetchInfo(): Promise<LavalinkInfo>;
    /**
     * Gets the current sponsorblock segments for a player.
     * @param {Player} player - The player to get the sponsorblocks for.
     * @returns {Promise<SponsorBlockSegment[]>} A promise that resolves to the sponsorblock segments.
     * @throws {RangeError} If the sponsorblock-plugin is not available in the Lavalink node.
     */
    getSponsorBlock(player: Player): Promise<SponsorBlockSegment[]>;
    /**
     * Sets the sponsorblock segments for a player.
     * @param {Player} player - The player to set the sponsor blocks for.
     * @param {SponsorBlockSegment[]} segments - The sponsorblock segments to set. Defaults to `[SponsorBlockSegment.Sponsor, SponsorBlockSegment.SelfPromo]` if not provided.
     * @returns {Promise<void>} The promise is resolved when the operation is complete.
     * @throws {RangeError} If the sponsorblock-plugin is not available in the Lavalink node.
     * @throws {RangeError} If no segments are provided.
     * @throws {SyntaxError} If an invalid sponsorblock is provided.
     * @example
     * ```ts
     * // use it on the player via player.setSponsorBlock();
     * player.setSponsorBlock([SponsorBlockSegment.Sponsor, SponsorBlockSegment.SelfPromo]);
     * ```
     */
    setSponsorBlock(player: Player, segments?: SponsorBlockSegment[]): Promise<void>;
    /**
     * Deletes the sponsorblock segments for a player.
     * @param {Player} player - The player to delete the sponsorblocks for.
     * @returns {Promise<void>} The promise is resolved when the operation is complete.
     * @throws {RangeError} If the sponsorblock-plugin is not available in the Lavalink node.
     */
    deleteSponsorBlock(player: Player): Promise<void>;
    /**
     * Creates a README.md or README.txt file in the magmastream directory
     * if it doesn't already exist. This file is used to store player data
     * for autoresume and other features.
     * @private
     */
    private createReadmeFile;
}
interface NodeOptions {
    /** The host for the node. */
    host: string;
    /** The port for the node. */
    port?: number;
    /** The password for the node. */
    password?: string;
    /** Whether the host uses SSL. */
    secure?: boolean;
    /** The identifier for the node. */
    identifier?: string;
    /** The retryAmount for the node. */
    retryAmount?: number;
    /** The retryDelay for the node. */
    retryDelay?: number;
    /** Whether to resume the previous session. */
    resumeStatus?: boolean;
    /** The time the lavalink server will wait before it removes the player. */
    resumeTimeout?: number;
    /** The timeout used for api calls. */
    requestTimeout?: number;
    /** Priority of the node. */
    priority?: number;
}
interface NodeStats {
    /** The amount of players on the node. */
    players: number;
    /** The amount of playing players on the node. */
    playingPlayers: number;
    /** The uptime for the node. */
    uptime: number;
    /** The memory stats for the node. */
    memory: MemoryStats;
    /** The cpu stats for the node. */
    cpu: CPUStats;
    /** The frame stats for the node. */
    frameStats: FrameStats;
}
interface MemoryStats {
    /** The free memory of the allocated amount. */
    free: number;
    /** The used memory of the allocated amount. */
    used: number;
    /** The total allocated memory. */
    allocated: number;
    /** The reservable memory. */
    reservable: number;
}
interface CPUStats {
    /** The core amount the host machine has. */
    cores: number;
    /** The system load. */
    systemLoad: number;
    /** The lavalink load. */
    lavalinkLoad: number;
}
interface FrameStats {
    /** The amount of sent frames. */
    sent?: number;
    /** The amount of nulled frames. */
    nulled?: number;
    /** The amount of deficit frames. */
    deficit?: number;
}
interface LavalinkInfo {
    version: {
        semver: string;
        major: number;
        minor: number;
        patch: number;
        preRelease: string;
    };
    buildTime: number;
    git: {
        branch: string;
        commit: string;
        commitTime: number;
    };
    jvm: string;
    lavaplayer: string;
    sourceManagers: string[];
    filters: string[];
    plugins: {
        name: string;
        version: string;
    }[];
}
interface LyricsLine {
    timestamp: number;
    duration: number;
    line: string;
    plugin: object;
}
interface Lyrics {
    source: string;
    provider: string;
    text?: string;
    lines: LyricsLine[];
    plugin: object[];
}

/**
 * The player's queue, the `current` property is the currently playing track, think of the rest as the up-coming tracks.
 */
declare class Queue extends Array<Track> {
    /**
     * The total duration of the queue in milliseconds.
     * This includes the duration of the currently playing track.
     */
    get duration(): number;
    /**
     * The total size of tracks in the queue including the current track.
     * This includes the current track if it is not null.
     * @returns The total size of tracks in the queue including the current track.
     */
    get totalSize(): number;
    /**
     * The size of tracks in the queue.
     * This does not include the currently playing track.
     * @returns The size of tracks in the queue.
     */
    get size(): number;
    /** The current track */
    current: Track | null;
    /** The previous tracks */
    previous: Track[];
    /** The Manager instance. */
    manager: Manager;
    /** The guild ID property. */
    guildId: string;
    /**
     * Constructs a new Queue.
     * @param guildId The guild ID.
     * @param manager The Manager instance.
     */
    constructor(guildId: string, manager: Manager);
    /**
     * Adds a track to the queue.
     * @param track The track or tracks to add. Can be a single `Track` or an array of `Track`s.
     * @param [offset=null] The position to add the track(s) at. If not provided, the track(s) will be added at the end of the queue.
     */
    add(track: Track | Track[], offset?: number): void;
    /**
     * Removes track(s) from the queue.
     * @param startOrPosition If a single number is provided, it will be treated as the position of the track to remove.
     *                         If two numbers are provided, they will be used as the start and end of a range of tracks to remove.
     * @param end Optional, end of the range of tracks to remove.
     * @returns The removed track(s).
     */
    remove(position?: number): Track[];
    remove(start: number, end: number): Track[];
    /**
     * Clears the queue.
     * This will remove all tracks from the queue and emit a state update event.
     */
    clear(): void;
    /**
     * Shuffles the queue.
     * This will randomize the order of the tracks in the queue and emit a state update event.
     */
    shuffle(): void;
    /**
     * Shuffles the queue to play tracks requested by each user one block at a time.
     */
    userBlockShuffle(): void;
    /**
     * Shuffles the queue to play tracks requested by each user one by one.
     */
    roundRobinShuffle(): void;
}

declare abstract class TrackUtils {
    static trackPartial: TrackPartial[] | null;
    private static manager;
    /**
     * Initializes the TrackUtils class with the given manager.
     * @param manager The manager instance to use.
     * @hidden
     */
    static init(manager: Manager): void;
    /**
     * Sets the partial properties for the Track class. If a Track has some of its properties removed by the partial,
     * it will be considered a partial Track.
     * @param {TrackPartial} partial The array of string property names to remove from the Track class.
     */
    static setTrackPartial(partial: TrackPartial[]): void;
    /**
     * Checks if the provided argument is a valid Track.
     * If provided an array then every element will be checked.
     * @param trackOrTracks The Track or array of Tracks to check.
     * @returns {boolean} Whether the provided argument is a valid Track.
     */
    static validate(trackOrTracks: unknown): boolean;
    /**
     * Builds a Track from the raw data from Lavalink and a optional requester.
     * @param data The raw data from Lavalink to build the Track from.
     * @param requester The user who requested the track, if any.
     * @returns The built Track.
     */
    static build<T = User | ClientUser>(data: TrackData, requester?: T): Track;
}
declare abstract class AutoPlayUtils {
    private static manager;
    /**
     * Initializes the AutoPlayUtils class with the given manager.
     * @param manager The manager instance to use.
     * @hidden
     */
    static init(manager: Manager): void;
    /**
     * Gets recommended tracks for the given track.
     * @param track The track to get recommended tracks for.
     * @returns An array of recommended tracks.
     */
    static getRecommendedTracks(track: Track): Promise<Track[]>;
    /**
     * Gets recommended tracks from Last.fm for the given track.
     * @param track The track to get recommended tracks for.
     * @param apiKey The API key for Last.fm.
     * @returns An array of recommended tracks.
     */
    static getRecommendedTracksFromLastFm(track: Track, apiKey: string): Promise<Track[]>;
    /**
     * Gets recommended tracks from the given source.
     * @param track The track to get recommended tracks for.
     * @param platform The source to get recommended tracks from.
     * @returns An array of recommended tracks.
     */
    static getRecommendedTracksFromSource(track: Track, platform: string): Promise<Track[]>;
}
/** Gets or extends structures to extend the built in, or already extended, classes to add more functionality. */
declare abstract class Structure {
    /**
     * Extends a class.
     * @param name
     * @param extender
     */
    static extend<K extends keyof Extendable, T extends Extendable[K]>(name: K, extender: (target: Extendable[K]) => T): T;
    /**
     * Get a structure from available structures by name.
     * @param name
     */
    static get<K extends keyof Extendable>(name: K): Extendable[K];
}
type Sizes = "0" | "1" | "2" | "3" | "default" | "mqdefault" | "hqdefault" | "maxresdefault";
declare enum LoadTypes {
    Track = "track",
    Playlist = "playlist",
    Search = "search",
    Empty = "empty",
    Error = "error"
}
type LoadType = keyof typeof LoadTypes;
declare enum StateTypes {
    Connected = "CONNECTED",
    Connecting = "CONNECTING",
    Disconnected = "DISCONNECTED",
    Disconnecting = "DISCONNECTING",
    Destroying = "DESTROYING"
}
type State = keyof typeof StateTypes;
type SponsorBlockSegmentEvents = SponsorBlockSegmentSkipped | SponsorBlockSegmentsLoaded | SponsorBlockChapterStarted | SponsorBlockChaptersLoaded;
type SponsorBlockSegmentEventType = "SegmentSkipped" | "SegmentsLoaded" | "ChapterStarted" | "ChaptersLoaded";
type PlayerEvents = TrackStartEvent | TrackEndEvent | TrackStuckEvent | TrackExceptionEvent | WebSocketClosedEvent | SponsorBlockSegmentEvents;
type PlayerEventType = "TrackStartEvent" | "TrackEndEvent" | "TrackExceptionEvent" | "TrackStuckEvent" | "WebSocketClosedEvent" | "SegmentSkipped" | "SegmentsLoaded" | "ChaptersLoaded" | "ChapterStarted";
declare enum TrackEndReasonTypes {
    Finished = "finished",
    LoadFailed = "loadFailed",
    Stopped = "stopped",
    Replaced = "replaced",
    Cleanup = "cleanup"
}
type TrackEndReason = keyof typeof TrackEndReasonTypes;
declare enum SeverityTypes {
    Common = "common",
    Suspicious = "suspicious",
    Fault = "fault"
}
type Severity = keyof typeof SeverityTypes;
interface TrackData {
    /** The track information. */
    encoded: string;
    /** The detailed information of the track. */
    info: TrackDataInfo;
    /** Additional track info provided by plugins. */
    pluginInfo: Record<string, string>;
}
interface TrackDataInfo {
    identifier: string;
    isSeekable: boolean;
    author: string;
    length: number;
    isrc?: string;
    isStream: boolean;
    title: string;
    uri?: string;
    artworkUrl?: string;
    sourceName?: TrackSourceName;
}
declare enum TrackSourceTypes {
    AppleMusic = "applemusic",
    Bandcamp = "bandcamp",
    Deezer = "deezer",
    Jiosaavn = "jiosaavn",
    SoundCloud = "soundcloud",
    Spotify = "spotify",
    Tidal = "tidal",
    Qobuz = "qobuz",
    VKMusic = "vkmusic",
    YouTube = "youtube"
}
type TrackSourceName = keyof typeof TrackSourceTypes;
interface Extendable {
    Player: typeof Player;
    Queue: typeof Queue;
    Node: typeof Node;
}
interface VoiceServer {
    token: string;
    guild_id: string;
    endpoint: string;
}
interface VoiceState {
    op: "voiceUpdate";
    guildId: string;
    event: VoiceServer;
    sessionId?: string;
}
interface VoiceState {
    guild_id: string;
    user_id: string;
    session_id: string;
    channel_id: string;
}
interface VoicePacket {
    t?: "VOICE_SERVER_UPDATE" | "VOICE_STATE_UPDATE";
    d: VoiceState | VoiceServer;
}
interface NodeMessage extends NodeStats {
    type: PlayerEventType;
    op: "stats" | "playerUpdate" | "event";
    guildId: string;
}
interface PlayerEvent {
    op: "event";
    type: PlayerEventType;
    guildId: string;
}
interface Exception {
    message: string;
    severity: SeverityTypes;
    cause: string;
}
interface TrackStartEvent extends PlayerEvent {
    type: "TrackStartEvent";
    track: TrackData;
}
interface TrackEndEvent extends PlayerEvent {
    type: "TrackEndEvent";
    track: TrackData;
    reason: TrackEndReasonTypes;
}
interface TrackExceptionEvent extends PlayerEvent {
    exception?: Exception;
    guildId: string;
    type: "TrackExceptionEvent";
}
interface TrackStuckEvent extends PlayerEvent {
    type: "TrackStuckEvent";
    thresholdMs: number;
}
interface WebSocketClosedEvent extends PlayerEvent {
    type: "WebSocketClosedEvent";
    code: number;
    reason: string;
    byRemote: boolean;
}
interface SponsorBlockSegmentsLoaded extends PlayerEvent {
    type: "SegmentsLoaded";
    segments: {
        category: string;
        start: number;
        end: number;
    }[];
}
interface SponsorBlockSegmentSkipped extends PlayerEvent {
    type: "SegmentSkipped";
    segment: {
        category: string;
        start: number;
        end: number;
    };
}
interface SponsorBlockChapterStarted extends PlayerEvent {
    type: "ChapterStarted";
    /** The chapter which started */
    chapter: {
        /** The name of the chapter */
        name: string;
        start: number;
        end: number;
        duration: number;
    };
}
interface SponsorBlockChaptersLoaded extends PlayerEvent {
    type: "ChaptersLoaded";
    /** All chapters loaded */
    chapters: {
        /** The name of the chapter */
        name: string;
        start: number;
        end: number;
        duration: number;
    }[];
}
interface PlayerUpdate {
    op: "playerUpdate";
    /** The guild id of the player. */
    guildId: string;
    state: {
        /** Unix timestamp in milliseconds. */
        time: number;
        /** The position of the track in milliseconds. */
        position: number;
        /** Whether Lavalink is connected to the voice gateway. */
        connected: boolean;
        /** The ping of the node to the Discord voice server in milliseconds (-1 if not connected). */
        ping: number;
    };
}

/**
 * The main hub for interacting with Lavalink and using Magmastream,
 */
declare class Manager extends EventEmitter {
    /** The map of players. */
    readonly players: Collection<string, Player>;
    /** The map of nodes. */
    readonly nodes: Collection<string, Node>;
    /** The options that were set. */
    readonly options: ManagerOptions;
    initiated: boolean;
    /**
     * Initiates the Manager class.
     * @param options
     * @param options.plugins - An array of plugins to load.
     * @param options.nodes - An array of node options to create nodes from.
     * @param options.autoPlay - Whether to automatically play the first track in the queue when the player is created.
     * @param options.autoPlaySearchPlatforms - The search platform autoplay will use. Fallback to Youtube if not found.
     * @param options.usePriority - Whether to use the priority when selecting a node to play on.
     * @param options.clientName - The name of the client to send to Lavalink.
     * @param options.defaultSearchPlatform - The default search platform to use when searching for tracks.
     * @param options.useNode - The strategy to use when selecting a node to play on.
     * @param options.trackPartial - The partial track search results to use when searching for tracks. This partials will always be presented on each track.
     * @param options.eventBatchDuration - The duration to wait before processing the collected player state events.
     * @param options.eventBatchInterval - The interval to wait before processing the collected player state events.
     */
    constructor(options: ManagerOptions);
    /**
     * Initiates the Manager.
     * @param clientId - The Discord client ID (required).
     * @param clusterId - The cluster ID which runs the current process (required).
     * @returns The manager instance.
     */
    init(clientId: string, clusterId?: number): this;
    /**
     * Searches the enabled sources based off the URL or the `source` property.
     * @param query
     * @param requester
     * @returns The search result.
     */
    search<T = unknown>(query: string | SearchQuery, requester?: T): Promise<SearchResult>;
    /**
     * Creates a player or returns one if it already exists.
     * @param options The options to create the player with.
     * @returns The created player.
     */
    create(options: PlayerOptions): Player;
    /**
     * Returns a player or undefined if it does not exist.
     * @param guildId The guild ID of the player to retrieve.
     * @returns The player if it exists, undefined otherwise.
     */
    get(guildId: string): Player | undefined;
    /**
     * Destroys a player.
     * @param guildId The guild ID of the player to destroy.
     * @returns A promise that resolves when the player has been destroyed.
     */
    destroy(guildId: string): Promise<void>;
    /**
     * Creates a new node or returns an existing one if it already exists.
     * @param options - The options to create the node with.
     * @returns The created node.
     */
    createNode(options: NodeOptions): Node;
    /**
     * Destroys a node if it exists. Emits a debug event if the node is found and destroyed.
     * @param identifier - The identifier of the node to destroy.
     * @returns {void}
     * @emits {debug} - Emits a debug message indicating the node is being destroyed.
     */
    destroyNode(identifier: string): Promise<void>;
    /**
     * Attaches an event listener to the manager.
     * @param event The event to listen for.
     * @param listener The function to call when the event is emitted.
     * @returns The manager instance for chaining.
     */
    on<T extends keyof ManagerEvents>(event: T, listener: (...args: ManagerEvents[T]) => void): this;
    /**
     * Updates the voice state of a player based on the provided data.
     * @param data - The data containing voice state information, which can be a VoicePacket, VoiceServer, or VoiceState.
     * @returns A promise that resolves when the voice state update is handled.
     * @emits {debug} - Emits a debug message indicating the voice state is being updated.
     */
    updateVoiceState(data: VoicePacket | VoiceServer | VoiceState): Promise<void>;
    /**
     * Decodes an array of base64 encoded tracks and returns an array of TrackData.
     * Emits a debug event with the tracks being decoded.
     * @param tracks - An array of base64 encoded track strings.
     * @returns A promise that resolves to an array of TrackData objects.
     * @throws Will throw an error if no nodes are available or if the API request fails.
     */
    decodeTracks(tracks: string[]): Promise<TrackData[]>;
    /**
     * Decodes a base64 encoded track and returns a TrackData.
     * @param track - The base64 encoded track string.
     * @returns A promise that resolves to a TrackData object.
     * @throws Will throw an error if no nodes are available or if the API request fails.
     */
    decodeTrack(track: string): Promise<TrackData>;
    /**
     * Saves player states to the JSON file.
     * @param {string} guildId - The guild ID of the player to save
     */
    savePlayerState(guildId: string): Promise<void>;
    private sleep;
    /**
     * Loads player states from the JSON file.
     * @param nodeId The ID of the node to load player states from.
     * @returns A promise that resolves when the player states have been loaded.
     */
    loadPlayerStates(nodeId: string): Promise<void>;
    /**
     * Returns the node to use based on the configured `useNode` and `usePriority` options.
     * If `usePriority` is true, the node is chosen based on priority, otherwise it is chosen based on the `useNode` option.
     * If `useNode` is "leastLoad", the node with the lowest load is chosen, if it is "leastPlayers", the node with the fewest players is chosen.
     * If `usePriority` is false and `useNode` is not set, the node with the lowest load is chosen.
     * @returns {Node} The node to use.
     */
    get useableNode(): Node;
    /**
     * Handles the shutdown of the process by saving all active players' states and optionally cleaning up inactive players.
     * This function is called when the process is about to exit.
     * It iterates through all players and calls {@link savePlayerState} to save their states.
     * Optionally, it also calls {@link cleanupInactivePlayers} to remove any stale player state files.
     * After saving and cleaning up, it exits the process.
     */
    handleShutdown(): Promise<void>;
    /**
     * Parses a YouTube title into a clean title and author.
     * @param title - The original title of the YouTube video.
     * @param originalAuthor - The original author of the YouTube video.
     * @returns An object with the clean title and author.
     */
    private parseYouTubeTitle;
    /**
     * Balances brackets in a given string by ensuring all opened brackets are closed correctly.
     * @param str - The input string that may contain unbalanced brackets.
     * @returns A new string with balanced brackets.
     */
    private balanceBrackets;
    /**
     * Escapes a string by replacing special regex characters with their escaped counterparts.
     * @param string - The string to escape.
     * @returns The escaped string.
     */
    private escapeRegExp;
    /**
     * Checks if the given data is a voice update.
     * @param data The data to check.
     * @returns Whether the data is a voice update
     */
    private isVoiceUpdate;
    /**
     * Determines if the provided update is a valid voice update.
     * A valid update must contain either a token or a session_id.
     *
     * @param update - The voice update data to validate, which can be a VoicePacket, VoiceServer, or VoiceState.
     * @returns {boolean} - True if the update is valid, otherwise false.
     */
    private isValidUpdate;
    /**
     * Handles a voice server update by updating the player's voice state and sending the voice state to the Lavalink node.
     * @param player The player for which the voice state is being updated.
     * @param update The voice server data received from Discord.
     * @returns A promise that resolves when the voice state update is handled.
     * @emits {debug} - Emits a debug message indicating the voice state is being updated.
     */
    private handleVoiceServerUpdate;
    /**
     * Handles a voice state update by updating the player's voice channel and session ID if provided, or by disconnecting and destroying the player if the channel ID is null.
     * @param player The player for which the voice state is being updated.
     * @param update The voice state data received from Discord.
     * @emits {playerMove} - Emits a player move event if the channel ID is provided and the player is currently connected to a different voice channel.
     * @emits {playerDisconnect} - Emits a player disconnect event if the channel ID is null.
     */
    private handleVoiceStateUpdate;
    /**
     * Gets each player's JSON file
     * @param {string} guildId - The guild ID
     * @returns {string} The path to the player's JSON file
     */
    private getPlayerFilePath;
    /**
     * Serializes a Player instance to avoid circular references.
     * @param player The Player instance to serialize
     * @returns The serialized Player instance
     */
    private serializePlayer;
    /**
     * Checks for players that are no longer active and deletes their saved state files.
     * This is done to prevent stale state files from accumulating on the file system.
     */
    private cleanupInactivePlayers;
    /**
     * Returns the nodes that has the least load.
     * The load is calculated by dividing the lavalink load by the number of cores.
     * The result is multiplied by 100 to get a percentage.
     * @returns {Collection<string, Node>}
     */
    private get leastLoadNode();
    /**
     * Returns the nodes that have the least amount of players.
     * Filters out disconnected nodes and sorts the remaining nodes
     * by the number of players in ascending order.
     * @returns {Collection<string, Node>} A collection of nodes sorted by player count.
     */
    private get leastPlayersNode();
    /**
     * Returns a node based on priority.
     * The nodes are sorted by priority in descending order, and then a random number
     * between 0 and 1 is generated. The node that has a cumulative weight greater than or equal to the
     * random number is returned.
     * If no node has a cumulative weight greater than or equal to the random number, the node with the
     * lowest load is returned.
     * @returns {Node} The node to use.
     */
    private get priorityNode();
}
interface Payload {
    /** The OP code */
    op: number;
    d: {
        guild_id: string;
        channel_id: string | null;
        self_mute: boolean;
        self_deaf: boolean;
    };
}
interface ManagerOptions {
    /** Whether players should automatically play the next song. */
    autoPlay?: boolean;
    /** The search platform autoplay should use. Fallback to YouTube if not found.
     * Use enum `SearchPlatform`. */
    autoPlaySearchPlatforms?: AutoPlayPlatform[];
    /** The client ID to use. */
    clientId?: string;
    /** Value to use for the `Client-Name` header. */
    clientName?: string;
    /** The array of shard IDs connected to this manager instance. */
    clusterId?: number;
    /** The default search platform to use.
     * Use enum `SearchPlatform`. */
    defaultSearchPlatform?: SearchPlatform;
    /** The last.fm API key.
     * If you need to create one go here: https://www.last.fm/api/account/create.
     * If you already have one, get it from here: https://www.last.fm/api/accounts. */
    lastFmApiKey: string;
    /** The maximum number of previous tracks to store. */
    maxPreviousTracks?: number;
    /** The array of nodes to connect to. */
    nodes?: NodeOptions[];
    /** A array of plugins to use. */
    plugins?: Plugin[];
    /** Whether the YouTube video titles should be replaced if the Author does not exactly match. */
    replaceYouTubeCredentials?: boolean;
    /** An array of track properties to keep. `track` will always be present. */
    trackPartial?: TrackPartial[];
    /** Use the least amount of players or least load? */
    useNode?: UseNodeOptions.LeastLoad | UseNodeOptions.LeastPlayers;
    /** Use priority mode over least amount of player or load? */
    usePriority?: boolean;
    /**
     * Function to send data to the websocket.
     * @param id The ID of the node to send the data to.
     * @param payload The payload to send.
     */
    send(id: string, payload: Payload): void;
}
declare enum TrackPartial {
    /** The base64 encoded string of the track */
    Track = "track",
    /** The title of the track */
    Title = "title",
    /** The track identifier */
    Identifier = "identifier",
    /** The author of the track */
    Author = "author",
    /** The length of the track in milliseconds */
    Duration = "duration",
    /** The ISRC of the track */
    Isrc = "isrc",
    /** Whether the track is seekable */
    IsSeekable = "isSeekable",
    /** Whether the track is a stream */
    IsStream = "isStream",
    /** The URI of the track */
    Uri = "uri",
    /** The artwork URL of the track */
    ArtworkUrl = "artworkUrl",
    /** The source name of the track */
    SourceName = "sourceName",
    /** The thumbnail of the track */
    ThumbNail = "thumbnail",
    /** The requester of the track */
    Requester = "requester",
    /** The plugin info of the track */
    PluginInfo = "pluginInfo",
    /** The custom data of the track */
    CustomData = "customData"
}
declare enum UseNodeOptions {
    LeastLoad = "leastLoad",
    LeastPlayers = "leastPlayers"
}
type UseNodeOption = keyof typeof UseNodeOptions;
declare enum SearchPlatform {
    AppleMusic = "amsearch",
    Bandcamp = "bcsearch",
    Deezer = "dzsearch",
    Jiosaavn = "jssearch",
    Qobuz = "qbsearch",
    SoundCloud = "scsearch",
    Spotify = "spsearch",
    Tidal = "tdsearch",
    VKMusic = "vksearch",
    YouTube = "ytsearch",
    YouTubeMusic = "ytmsearch"
}
declare enum AutoPlayPlatform {
    Spotify = "spotify",
    Deezer = "deezer",
    SoundCloud = "soundcloud",
    Tidal = "tidal",
    VKMusic = "vkmusic",
    Qobuz = "qobuz",
    YouTube = "youtube"
}
declare enum PlayerStateEventTypes {
    AutoPlayChange = "playerAutoplay",
    ConnectionChange = "playerConnection",
    RepeatChange = "playerRepeat",
    PauseChange = "playerPause",
    QueueChange = "queueChange",
    TrackChange = "trackChange",
    VolumeChange = "volumeChange",
    ChannelChange = "channelChange",
    PlayerCreate = "playerCreate",
    PlayerDestroy = "playerDestroy"
}
interface PlayerStateUpdateEvent {
    changeType: PlayerStateEventTypes;
    details?: AutoplayChangeEvent | ConnectionChangeEvent | RepeatChangeEvent | PauseChangeEvent | QueueChangeEvent | TrackChangeEvent | VolumeChangeEvent | ChannelChangeEvent;
}
interface AutoplayChangeEvent {
    previousAutoplay: boolean;
    currentAutoplay: boolean;
}
interface ConnectionChangeEvent {
    changeType: 'connect' | 'disconnect';
    previousConnection: boolean;
    currentConnection: boolean;
}
interface RepeatChangeEvent {
    changeType: 'dynamic' | 'track' | 'queue' | null;
    previousRepeat: string | null;
    currentRepeat: string | null;
}
interface PauseChangeEvent {
    previousPause: boolean | null;
    currentPause: boolean | null;
}
interface QueueChangeEvent {
    changeType: 'add' | 'remove' | 'clear' | 'shuffle' | 'roundRobin' | 'userBlock' | 'autoPlayAdd';
    tracks?: Track[];
}
interface TrackChangeEvent {
    changeType: 'start' | 'end' | 'previous' | 'timeUpdate' | 'autoPlay';
    track: Track;
    previousTime?: number | null;
    currentTime?: number | null;
}
interface VolumeChangeEvent {
    previousVolume: number | null;
    currentVolume: number | null;
}
interface ChannelChangeEvent {
    changeType: 'text' | 'voice';
    previousChannel: string | null;
    currentChannel: string | null;
}
interface SearchQuery {
    /** The source to search from. */
    source?: SearchPlatform;
    /** The query to search for. */
    query: string;
}
interface LavalinkResponse {
    loadType: LoadTypes;
    data: TrackData[] | PlaylistRawData;
}
interface SearchResult {
    /** The load type of the result. */
    loadType: LoadTypes;
    /** The array of tracks from the result. */
    tracks: Track[];
    /** The playlist info if the load type is 'playlist'. */
    playlist?: PlaylistData;
}
interface PlaylistRawData {
    info: {
        /** The playlist name. */
        name: string;
    };
    /** Addition info provided by plugins. */
    pluginInfo: object;
    /** The tracks of the playlist */
    tracks: TrackData[];
}
interface PlaylistInfoData {
    /** Url to playlist. */
    url: string;
    /** Type is always playlist in that case. */
    type: string;
    /** ArtworkUrl of playlist */
    artworkUrl: string;
    /** Number of total tracks in playlist */
    totalTracks: number;
    /** Author of playlist */
    author: string;
}
interface PlaylistData {
    /** The playlist name. */
    name: string;
    /** Requester of playlist. */
    requester: User | ClientUser;
    /** More playlist information. */
    playlistInfo: PlaylistInfoData[];
    /** The length of the playlist. */
    duration: number;
    /** The songs of the playlist. */
    tracks: Track[];
}
declare enum ManagerEventTypes {
    Debug = "debug",
    NodeCreate = "nodeCreate",
    NodeDestroy = "nodeDestroy",
    NodeConnect = "nodeConnect",
    NodeReconnect = "nodeReconnect",
    NodeDisconnect = "nodeDisconnect",
    NodeError = "nodeError",
    NodeRaw = "nodeRaw",
    PlayerCreate = "playerCreate",
    PlayerDestroy = "playerDestroy",
    PlayerStateUpdate = "playerStateUpdate",
    PlayerMove = "playerMove",
    PlayerDisconnect = "playerDisconnect",
    QueueEnd = "queueEnd",
    SocketClosed = "socketClosed",
    TrackStart = "trackStart",
    TrackEnd = "trackEnd",
    TrackStuck = "trackStuck",
    TrackError = "trackError",
    SegmentsLoaded = "segmentsLoaded",
    SegmentSkipped = "segmentSkipped",
    ChapterStarted = "chapterStarted",
    ChaptersLoaded = "chaptersLoaded"
}
interface ManagerEvents {
    [ManagerEventTypes.Debug]: [info: string];
    [ManagerEventTypes.NodeCreate]: [node: Node];
    [ManagerEventTypes.NodeDestroy]: [node: Node];
    [ManagerEventTypes.NodeConnect]: [node: Node];
    [ManagerEventTypes.NodeReconnect]: [node: Node];
    [ManagerEventTypes.NodeDisconnect]: [node: Node, reason: {
        code?: number;
        reason?: string;
    }];
    [ManagerEventTypes.NodeError]: [node: Node, error: Error];
    [ManagerEventTypes.NodeRaw]: [payload: unknown];
    [ManagerEventTypes.PlayerCreate]: [player: Player];
    [ManagerEventTypes.PlayerDestroy]: [player: Player];
    [ManagerEventTypes.PlayerStateUpdate]: [
        oldPlayer: Player,
        newPlayer: Player,
        changeType: PlayerStateUpdateEvent
    ];
    [ManagerEventTypes.PlayerMove]: [player: Player, initChannel: string, newChannel: string];
    [ManagerEventTypes.PlayerDisconnect]: [player: Player, oldChannel: string];
    [ManagerEventTypes.QueueEnd]: [player: Player, track: Track, payload: TrackEndEvent];
    [ManagerEventTypes.SocketClosed]: [player: Player, payload: WebSocketClosedEvent];
    [ManagerEventTypes.TrackStart]: [player: Player, track: Track, payload: TrackStartEvent];
    [ManagerEventTypes.TrackEnd]: [player: Player, track: Track, payload: TrackEndEvent];
    [ManagerEventTypes.TrackStuck]: [player: Player, track: Track, payload: TrackStuckEvent];
    [ManagerEventTypes.TrackError]: [player: Player, track: Track, payload: TrackExceptionEvent];
    [ManagerEventTypes.SegmentsLoaded]: [
        player: Player,
        track: Track,
        payload: SponsorBlockSegmentsLoaded
    ];
    [ManagerEventTypes.SegmentSkipped]: [
        player: Player,
        track: Track,
        payload: SponsorBlockSegmentSkipped
    ];
    [ManagerEventTypes.ChapterStarted]: [
        player: Player,
        track: Track,
        payload: SponsorBlockChapterStarted
    ];
    [ManagerEventTypes.ChaptersLoaded]: [
        player: Player,
        track: Track,
        payload: SponsorBlockChaptersLoaded
    ];
}

declare class Player {
    options: PlayerOptions;
    /** The Queue for the Player. */
    readonly queue: Queue;
    /** The filters applied to the audio. */
    filters: Filters;
    /** Whether the queue repeats the track. */
    trackRepeat: boolean;
    /** Whether the queue repeats the queue. */
    queueRepeat: boolean;
    /**Whether the queue repeats and shuffles after each song. */
    dynamicRepeat: boolean;
    /** The time the player is in the track. */
    position: number;
    /** Whether the player is playing. */
    playing: boolean;
    /** Whether the player is paused. */
    paused: boolean;
    /** The volume for the player */
    volume: number;
    /** The Node for the Player. */
    node: Node;
    /** The guild ID for the player. */
    guildId: string;
    /** The voice channel for the player. */
    voiceChannelId: string | null;
    /** The text channel for the player. */
    textChannelId: string | null;
    /**The now playing message. */
    nowPlayingMessage?: Message;
    /** The current state of the player. */
    state: StateTypes;
    /** The equalizer bands array. */
    bands: number[];
    /** The voice state object from Discord. */
    voiceState: VoiceState;
    /** The Manager. */
    manager: Manager;
    /** The autoplay state of the player. */
    isAutoplay: boolean;
    /** The number of times to try autoplay before emitting queueEnd. */
    autoplayTries: number | null;
    private static _manager;
    private readonly data;
    private dynamicLoopInterval;
    private dynamicRepeatIntervalMs;
    /**
     * Creates a new player, returns one if it already exists.
     * @param options The player options.
     * @see https://docs.magmastream.com/main/introduction/getting-started
     */
    constructor(options: PlayerOptions);
    /**
     * Set custom data.
     * @param key - The key to set the data for.
     * @param value - The value to set the data to.
     */
    set(key: string, value: unknown): void;
    /**
     * Retrieves custom data associated with a given key.
     * @template T - The expected type of the data.
     * @param {string} key - The key to retrieve the data for.
     * @returns {T} - The data associated with the key, cast to the specified type.
     */
    get<T>(key: string): T;
    /**
     * Initializes the static properties of the Player class.
     * @hidden
     * @param manager The Manager to use.
     */
    static init(manager: Manager): void;
    /**
     * Same as Manager#search() but a shortcut on the player itself.
     * @param query
     * @param requester
     */
    search<T = unknown>(query: string | SearchQuery, requester?: T): Promise<SearchResult>;
    /**
     * Connects the player to the voice channel.
     * @throws {RangeError} If no voice channel has been set.
     * @returns {void}
     */
    connect(): void;
    /**
     * Disconnects the player from the voice channel.
     * @throws {TypeError} If the player is not connected.
     * @returns {this} - The current instance of the Player class for method chaining.
     */
    disconnect(): Promise<this>;
    /**
     * Destroys the player and clears the queue.
     * @param {boolean} disconnect - Whether to disconnect the player from the voice channel.
     * @returns {Promise<boolean>} - Whether the player was successfully destroyed.
     * @emits {PlayerDestroy} - Emitted when the player is destroyed.
     * @emits {PlayerStateUpdate} - Emitted when the player state is updated.
     */
    destroy(disconnect?: boolean): Promise<boolean>;
    /**
     * Sets the player voice channel.
     * @param {string} channel - The new voice channel ID.
     * @returns {this} - The player instance.
     * @throws {TypeError} If the channel parameter is not a string.
     */
    setVoiceChannelId(channel: string): this;
    /**
     * Sets the player text channel.
     *
     * This method updates the text channel associated with the player. It also
     * emits a player state update event indicating the change in the channel.
     *
     * @param {string} channel - The new text channel ID.
     * @returns {this} - The player instance for method chaining.
     * @throws {TypeError} If the channel parameter is not a string.
     */
    setTextChannelId(channel: string): this;
    /**
     * Sets the now playing message.
     *
     * @param message - The message of the now playing message.
     * @returns The now playing message.
     */
    setNowPlayingMessage<T = Message>(message: T): Message;
    /**
     * Plays the next track.
     *
     * If a track is provided, it will be played. Otherwise, the next track in the queue will be played.
     * If the queue is not empty, but the current track has not finished yet, it will be replaced with the provided track.
     *
     * @param {object} [optionsOrTrack] - The track to play or the options to play with.
     * @param {object} [playOptions] - The options to play with.
     *
     * @returns {Promise<void>}
     */
    play(): Promise<Player>;
    play(track: Track): Promise<Player>;
    play(options: PlayOptions): Promise<Player>;
    play(track: Track, options: PlayOptions): Promise<Player>;
    /**
     * Sets the autoplay-state of the player.
     *
     * Autoplay is a feature that makes the player play a recommended
     * track when the current track ends.
     *
     * @param {boolean} autoplayState - Whether or not autoplay should be enabled.
     * @param {object} botUser - The user-object that should be used as the bot-user.
     * @param {number} [tries=3] - The number of times the player should try to find a
     * recommended track if the first one doesn't work.
     * @returns {this} - The player instance.
     */
    setAutoplay<T = unknown>(autoplayState: boolean, botUser?: T, tries?: number): this;
    /**
     * Gets recommended tracks and returns an array of tracks.
     * @param {Track} track - The track to find recommendations for.
     * @returns {Promise<Track[]>} - Array of recommended tracks.
     */
    getRecommendedTracks(track: Track): Promise<Track[]>;
    /**
     * Handles YouTube-based recommendations.
     * @param {Track} track - The track to find recommendations for.
     * @returns {Promise<Track[]>} - Array of recommended tracks.
     */
    private handleYouTubeRecommendations;
    /**
     * Handles Last.fm-based autoplay (or other platforms).
     * @param {Track} track - The track to find recommendations for.
     * @param {SearchPlatform} source - The selected search platform.
     * @param {string} apiKey - The Last.fm API key.
     * @returns {Promise<Track[]>} - Array of recommended tracks.
     */
    private handlePlatformAutoplay;
    /**
     * Sets the volume of the player.
     * @param {number} volume - The new volume. Must be between 0 and 1000.
     * @returns {Promise<Player>} - The updated player.
     * @throws {TypeError} If the volume is not a number.
     * @throws {RangeError} If the volume is not between 0 and 1000.
     * @emits {PlayerStateUpdate} - Emitted when the volume is changed.
     * @example
     * player.setVolume(50);
     */
    setVolume(volume: number): Promise<this>;
    /**
     * Sets the sponsorblock for the player. This will set the sponsorblock segments for the player to the given segments.
     * @param {SponsorBlockSegment[]} segments - The sponsorblock segments to set. Defaults to `[SponsorBlockSegment.Sponsor, SponsorBlockSegment.SelfPromo]` if not provided.
     * @returns {Promise<void>} The promise is resolved when the operation is complete.
     */
    setSponsorBlock(segments?: SponsorBlockSegment[]): Promise<void>;
    /**
     * Gets the sponsorblock for the player.
     * @returns {Promise<SponsorBlockSegment[]>} The sponsorblock segments.
     */
    getSponsorBlock(): Promise<SponsorBlockSegment[]>;
    /**
     * Deletes the sponsorblock for the player. This will remove all sponsorblock segments that have been set for the player.
     * @returns {Promise<void>}
     */
    deleteSponsorBlock(): Promise<void>;
    /**
     * Sets the track repeat mode.
     * When track repeat is enabled, the current track will replay after it ends.
     * Disables queueRepeat and dynamicRepeat modes if enabled.
     *
     * @param repeat - A boolean indicating whether to enable track repeat.
     * @returns {this} - The player instance.
     * @throws {TypeError} If the repeat parameter is not a boolean.
     */
    setTrackRepeat(repeat: boolean): this;
    /**
     * Sets the queue repeat.
     * @param repeat Whether to repeat the queue or not
     * @returns {this} - The player instance.
     * @throws {TypeError} If the repeat parameter is not a boolean
     */
    setQueueRepeat(repeat: boolean): this;
    /**
     * Sets the queue to repeat and shuffles the queue after each song.
     * @param repeat "true" or "false".
     * @param ms After how many milliseconds to trigger dynamic repeat.
     * @returns {this} - The player instance.
     * @throws {TypeError} If the repeat parameter is not a boolean.
     * @throws {RangeError} If the queue size is less than or equal to 1.
     */
    setDynamicRepeat(repeat: boolean, ms: number): this;
    /**
     * Restarts the currently playing track from the beginning.
     * If there is no track playing, it will play the next track in the queue.
     * @returns {Promise<Player>} The current instance of the Player class for method chaining.
     */
    restart(): Promise<Player>;
    /**
     * Stops the player and optionally removes tracks from the queue.
     * @param {number} [amount] The amount of tracks to remove from the queue. If not provided, removes the current track if it exists.
     * @returns {Promise<this>} - The player instance.
     * @throws {RangeError} If the amount is greater than the queue length.
     */
    stop(amount?: number): Promise<this>;
    /**
     * Skips the current track.
     * @returns {this} - The player instance.
     * @throws {Error} If there are no tracks in the queue.
     * @emits {PlayerStateUpdate} - With {@link PlayerStateEventTypes.TrackChange} as the change type.
     */
    pause(pause: boolean): Promise<this>;
    /**
     * Skips to the previous track in the queue.
     * @returns {this} - The player instance.
     * @throws {Error} If there are no previous tracks in the queue.
     * @emits {PlayerStateUpdate} - With {@link PlayerStateEventTypes.TrackChange} as the change type.
     */
    previous(): Promise<this>;
    /**
     * Seeks to a given position in the currently playing track.
     * @param position - The position in milliseconds to seek to.
     * @returns {this} - The player instance.
     * @throws {Error} If the position is invalid.
     * @emits {PlayerStateUpdate} - With {@link PlayerStateEventTypes.TrackChange} as the change type.
     */
    seek(position: number): Promise<this>;
    /**
     * Returns the current repeat state of the player.
     * @param player The player to get the repeat state from.
     * @returns The repeat state of the player, or null if it is not repeating.
     */
    private getRepeatState;
    /**
     * Automatically moves the player to a usable node.
     * @returns {Promise<Player | void>} - The player instance or void if not moved.
     */
    autoMoveNode(): Promise<Player | void>;
    /**
     * Moves the player to another node.
     * @param {string} identifier - The identifier of the node to move to.
     * @returns {Promise<Player>} - The player instance after being moved.
     */
    moveNode(identifier: string): Promise<Player>;
    /**
     * Transfers the player to a new server. If the player already exists on the new server
     * and force is false, this method will return the existing player. Otherwise, a new player
     * will be created and the current player will be destroyed.
     * @param {PlayerOptions} newOptions - The new options for the player.
     * @param {boolean} force - Whether to force the creation of a new player.
     * @returns {Promise<Player>} - The new player instance.
     */
    switchGuild(newOptions: PlayerOptions, force?: boolean): Promise<Player>;
    /**
     * Retrieves the current lyrics for the playing track.
     * @param skipTrackSource - Indicates whether to skip the track source when fetching lyrics.
     * @returns {Promise<Lyrics>} - The lyrics of the current track.
     * @throws {RangeError} - If the 'lavalyrics-plugin' is not available on the Lavalink node.
     */
    getCurrentLyrics(skipTrackSource?: boolean): Promise<Lyrics>;
}
interface PlayerOptions {
    /** The guild ID the Player belongs to. */
    guildId: string;
    /** The text channel the Player belongs to. */
    textChannelId: string;
    /** The voice channel the Player belongs to. */
    voiceChannelId?: string;
    /** The node the Player uses. */
    node?: string;
    /** The initial volume the Player will use. */
    volume?: number;
    /** If the player should mute itself. */
    selfMute?: boolean;
    /** If the player should deaf itself. */
    selfDeafen?: boolean;
}
/** If track partials are set some of these will be `undefined` as they were removed. */
interface Track {
    /** The base64 encoded track. */
    readonly track: string;
    /** The artwork url of the track. */
    readonly artworkUrl: string;
    /** The track source name. */
    readonly sourceName: TrackSourceName;
    /** The title of the track. */
    title: string;
    /** The identifier of the track. */
    readonly identifier: string;
    /** The author of the track. */
    author: string;
    /** The duration of the track. */
    readonly duration: number;
    /** The ISRC of the track. */
    readonly isrc: string;
    /** If the track is seekable. */
    readonly isSeekable: boolean;
    /** If the track is a stream.. */
    readonly isStream: boolean;
    /** The uri of the track. */
    readonly uri: string;
    /** The thumbnail of the track or null if it's a unsupported source. */
    readonly thumbnail: string | null;
    /** The user that requested the track. */
    requester?: User | ClientUser;
    /** Displays the track thumbnail with optional size or null if it's a unsupported source. */
    displayThumbnail(size?: Sizes): string;
    /** Additional track info provided by plugins. */
    pluginInfo: TrackPluginInfo;
    /** Add your own data to the track. */
    customData: Record<string, unknown>;
}
interface TrackPluginInfo {
    albumName?: string;
    albumUrl?: string;
    artistArtworkUrl?: string;
    artistUrl?: string;
    isPreview?: string;
    previewUrl?: string;
}
interface PlayOptions {
    /** The position to start the track. */
    readonly startTime?: number;
    /** The position to end the track. */
    readonly endTime?: number;
    /** Whether to not replace the track if a play payload is sent. */
    readonly noReplace?: boolean;
}
interface EqualizerBand {
    /** The band number being 0 to 14. */
    band: number;
    /** The gain amount being -0.25 to 1.00, 0.25 being double. */
    gain: number;
}

declare class Filters {
    distortion: distortionOptions | null;
    equalizer: Band[];
    karaoke: karaokeOptions | null;
    player: Player;
    rotation: rotationOptions | null;
    timescale: timescaleOptions | null;
    vibrato: vibratoOptions | null;
    reverb: reverbOptions | null;
    volume: number;
    bassBoostlevel: number;
    filtersStatus: Record<AvailableFilters, boolean>;
    constructor(player: Player);
    /**
     * Updates the player's audio filters.
     *
     * This method sends a request to the player's node to update the filter settings
     * based on the current properties of the `Filters` instance. The filters include
     * distortion, equalizer, karaoke, rotation, timescale, vibrato, and volume. Once
     * the request is sent, it ensures that the player's audio output reflects the
     * changes in filter settings.
     *
     * @returns {Promise<this>} - Returns a promise that resolves to the current instance
     * of the Filters class for method chaining.
     */
    updateFilters(): Promise<this>;
    /**
     * Applies a specific filter to the player.
     *
     * This method allows you to set the value of a specific filter property.
     * The filter property must be a valid key of the Filters object.
     *
     * @param {{ property: T; value: Filters[T] }} filter - An object containing the filter property and value.
     * @param {boolean} [updateFilters=true] - Whether to update the filters after applying the filter.
     * @returns {Promise<this>} - Returns the current instance of the Filters class for method chaining.
     */
    private applyFilter;
    /**
     * Sets the status of a specific filter.
     *
     * This method updates the filter status to either true or false, indicating whether
     * the filter is applied or not. This helps track which filters are active.
     *
     * @param {AvailableFilters} filter - The filter to update.
     * @param {boolean} status - The status to set (true for active, false for inactive).
     * @returns {this} - Returns the current instance of the Filters class for method chaining.
     */
    private setFilterStatus;
    /**
     * Retrieves the status of a specific filter.
     *
     * This method returns whether a specific filter is currently applied or not.
     *
     * @param {AvailableFilters} filter - The filter to check.
     * @returns {boolean} - Returns true if the filter is active, false otherwise.
     */
    getFilterStatus(filter: AvailableFilters): boolean;
    /**
     * Clears all filters applied to the audio.
     *
     * This method resets all filter settings to their default values and removes any
     * active filters from the player.
     *
     * @returns {this} - Returns the current instance of the Filters class for method chaining.
     */
    clearFilters(): Promise<this>;
    /**
     * Sets the own equalizer bands on the audio.
     *
     * This method adjusts the equalization curve of the player's audio output,
     * allowing you to control the frequency response.
     *
     * @param {Band[]} [bands] - The equalizer bands to apply (band, gain).
     * @returns {Promise<this>} - Returns the current instance of the Filters class for method chaining.
     */
    setEqualizer(bands?: Band[]): Promise<this>;
    /**
     * Sets the own karaoke options to the audio.
     *
     * This method adjusts the audio so that it sounds like a karaoke song, with the
     * original vocals removed. Note that not all songs can be successfully made into
     * karaoke tracks, and some tracks may not sound as good.
     *
     * @param {karaokeOptions} [karaoke] - The karaoke settings to apply (level, monoLevel, filterBand, filterWidth).
     * @returns {Promise<this>} - Returns the current instance of the Filters class for method chaining.
     */
    setKaraoke(karaoke?: karaokeOptions): Promise<this>;
    /**
     * Sets the own timescale options to the audio.
     *
     * This method adjusts the speed and pitch of the audio, allowing you to control the playback speed.
     *
     * @param {timescaleOptions} [timescale] - The timescale settings to apply (speed and pitch).
     * @returns {Promise<this>} - Returns the current instance of the Filters class for method chaining.
     */
    setTimescale(timescale?: timescaleOptions): Promise<this>;
    /**
     * Sets the own vibrato options to the audio.
     *
     * This method applies a vibrato effect to the audio, which adds a wavering,
     * pulsing quality to the sound. The effect is created by rapidly varying the
     * pitch of the audio.
     *
     * @param {vibratoOptions} [vibrato] - The vibrato settings to apply (frequency, depth).
     * @returns {Promise<this>} - Returns the current instance of the Filters class for method chaining.
     */
    setVibrato(vibrato?: vibratoOptions): Promise<this>;
    /**
     * Sets the own rotation options effect to the audio.
     *
     * This method applies a rotation effect to the audio, which simulates the sound
     * moving around the listener's head. This effect can create a dynamic and immersive
     * audio experience by altering the directionality of the sound.
     *
     * @param {rotationOptions} [rotation] - The rotation settings to apply (rotationHz).
     * @returns {Promise<this>} - Returns the current instance of the Filters class for method chaining.
     */
    setRotation(rotation?: rotationOptions): Promise<this>;
    /**
     * Sets the own distortion options effect to the audio.
     *
     * This method applies a distortion effect to the audio, which adds a rougher,
     * more intense quality to the sound. The effect is created by altering the
     * audio signal to create a more jagged, irregular waveform.
     *
     * @param {distortionOptions} [distortion] - The distortion settings to apply (sinOffset, sinScale, cosOffset, cosScale, tanOffset, tanScale, offset, scale).
     * @returns {Promise<this>} - Returns the current instance of the Filters class for method chaining.
     */
    setDistortion(distortion?: distortionOptions): Promise<this>;
    /**
     * Sets the bass boost level on the audio.
     *
     * This method scales the gain of a predefined equalizer curve to the specified level.
     * The curve is designed to emphasize or reduce low frequencies, creating a bass-heavy
     * or bass-reduced effect.
     *
     * @param {number} level - The level of bass boost to apply. The value ranges from -3 to 3,
     *                         where negative values reduce bass, 0 disables the effect,
     *                         and positive values increase bass.
     * @returns {Promise<this>} - Returns the current instance of the Filters class for method chaining.
     *
     * @example
     * // Apply different levels of bass boost or reduction:
     * await player.bassBoost(3);  // Maximum Bass Boost
     * await player.bassBoost(2);  // Medium Bass Boost
     * await player.bassBoost(1);  // Mild Bass Boost
     * await player.bassBoost(0);  // No Effect (Disabled)
     * await player.bassBoost(-1); // Mild Bass Reduction
     * await player.bassBoost(-2); // Medium Bass Reduction
     * await player.bassBoost(-3); // Maximum Bass Removal
     */
    bassBoost(stage: number): Promise<this>;
    /**
     * Toggles the chipmunk effect on the audio.
     *
     * This method applies or removes a chipmunk effect by adjusting the timescale settings.
     * When enabled, it increases the speed, pitch, and rate of the audio, resulting in a high-pitched, fast playback
     * similar to the sound of a chipmunk.
     *
     * @param {boolean} status - Whether to enable or disable the chipmunk effect.
     * @returns {Promise<this>} - Returns the current instance of the Filters class for method chaining.
     */
    chipmunk(status: boolean): Promise<this>;
    /**
     * Toggles the "China" effect on the audio.
     *
     * This method applies or removes a filter that reduces the pitch of the audio by half,
     * without changing the speed or rate. This creates a "hollow" or "echoey" sound.
     *
     * @param {boolean} status - Whether to enable or disable the "China" effect.
     * @returns {Promise<this>} - Returns the current instance of the Filters class for method chaining.
     */
    china(status: boolean): Promise<this>;
    /**
     * Toggles the 8D audio effect on the audio.
     *
     * This method applies or removes an 8D audio effect by adjusting the rotation settings.
     * When enabled, it creates a sensation of the audio moving around the listener's head,
     * providing an immersive audio experience.
     *
     * @param {boolean} status - Whether to enable or disable the 8D effect.
     * @returns {Promise<this>} - Returns the current instance of the Filters class for method chaining.
     */
    eightD(status: boolean): Promise<this>;
    /**
     * Toggles the nightcore effect on the audio.
     *
     * This method applies or removes a nightcore effect by adjusting the timescale settings.
     * When enabled, it increases the speed and pitch of the audio, giving it a more
     * upbeat and energetic feel.
     *
     * @param {boolean} status - Whether to enable or disable the nightcore effect.
     * @returns {Promise<this>} - Returns the current instance of the Filters class for method chaining.
     */
    nightcore(status: boolean): Promise<this>;
    /**
     * Toggles the slowmo effect on the audio.
     *
     * This method applies or removes a slowmo effect by adjusting the timescale settings.
     * When enabled, it slows down the audio while keeping the pitch the same, giving it
     * a more relaxed and calming feel.
     *
     * @param {boolean} status - Whether to enable or disable the slowmo effect.
     * @returns {Promise<this>} - Returns the current instance of the Filters class for method chaining.
     */
    slowmo(status: boolean): Promise<this>;
    /**
     * Toggles a soft equalizer effect to the audio.
     *
     * This method applies or removes a soft equalizer effect by adjusting the equalizer settings.
     * When enabled, it reduces the bass and treble frequencies, giving the audio a softer and more
     * mellow sound.
     *
     * @param {boolean} status - Whether to enable or disable the soft equalizer effect.
     * @returns {Promise<this>} - Returns the current instance of the Filters class for method chaining.
     */
    soft(status: boolean): Promise<this>;
    /**
     * Toggles the TV equalizer effect on the audio.
     *
     * This method applies or removes a TV equalizer effect by adjusting the equalizer settings.
     * When enabled, it enhances specific frequency bands to mimic the audio characteristics
     * typically found in television audio outputs.
     *
     * @param {boolean} status - Whether to enable or disable the TV equalizer effect.
     * @returns {Promise<this>} - Returns the current instance of the Filters class for method chaining.
     */
    tv(status: boolean): Promise<this>;
    /**
     * Toggles the treble/bass equalizer effect on the audio.
     *
     * This method applies or removes a treble/bass equalizer effect by adjusting the equalizer settings.
     * When enabled, it enhances the treble and bass frequencies, giving the audio a more balanced sound.
     *
     * @param {boolean} status - Whether to enable or disable the treble/bass equalizer effect.
     * @returns {Promise<this>} - Returns the current instance of the Filters class for method chaining.
     */
    trebleBass(status: boolean): Promise<this>;
    /**
     * Toggles the vaporwave effect on the audio.
     *
     * This method applies or removes a vaporwave effect by adjusting the equalizer settings.
     * When enabled, it gives the audio a dreamy and nostalgic feel, characteristic of the vaporwave genre.
     *
     * @param {boolean} status - Whether to enable or disable the vaporwave effect.
     * @returns {Promise<this>} - Returns the current instance of the Filters class for method chaining.
     */
    vaporwave(status: boolean): Promise<this>;
    /**
     * Toggles the distortion effect on the audio.
     *
     * This method applies or removes a distortion effect by adjusting the distortion settings.
     * When enabled, it adds a rougher, more intense quality to the sound by altering the
     * audio signal to create a more jagged, irregular waveform.
     *
     * @param {boolean} status - Whether to enable or disable the distortion effect.
     * @returns {Promise<this>} - Returns the current instance of the Filters class for method chaining.
     */
    distort(status: boolean): Promise<this>;
    /**
     * Toggles the party effect on the audio.
     *
     * This method applies or removes a party effect by adjusting the equalizer settings.
     * When enabled, it enhances the bass and treble frequencies, providing a more energetic and lively sound.
     *
     * @param {boolean} status - Whether to enable or disable the party effect.
     * @returns {Promise<this>} - Returns the current instance of the Filters class for method chaining.
     */
    pop(status: boolean): Promise<this>;
    /**
     * Toggles a party effect on the audio.
     *
     * This method applies a party effect to audio.
     * @param {boolean} status - Whether to enable or disable the party effect.
     * @returns {Promise<this>} - Returns the current instance of the Filters class for method chaining.
     */
    party(status: boolean): Promise<this>;
    /**
     * Toggles earrape effect on the audio.
     *
     * This method applies earrape effect to audio.
     * @param {boolean} status - Whether to enable or disable the earrape effect.
     * @returns {Promise<this>} - Returns the current instance of the Filters class for method chaining.
     */
    earrape(status: boolean): Promise<this>;
    /**
     * Toggles electronic effect on the audio.
     *
     * This method applies electronic effect to audio.
     * @param {boolean} status - Whether to enable or disable the electronic effect.
     * @returns {Promise<this>} - Returns the current instance of the Filters class for method chaining.
     */
    electronic(status: boolean): Promise<this>;
    /**
     * Toggles radio effect on the audio.
     *
     * This method applies radio effect to audio.
     * @param {boolean} status - Whether to enable or disable the radio effect.
     * @returns {Promise<this>} - Returns the current instance of the Filters class for method chaining.
     */
    radio(status: boolean): Promise<this>;
    /**
     * Toggles a tremolo effect on the audio.
     *
     * This method applies a tremolo effect to audio.
     * @param {boolean} status - Whether to enable or disable the tremolo effect.
     * @returns {this} - Returns the current instance of the Filters class for method chaining.
     */
    tremolo(status: boolean): Promise<this>;
    /**
     * Toggless a darthvader effect on the audio.
     *
     * This method applies a darthvader effect to audio.
     * @param {boolean} status - Whether to enable or disable the darthvader effect.
     * @returns {this} - Returns the current instance of the Filters class for method chaining.
     */
    darthvader(status: boolean): Promise<this>;
    /**
     * Toggles a daycore effect on the audio.
     *
     * This method applies a daycore effect to audio.
     * @param {boolean} status - Whether to enable or disable the daycore effect.
     * @returns {this} - Returns the current instance of the Filters class for method chaining.
     */
    daycore(status: boolean): Promise<this>;
    /**
     * Toggles a doubletime effect on the audio.
     *
     * This method applies a doubletime effect to audio.
     * @param {boolean} status - Whether to enable or disable the doubletime effect.
     * @returns {this} - Returns the current instance of the Filters class for method chaining
     */
    doubletime(status: boolean): Promise<this>;
    /**
     * Toggles the demon effect on the audio.
     *
     * This method applies or removes a demon effect by adjusting the equalizer,
     * timescale, and reverb settings. When enabled, it creates a deeper and more
     * intense sound by lowering the pitch and adding reverb to the audio.
     *
     * @param {boolean} status - Whether to enable or disable the demon effect.
     * @returns {Promise<this>} - Returns the current instance of the Filters class for method chaining.
     */
    demon(status: boolean): Promise<this>;
}
/** Options for adjusting the timescale of audio. */
interface timescaleOptions {
    speed?: number;
    pitch?: number;
    rate?: number;
}
/** Options for applying vibrato effect to audio. */
interface vibratoOptions {
    frequency: number;
    depth: number;
}
/** Options for applying rotation effect to audio. */
interface rotationOptions {
    rotationHz: number;
}
/** Options for applying karaoke effect to audio. */
interface karaokeOptions {
    level?: number;
    monoLevel?: number;
    filterBand?: number;
    filterWidth?: number;
}
/** Options for applying distortion effect to audio. */
interface distortionOptions {
    sinOffset?: number;
    sinScale?: number;
    cosOffset?: number;
    cosScale?: number;
    tanOffset?: number;
    tanScale?: number;
    offset?: number;
    scale?: number;
}
/** Options for applying reverb effect to audio. */
interface reverbOptions {
    wet?: number;
    dry?: number;
    roomSize?: number;
    damping?: number;
}
declare enum AvailableFilters {
    BassBoost = "bassboost",
    Distort = "distort",
    SetDistortion = "setDistortion",
    EightD = "eightD",
    SetKaraoke = "setKaraoke",
    Nightcore = "nightcore",
    Slowmo = "slowmo",
    Soft = "soft",
    TrebleBass = "trebleBass",
    SetTimescale = "setTimescale",
    TV = "tv",
    Vibrato = "vibrato",
    Vaporwave = "vaporwave",
    Pop = "pop",
    Party = "party",
    Earrape = "earrape",
    Electronic = "electronic",
    Radio = "radio",
    SetRotation = "setRotation",
    Tremolo = "tremolo",
    China = "china",
    Chipmunk = "chipmunk",
    Darthvader = "darthvader",
    Daycore = "daycore",
    Doubletime = "doubletime",
    Demon = "demon"
}

declare class Plugin {
    name: string;
    /**
     * @param name The name of the plugin
     */
    constructor(name: string);
    load(manager: Manager): void;
}

export { AutoPlayPlatform, AutoPlayUtils, AvailableFilters, type CPUStats, type EqualizerBand, type Exception, type Extendable, Filters, type FrameStats, type LavalinkInfo, type LavalinkResponse, type LoadType, LoadTypes, type Lyrics, type LyricsLine, Manager, ManagerEventTypes, type ManagerEvents, type ManagerOptions, type MemoryStats, Node, type NodeMessage, type NodeOptions, type NodeStats, type Payload, type PlayOptions, Player, type PlayerEvent, type PlayerEventType, type PlayerEvents, type PlayerOptions, PlayerStateEventTypes, type PlayerUpdate, type PlaylistData, type PlaylistInfoData, type PlaylistRawData, Plugin, Queue, Rest, SearchPlatform, type SearchQuery, type SearchResult, type Severity, SeverityTypes, type Sizes, type SponsorBlockChapterStarted, type SponsorBlockChaptersLoaded, SponsorBlockSegment, type SponsorBlockSegmentEventType, type SponsorBlockSegmentEvents, type SponsorBlockSegmentSkipped, type SponsorBlockSegmentsLoaded, type State, StateTypes, Structure, type Track, type TrackData, type TrackDataInfo, type TrackEndEvent, type TrackEndReason, TrackEndReasonTypes, type TrackExceptionEvent, TrackPartial, type TrackPluginInfo, type TrackSourceName, TrackSourceTypes, type TrackStartEvent, type TrackStuckEvent, TrackUtils, type UseNodeOption, UseNodeOptions, type VoicePacket, type VoiceServer, type VoiceState, type WebSocketClosedEvent };
