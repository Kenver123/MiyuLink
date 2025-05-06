"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ManagerEventTypes = exports.PlayerStateEventTypes = exports.AutoPlayPlatform = exports.SearchPlatform = exports.UseNodeOptions = exports.TrackPartial = exports.Manager = void 0;
const tslib_1 = require("tslib");
const Utils_1 = require("./Utils");
const collection_1 = require("@discordjs/collection");
const events_1 = require("events");
const __1 = require("..");
const managerCheck_1 = tslib_1.__importDefault(require("../utils/managerCheck"));
const blockedWords_1 = require("../config/blockedWords");
const promises_1 = tslib_1.__importDefault(require("fs/promises"));
const path_1 = tslib_1.__importDefault(require("path"));
/**
 * The main hub for interacting with Lavalink and using Magmastream,
 */
class Manager extends events_1.EventEmitter {
    /** The map of players. */
    players = new collection_1.Collection();
    /** The map of nodes. */
    nodes = new collection_1.Collection();
    /** The options that were set. */
    options;
    initiated = false;
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
    constructor(options) {
        super();
        (0, managerCheck_1.default)(options);
        Utils_1.Structure.get('Player').init(this);
        Utils_1.Structure.get('Node').init(this);
        Utils_1.TrackUtils.init(this);
        Utils_1.AutoPlayUtils.init(this);
        if (options.trackPartial) {
            Utils_1.TrackUtils.setTrackPartial(options.trackPartial);
            delete options.trackPartial;
        }
        this.options = {
            plugins: [],
            nodes: [
                {
                    identifier: 'default',
                    host: 'localhost',
                    resumeStatus: false,
                    resumeTimeout: 1000,
                },
            ],
            autoPlay: true,
            usePriority: false,
            clientName: 'Magmastream',
            defaultSearchPlatform: SearchPlatform.YouTube,
            useNode: UseNodeOptions.LeastPlayers,
            maxPreviousTracks: options.maxPreviousTracks ?? 20,
            ...options,
        };
        if (this.options.nodes) {
            for (const nodeOptions of this.options.nodes)
                new (Utils_1.Structure.get('Node'))(nodeOptions);
        }
        process.on('SIGINT', async () => {
            console.warn('\x1b[33mSIGINT received! Graceful shutdown initiated...\x1b[0m');
            try {
                await this.handleShutdown();
                console.warn('\x1b[32mShutdown complete. Waiting for Node.js event loop to empty...\x1b[0m');
                // Prevent forced exit by Windows
                setTimeout(() => {
                    process.exit(0);
                }, 2000);
            }
            catch (error) {
                console.error('Error during shutdown:', error);
                process.exit(1);
            }
        });
        process.on('SIGTERM', async () => {
            console.warn('\x1b[33mSIGTERM received! Graceful shutdown initiated...\x1b[0m');
            try {
                await this.handleShutdown();
                console.warn('\x1b[32mShutdown complete. Exiting now...\x1b[0m');
                process.exit(0);
            }
            catch (error) {
                console.error('Error during SIGTERM shutdown:', error);
                process.exit(1);
            }
        });
    }
    /**
     * Initiates the Manager.
     * @param clientId - The Discord client ID (required).
     * @param clusterId - The cluster ID which runs the current process (required).
     * @returns The manager instance.
     */
    init(clientId, clusterId = 0) {
        if (this.initiated) {
            return this;
        }
        if (typeof clientId !== 'string' || !/^\d+$/.test(clientId)) {
            throw new Error('"clientId" must be a valid Discord client ID.');
        }
        this.options.clientId = clientId;
        if (typeof clusterId !== 'number') {
            console.warn('"clusterId" is not a valid number, defaulting to 0.');
            clusterId = 0;
        }
        this.options.clusterId = clusterId;
        for (const node of this.nodes.values()) {
            try {
                node.connect(); // Connect the node
            }
            catch (err) {
                this.emit(ManagerEventTypes.NodeError, node, err);
            }
        }
        if (this.options.plugins) {
            for (const [index, plugin] of this.options.plugins.entries()) {
                if (!(plugin instanceof __1.Plugin))
                    throw new RangeError(`Plugin at index ${index} does not extend Plugin.`);
                plugin.load(this);
            }
        }
        this.initiated = true;
        return this;
    }
    /**
     * Searches the enabled sources based off the URL or the `source` property.
     * @param query
     * @param requester
     * @returns The search result.
     */
    async search(query, requester) {
        const node = this.useableNode;
        if (!node)
            throw new Error('No available nodes.');
        const _query = typeof query === 'string' ? { query } : query;
        const _source = _query.source ?? this.options.defaultSearchPlatform;
        let search = /^https?:\/\//.test(_query.query) ? _query.query : `${_source}:${_query.query}`;
        this.emit(ManagerEventTypes.Debug, `[MANAGER] Performing ${_source} search for: ${_query.query}`);
        try {
            const res = (await node.rest.get(`/v4/loadtracks?identifier=${encodeURIComponent(search)}`));
            if (!res)
                throw new Error('Query not found.');
            let tracks = [];
            let playlist = null;
            switch (res.loadType) {
                case Utils_1.LoadTypes.Search:
                    tracks = res.data.map((track) => Utils_1.TrackUtils.build(track, requester));
                    break;
                case Utils_1.LoadTypes.Track:
                    tracks = [Utils_1.TrackUtils.build(res.data, requester)];
                    break;
                case Utils_1.LoadTypes.Playlist: {
                    const playlistData = res.data;
                    tracks = playlistData.tracks.map((track) => Utils_1.TrackUtils.build(track, requester));
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
            if (this.options.replaceYouTubeCredentials) {
                const processTrack = (track) => {
                    if (!/(youtube\.com|youtu\.be)/.test(track.uri))
                        return track;
                    const { cleanTitle, cleanAuthor } = this.parseYouTubeTitle(track.title, track.author);
                    track.title = cleanTitle;
                    track.author = cleanAuthor;
                    return track;
                };
                if (playlist) {
                    playlist.tracks = playlist.tracks.map(processTrack);
                }
                else {
                    tracks = tracks.map(processTrack);
                }
            }
            const result = { loadType: res.loadType, tracks, playlist };
            this.emit(ManagerEventTypes.Debug, `[MANAGER] Result ${_source} search for: ${_query.query}: ${JSON.stringify(result)}`);
            return result;
        }
        catch (err) {
            throw new Error(`An error occurred while searching: ${err}`);
        }
    }
    /**
     * Creates a player or returns one if it already exists.
     * @param options The options to create the player with.
     * @returns The created player.
     */
    create(options) {
        if (this.players.has(options.guildId)) {
            return this.players.get(options.guildId);
        }
        // Create a new player with the given options
        this.emit(ManagerEventTypes.Debug, `[MANAGER] Creating new player with options: ${JSON.stringify(options)}`);
        return new (Utils_1.Structure.get('Player'))(options);
    }
    /**
     * Returns a player or undefined if it does not exist.
     * @param guildId The guild ID of the player to retrieve.
     * @returns The player if it exists, undefined otherwise.
     */
    get(guildId) {
        return this.players.get(guildId);
    }
    /**
     * Destroys a player.
     * @param guildId The guild ID of the player to destroy.
     * @returns A promise that resolves when the player has been destroyed.
     */
    async destroy(guildId) {
        // Emit debug message for player destruction
        this.emit(ManagerEventTypes.Debug, `[MANAGER] Destroying player: ${guildId}`);
        // Remove the player from the manager's collection
        this.players.delete(guildId);
        // Clean up any inactive players
        await this.cleanupInactivePlayers();
    }
    /**
     * Creates a new node or returns an existing one if it already exists.
     * @param options - The options to create the node with.
     * @returns The created node.
     */
    createNode(options) {
        // Check if the node already exists in the manager's collection
        if (this.nodes.has(options.identifier || options.host)) {
            // Return the existing node if it does
            return this.nodes.get(options.identifier || options.host);
        }
        // Emit a debug event for node creation
        this.emit(ManagerEventTypes.Debug, `[MANAGER] Creating new node with options: ${JSON.stringify(options)}`);
        // Create a new node with the given options
        return new (Utils_1.Structure.get('Node'))(options);
    }
    /**
     * Destroys a node if it exists. Emits a debug event if the node is found and destroyed.
     * @param identifier - The identifier of the node to destroy.
     * @returns {void}
     * @emits {debug} - Emits a debug message indicating the node is being destroyed.
     */
    async destroyNode(identifier) {
        const node = this.nodes.get(identifier);
        if (!node)
            return;
        this.emit(ManagerEventTypes.Debug, `[MANAGER] Destroying node: ${identifier}`);
        await node.destroy();
        this.nodes.delete(identifier);
    }
    /**
     * Attaches an event listener to the manager.
     * @param event The event to listen for.
     * @param listener The function to call when the event is emitted.
     * @returns The manager instance for chaining.
     */
    on(event, listener) {
        return super.on(event, listener);
    }
    /**
     * Updates the voice state of a player based on the provided data.
     * @param data - The data containing voice state information, which can be a VoicePacket, VoiceServer, or VoiceState.
     * @returns A promise that resolves when the voice state update is handled.
     * @emits {debug} - Emits a debug message indicating the voice state is being updated.
     */
    async updateVoiceState(data) {
        if (!this.isVoiceUpdate(data))
            return;
        const update = 'd' in data ? data.d : data;
        if (!this.isValidUpdate(update))
            return;
        const player = this.players.get(update.guild_id);
        if (!player)
            return;
        this.emit(ManagerEventTypes.Debug, `[MANAGER] Updating voice state: ${JSON.stringify(update)}`);
        if ('token' in update) {
            return await this.handleVoiceServerUpdate(player, update);
        }
        if (update.user_id !== this.options.clientId)
            return;
        if (!player.voiceState.sessionId && player.voiceState.event) {
            if (player.state !== Utils_1.StateTypes.Disconnected) {
                await player.destroy();
            }
            return;
        }
        return await this.handleVoiceStateUpdate(player, update);
    }
    /**
     * Decodes an array of base64 encoded tracks and returns an array of TrackData.
     * Emits a debug event with the tracks being decoded.
     * @param tracks - An array of base64 encoded track strings.
     * @returns A promise that resolves to an array of TrackData objects.
     * @throws Will throw an error if no nodes are available or if the API request fails.
     */
    decodeTracks(tracks) {
        this.emit(ManagerEventTypes.Debug, `[MANAGER] Decoding tracks: ${JSON.stringify(tracks)}`);
        return new Promise(async (resolve, reject) => {
            const node = this.nodes.first();
            if (!node)
                throw new Error('No available nodes.');
            const res = (await node.rest
                .post('/v4/decodetracks', JSON.stringify(tracks))
                .catch((err) => reject(err)));
            if (!res) {
                return reject(new Error('No data returned from query.'));
            }
            return resolve(res);
        });
    }
    /**
     * Decodes a base64 encoded track and returns a TrackData.
     * @param track - The base64 encoded track string.
     * @returns A promise that resolves to a TrackData object.
     * @throws Will throw an error if no nodes are available or if the API request fails.
     */
    async decodeTrack(track) {
        const res = await this.decodeTracks([track]);
        // Since we're only decoding one track, we can just return the first element of the array
        return res[0];
    }
    /**
     * Saves player states to the JSON file.
     * @param {string} guildId - The guild ID of the player to save
     */
    async savePlayerState(guildId) {
        try {
            const playerStateFilePath = await this.getPlayerFilePath(guildId);
            const player = this.players.get(guildId);
            if (!player || player.state === Utils_1.StateTypes.Disconnected || !player.voiceChannelId) {
                console.warn(`Skipping save for inactive player: ${guildId}`);
                return;
            }
            const serializedPlayer = this.serializePlayer(player);
            await promises_1.default.writeFile(playerStateFilePath, JSON.stringify(serializedPlayer, null, 2), 'utf-8');
            this.emit(ManagerEventTypes.Debug, `[MANAGER] Player state saved: ${guildId}`);
        }
        catch (error) {
            console.error(`Error saving player state for guild ${guildId}:`, error);
        }
    }
    async sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
    /**
     * Loads player states from the JSON file.
     * @param nodeId The ID of the node to load player states from.
     * @returns A promise that resolves when the player states have been loaded.
     */
    async loadPlayerStates(nodeId) {
        this.emit(ManagerEventTypes.Debug, '[MANAGER] Loading saved players.');
        const node = this.nodes.get(nodeId);
        if (!node)
            throw new Error(`Could not find node: ${nodeId}`);
        const info = (await node.rest.getAllPlayers());
        const playerStatesDir = path_1.default.join(process.cwd(), 'magmastream', 'dist', 'sessionData', 'players');
        try {
            // Check if the directory exists, and create it if it doesn't
            await promises_1.default.access(playerStatesDir).catch(async () => {
                await promises_1.default.mkdir(playerStatesDir, { recursive: true });
                this.emit(ManagerEventTypes.Debug, `[MANAGER] Created directory: ${playerStatesDir}`);
            });
            // Read the contents of the directory
            const playerFiles = await promises_1.default.readdir(playerStatesDir);
            // Process each file in the directory
            for (const file of playerFiles) {
                const filePath = path_1.default.join(playerStatesDir, file);
                try {
                    // Check if the file exists (though readdir should only return valid files)
                    await promises_1.default.access(filePath);
                    // Read the file asynchronously
                    const data = await promises_1.default.readFile(filePath, 'utf-8');
                    const state = JSON.parse(data);
                    if (state &&
                        typeof state === 'object' &&
                        state.guildId &&
                        state.node.options.identifier === nodeId) {
                        const lavaPlayer = info.find((player) => player.guildId === state.guildId);
                        if (!lavaPlayer) {
                            await this.destroy(state.guildId);
                        }
                        const playerOptions = {
                            guildId: state.options.guildId,
                            textChannelId: state.options.textChannelId,
                            voiceChannelId: state.options.voiceChannelId,
                            selfDeafen: state.options.selfDeafen,
                            volume: lavaPlayer.volume || state.options.volume,
                        };
                        this.emit(ManagerEventTypes.Debug, `[MANAGER] Recreating player: ${state.guildId} from saved file: ${JSON.stringify(state.options)}`);
                        const player = this.create(playerOptions);
                        await player.node.rest.updatePlayer({
                            guildId: state.options.guildId,
                            data: {
                                voice: {
                                    token: state.voiceState.event.token,
                                    endpoint: state.voiceState.event.endpoint,
                                    sessionId: state.voiceState.sessionId,
                                },
                            },
                        });
                        player.connect();
                        const tracks = [];
                        const currentTrack = state.queue.current;
                        const queueTracks = state.queue.tracks;
                        if (lavaPlayer) {
                            if (lavaPlayer.track) {
                                tracks.push(...queueTracks);
                                if (currentTrack && currentTrack.uri === lavaPlayer.track.info.uri) {
                                    player.queue.current = Utils_1.TrackUtils.build(lavaPlayer.track, currentTrack.requester);
                                }
                            }
                            else {
                                if (!currentTrack) {
                                    const payload = {
                                        reason: Utils_1.TrackEndReasonTypes.Finished,
                                    };
                                    await node.queueEnd(player, currentTrack, payload);
                                }
                                else {
                                    tracks.push(currentTrack, ...queueTracks);
                                }
                            }
                        }
                        else {
                            if (!currentTrack) {
                                const payload = {
                                    reason: Utils_1.TrackEndReasonTypes.Finished,
                                };
                                await node.queueEnd(player, currentTrack, payload);
                            }
                            else {
                                tracks.push(currentTrack, ...queueTracks);
                            }
                        }
                        if (tracks.length > 0) {
                            player.queue.add(tracks);
                        }
                        if (state.queue.previous.length > 0) {
                            player.queue.previous = state.queue.previous;
                        }
                        else {
                            player.queue.previous = [];
                        }
                        if (state.paused) {
                            await player.pause(true);
                        }
                        else {
                            player.paused = false;
                            player.playing = true;
                        }
                        if (state.trackRepeat)
                            player.setTrackRepeat(true);
                        if (state.queueRepeat)
                            player.setQueueRepeat(true);
                        if (state.dynamicRepeat) {
                            player.setDynamicRepeat(state.dynamicRepeat, state.dynamicLoopInterval._idleTimeout);
                        }
                        if (state.isAutoplay) {
                            Object.setPrototypeOf(state.data.clientUser, { constructor: { name: 'User' } });
                            player.setAutoplay(true, state.data.clientUser, state.autoplayTries);
                        }
                        if (state.data) {
                            for (const [name, value] of Object.entries(state.data)) {
                                player.set(name, value);
                            }
                        }
                        const filterActions = {
                            bassboost: () => player.filters.bassBoost(state.filters.bassBoostlevel),
                            distort: (enabled) => player.filters.distort(enabled),
                            setDistortion: () => player.filters.setDistortion(state.filters.distortion),
                            eightD: (enabled) => player.filters.eightD(enabled),
                            setKaraoke: () => player.filters.setKaraoke(state.filters.karaoke),
                            nightcore: (enabled) => player.filters.nightcore(enabled),
                            slowmo: (enabled) => player.filters.slowmo(enabled),
                            soft: (enabled) => player.filters.soft(enabled),
                            trebleBass: (enabled) => player.filters.trebleBass(enabled),
                            setTimescale: () => player.filters.setTimescale(state.filters.timescale),
                            tv: (enabled) => player.filters.tv(enabled),
                            vibrato: () => player.filters.setVibrato(state.filters.vibrato),
                            vaporwave: (enabled) => player.filters.vaporwave(enabled),
                            pop: (enabled) => player.filters.pop(enabled),
                            party: (enabled) => player.filters.party(enabled),
                            earrape: (enabled) => player.filters.earrape(enabled),
                            electronic: (enabled) => player.filters.electronic(enabled),
                            radio: (enabled) => player.filters.radio(enabled),
                            setRotation: () => player.filters.setRotation(state.filters.rotation),
                            tremolo: (enabled) => player.filters.tremolo(enabled),
                            china: (enabled) => player.filters.china(enabled),
                            chipmunk: (enabled) => player.filters.chipmunk(enabled),
                            darthvader: (enabled) => player.filters.darthvader(enabled),
                            daycore: (enabled) => player.filters.daycore(enabled),
                            doubletime: (enabled) => player.filters.doubletime(enabled),
                            demon: (enabled) => player.filters.demon(enabled),
                        };
                        // Iterate through filterStatus and apply the enabled filters
                        for (const [filter, isEnabled] of Object.entries(state.filters.filterStatus)) {
                            if (isEnabled && filterActions[filter]) {
                                filterActions[filter](true);
                            }
                        }
                        this.sleep(2000);
                    }
                }
                catch (error) {
                    this.emit(ManagerEventTypes.Debug, `[MANAGER] Error processing file ${filePath}: ${error}`);
                    continue; // Skip to the next file if there's an error
                }
            }
            // Delete all files inside playerStatesDir where nodeId matches
            for (const file of playerFiles) {
                const filePath = path_1.default.join(playerStatesDir, file);
                try {
                    await promises_1.default.access(filePath); // Check if the file exists
                    const data = await promises_1.default.readFile(filePath, 'utf-8');
                    const state = JSON.parse(data);
                    if (state && typeof state === 'object' && state.node.options.identifier === nodeId) {
                        await promises_1.default.unlink(filePath); // Delete the file asynchronously
                        this.emit(ManagerEventTypes.Debug, `[MANAGER] Deleted player state file: ${filePath}`);
                    }
                }
                catch (error) {
                    this.emit(ManagerEventTypes.Debug, `[MANAGER] Error deleting file ${filePath}: ${error}`);
                    continue; // Skip to the next file if there's an error
                }
            }
        }
        catch (error) {
            this.emit(ManagerEventTypes.Debug, `[MANAGER] Error loading player states: ${error}`);
        }
        this.emit(ManagerEventTypes.Debug, '[MANAGER] Finished loading saved players.');
    }
    /**
     * Returns the node to use based on the configured `useNode` and `usePriority` options.
     * If `usePriority` is true, the node is chosen based on priority, otherwise it is chosen based on the `useNode` option.
     * If `useNode` is "leastLoad", the node with the lowest load is chosen, if it is "leastPlayers", the node with the fewest players is chosen.
     * If `usePriority` is false and `useNode` is not set, the node with the lowest load is chosen.
     * @returns {Node} The node to use.
     */
    get useableNode() {
        return this.options.usePriority
            ? this.priorityNode
            : this.options.useNode === UseNodeOptions.LeastLoad
                ? this.leastLoadNode.first()
                : this.leastPlayersNode.first();
    }
    /**
     * Handles the shutdown of the process by saving all active players' states and optionally cleaning up inactive players.
     * This function is called when the process is about to exit.
     * It iterates through all players and calls {@link savePlayerState} to save their states.
     * Optionally, it also calls {@link cleanupInactivePlayers} to remove any stale player state files.
     * After saving and cleaning up, it exits the process.
     */
    async handleShutdown() {
        console.warn('\x1b[31m%s\x1b[0m', 'MAGMASTREAM WARNING: Shutting down! Please wait, saving active players...');
        try {
            const savePromises = Array.from(this.players.keys()).map(async (guildId) => {
                try {
                    await this.savePlayerState(guildId);
                }
                catch (error) {
                    console.error(`Error saving player state for guild ${guildId}:`, error);
                }
            });
            await Promise.allSettled(savePromises);
            await this.cleanupInactivePlayers();
            setTimeout(() => {
                console.warn('\x1b[32m%s\x1b[0m', 'MAGMASTREAM INFO: Shutting down complete, exiting...');
                process.exit(0);
            }, 500);
        }
        catch (error) {
            console.error('Unexpected error during shutdown:', error);
            process.exit(1);
        }
    }
    /**
     * Parses a YouTube title into a clean title and author.
     * @param title - The original title of the YouTube video.
     * @param originalAuthor - The original author of the YouTube video.
     * @returns An object with the clean title and author.
     */
    parseYouTubeTitle(title, originalAuthor) {
        // Remove "- Topic" from author and "Topic -" from title
        const cleanAuthor = originalAuthor.replace('- Topic', '').trim();
        title = title.replace('Topic -', '').trim();
        // Remove blocked words and phrases
        const escapedBlockedWords = blockedWords_1.blockedWords.map((word) => this.escapeRegExp(word));
        const blockedWordsPattern = new RegExp(`\\b(${escapedBlockedWords.join('|')})\\b`, 'gi');
        title = title.replace(blockedWordsPattern, '').trim();
        // Remove empty brackets and balance remaining brackets
        title = title
            .replace(/[([{]\s*[)\]}]/g, '') // Empty brackets
            .replace(/^[^\w\d]*|[^\w\d]*$/g, '') // Leading/trailing non-word characters
            .replace(/\s{2,}/g, ' ') // Multiple spaces
            .trim();
        // Remove '@' symbol before usernames
        title = title.replace(/@(\w+)/g, '$1');
        // Balance remaining brackets
        title = this.balanceBrackets(title);
        // Check if the title contains a hyphen, indicating potential "Artist - Title" format
        if (title.includes(' - ')) {
            const [artist, songTitle] = title.split(' - ').map((part) => part.trim());
            // If the artist part matches or is included in the clean author, use the clean author
            if (artist.toLowerCase() === cleanAuthor.toLowerCase() ||
                cleanAuthor.toLowerCase().includes(artist.toLowerCase())) {
                return { cleanAuthor, cleanTitle: songTitle };
            }
            // If the artist is different, keep both parts
            return { cleanAuthor: artist, cleanTitle: songTitle };
        }
        // If no clear artist-title separation, return clean author and cleaned title
        return { cleanAuthor, cleanTitle: title };
    }
    /**
     * Balances brackets in a given string by ensuring all opened brackets are closed correctly.
     * @param str - The input string that may contain unbalanced brackets.
     * @returns A new string with balanced brackets.
     */
    balanceBrackets(str) {
        const stack = [];
        const openBrackets = '([{';
        const closeBrackets = ')]}';
        let result = '';
        // Iterate over each character in the string
        for (const char of str) {
            // If the character is an open bracket, push it onto the stack and add to result
            if (openBrackets.includes(char)) {
                stack.push(char);
                result += char;
            }
            // If the character is a close bracket, check if it balances with the last open bracket
            else if (closeBrackets.includes(char)) {
                if (stack.length > 0 &&
                    openBrackets.indexOf(stack[stack.length - 1]) === closeBrackets.indexOf(char)) {
                    stack.pop();
                    result += char;
                }
            }
            // If it's neither, just add the character to the result
            else {
                result += char;
            }
        }
        // Close any remaining open brackets by adding the corresponding close brackets
        while (stack.length > 0) {
            const lastOpen = stack.pop();
            result += closeBrackets[openBrackets.indexOf(lastOpen)];
        }
        return result;
    }
    /**
     * Escapes a string by replacing special regex characters with their escaped counterparts.
     * @param string - The string to escape.
     * @returns The escaped string.
     */
    escapeRegExp(string) {
        // Replace special regex characters with their escaped counterparts
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
    /**
     * Checks if the given data is a voice update.
     * @param data The data to check.
     * @returns Whether the data is a voice update
     */
    isVoiceUpdate(data) {
        return 't' in data && ['VOICE_STATE_UPDATE', 'VOICE_SERVER_UPDATE'].includes(data.t);
    }
    /**
     * Determines if the provided update is a valid voice update.
     * A valid update must contain either a token or a session_id.
     *
     * @param update - The voice update data to validate, which can be a VoicePacket, VoiceServer, or VoiceState.
     * @returns {boolean} - True if the update is valid, otherwise false.
     */
    isValidUpdate(update) {
        return update && ('token' in update || 'session_id' in update);
    }
    /**
     * Handles a voice server update by updating the player's voice state and sending the voice state to the Lavalink node.
     * @param player The player for which the voice state is being updated.
     * @param update The voice server data received from Discord.
     * @returns A promise that resolves when the voice state update is handled.
     * @emits {debug} - Emits a debug message indicating the voice state is being updated.
     */
    async handleVoiceServerUpdate(player, update) {
        player.voiceState.event = update;
        const { sessionId, event: { token, endpoint }, } = player.voiceState;
        await player.node.rest.updatePlayer({
            guildId: player.guildId,
            data: { voice: { token, endpoint, sessionId } },
        });
        return;
    }
    /**
     * Handles a voice state update by updating the player's voice channel and session ID if provided, or by disconnecting and destroying the player if the channel ID is null.
     * @param player The player for which the voice state is being updated.
     * @param update The voice state data received from Discord.
     * @emits {playerMove} - Emits a player move event if the channel ID is provided and the player is currently connected to a different voice channel.
     * @emits {playerDisconnect} - Emits a player disconnect event if the channel ID is null.
     */
    async handleVoiceStateUpdate(player, update) {
        if (update.channel_id) {
            if (player.voiceChannelId !== update.channel_id) {
                this.emit(ManagerEventTypes.PlayerMove, player, player.voiceChannelId, update.channel_id);
            }
            player.voiceState.sessionId = update.session_id;
            player.voiceChannelId = update.channel_id;
            return;
        }
        this.emit(ManagerEventTypes.PlayerDisconnect, player, player.voiceChannelId);
        player.voiceChannelId = null;
        player.voiceState = Object.assign({});
        await player.destroy();
        return;
    }
    /**
     * Gets each player's JSON file
     * @param {string} guildId - The guild ID
     * @returns {string} The path to the player's JSON file
     */
    async getPlayerFilePath(guildId) {
        const configDir = path_1.default.join(process.cwd(), 'magmastream', 'dist', 'sessionData', 'players');
        try {
            await promises_1.default.mkdir(configDir, { recursive: true });
            return path_1.default.join(configDir, `${guildId}.json`);
        }
        catch (err) {
            console.error('Error ensuring player data directory exists:', err);
            throw new Error(`Failed to resolve player file path for guild ${guildId}`);
        }
    }
    /**
     * Serializes a Player instance to avoid circular references.
     * @param player The Player instance to serialize
     * @returns The serialized Player instance
     */
    serializePlayer(player) {
        const seen = new WeakSet();
        /**
         * Recursively serializes an object, avoiding circular references.
         * @param obj The object to serialize
         * @returns The serialized object
         */
        const serialize = (obj) => {
            if (obj && typeof obj === 'object') {
                if (seen.has(obj))
                    return;
                seen.add(obj);
            }
            return obj;
        };
        return JSON.parse(JSON.stringify(player, (key, value) => {
            if (key === 'manager') {
                return null;
            }
            if (key === 'filters') {
                return {
                    distortion: value.distortion ?? null,
                    equalizer: value.equalizer ?? [],
                    karaoke: value.karaoke ?? null,
                    rotation: value.rotation ?? null,
                    timescale: value.timescale ?? null,
                    vibrato: value.vibrato ?? null,
                    reverb: value.reverb ?? null,
                    volume: value.volume ?? 1.0,
                    bassBoostlevel: value.bassBoostlevel ?? null,
                    filterStatus: { ...value.filtersStatus },
                };
            }
            if (key === 'queue') {
                return {
                    current: value.current || null,
                    tracks: [...value],
                    previous: [...value.previous],
                };
            }
            if (key === 'data') {
                return {
                    clientUser: value.Internal_BotUser ?? null,
                };
            }
            return serialize(value);
        }));
    }
    /**
     * Checks for players that are no longer active and deletes their saved state files.
     * This is done to prevent stale state files from accumulating on the file system.
     */
    async cleanupInactivePlayers() {
        const playerStatesDir = path_1.default.join(process.cwd(), 'magmastream', 'dist', 'sessionData', 'players');
        try {
            // Check if the directory exists, and create it if it doesn't
            await promises_1.default.access(playerStatesDir).catch(async () => {
                await promises_1.default.mkdir(playerStatesDir, { recursive: true });
                this.emit(ManagerEventTypes.Debug, `[MANAGER] Created directory: ${playerStatesDir}`);
            });
            // Get the list of player state files
            const playerFiles = await promises_1.default.readdir(playerStatesDir);
            // Get the set of active guild IDs from the manager's player collection
            const activeGuildIds = new Set(this.players.keys());
            // Iterate over the player state files
            for (const file of playerFiles) {
                // Get the guild ID from the file name
                const guildId = path_1.default.basename(file, '.json');
                // If the guild ID is not in the set of active guild IDs, delete the file
                if (!activeGuildIds.has(guildId)) {
                    const filePath = path_1.default.join(playerStatesDir, file);
                    await promises_1.default.unlink(filePath); // Delete the file asynchronously
                    this.emit(ManagerEventTypes.Debug, `[MANAGER] Deleting inactive player: ${guildId}`);
                }
            }
        }
        catch (error) {
            this.emit(ManagerEventTypes.Debug, `[MANAGER] Error cleaning up inactive players: ${error}`);
        }
    }
    /**
     * Returns the nodes that has the least load.
     * The load is calculated by dividing the lavalink load by the number of cores.
     * The result is multiplied by 100 to get a percentage.
     * @returns {Collection<string, Node>}
     */
    get leastLoadNode() {
        return this.nodes
            .filter((node) => node.connected)
            .sort((a, b) => {
            const aload = a.stats.cpu ? (a.stats.cpu.lavalinkLoad / a.stats.cpu.cores) * 100 : 0;
            const bload = b.stats.cpu ? (b.stats.cpu.lavalinkLoad / b.stats.cpu.cores) * 100 : 0;
            // Sort the nodes by their load in ascending order
            return aload - bload;
        });
    }
    /**
     * Returns the nodes that have the least amount of players.
     * Filters out disconnected nodes and sorts the remaining nodes
     * by the number of players in ascending order.
     * @returns {Collection<string, Node>} A collection of nodes sorted by player count.
     */
    get leastPlayersNode() {
        return this.nodes
            .filter((node) => node.connected) // Filter out nodes that are not connected
            .sort((a, b) => a.stats.players - b.stats.players); // Sort by the number of players
    }
    /**
     * Returns a node based on priority.
     * The nodes are sorted by priority in descending order, and then a random number
     * between 0 and 1 is generated. The node that has a cumulative weight greater than or equal to the
     * random number is returned.
     * If no node has a cumulative weight greater than or equal to the random number, the node with the
     * lowest load is returned.
     * @returns {Node} The node to use.
     */
    get priorityNode() {
        // Filter out nodes that are not connected or have a priority of 0
        const filteredNodes = this.nodes.filter((node) => node.connected && node.options.priority > 0);
        // Calculate the total weight
        const totalWeight = filteredNodes.reduce((total, node) => total + node.options.priority, 0);
        // Map the nodes to their weights
        const weightedNodes = filteredNodes.map((node) => ({
            node,
            weight: node.options.priority / totalWeight,
        }));
        // Generate a random number between 0 and 1
        const randomNumber = Math.random();
        // Initialize the cumulative weight to 0
        let cumulativeWeight = 0;
        // Loop through the weighted nodes and find the first node that has a cumulative weight greater than or equal to the random number
        for (const { node, weight } of weightedNodes) {
            cumulativeWeight += weight;
            if (randomNumber <= cumulativeWeight) {
                return node;
            }
        }
        // If no node has a cumulative weight greater than or equal to the random number, return the node with the lowest load
        return this.options.useNode === UseNodeOptions.LeastLoad
            ? this.leastLoadNode.first()
            : this.leastPlayersNode.first();
    }
}
exports.Manager = Manager;
var TrackPartial;
(function (TrackPartial) {
    /** The base64 encoded string of the track */
    TrackPartial["Track"] = "track";
    /** The title of the track */
    TrackPartial["Title"] = "title";
    /** The track identifier */
    TrackPartial["Identifier"] = "identifier";
    /** The author of the track */
    TrackPartial["Author"] = "author";
    /** The length of the track in milliseconds */
    TrackPartial["Duration"] = "duration";
    /** The ISRC of the track */
    TrackPartial["Isrc"] = "isrc";
    /** Whether the track is seekable */
    TrackPartial["IsSeekable"] = "isSeekable";
    /** Whether the track is a stream */
    TrackPartial["IsStream"] = "isStream";
    /** The URI of the track */
    TrackPartial["Uri"] = "uri";
    /** The artwork URL of the track */
    TrackPartial["ArtworkUrl"] = "artworkUrl";
    /** The source name of the track */
    TrackPartial["SourceName"] = "sourceName";
    /** The thumbnail of the track */
    TrackPartial["ThumbNail"] = "thumbnail";
    /** The requester of the track */
    TrackPartial["Requester"] = "requester";
    /** The plugin info of the track */
    TrackPartial["PluginInfo"] = "pluginInfo";
    /** The custom data of the track */
    TrackPartial["CustomData"] = "customData";
})(TrackPartial || (exports.TrackPartial = TrackPartial = {}));
var UseNodeOptions;
(function (UseNodeOptions) {
    UseNodeOptions["LeastLoad"] = "leastLoad";
    UseNodeOptions["LeastPlayers"] = "leastPlayers";
})(UseNodeOptions || (exports.UseNodeOptions = UseNodeOptions = {}));
var SearchPlatform;
(function (SearchPlatform) {
    SearchPlatform["AppleMusic"] = "amsearch";
    SearchPlatform["Bandcamp"] = "bcsearch";
    SearchPlatform["Deezer"] = "dzsearch";
    SearchPlatform["Jiosaavn"] = "jssearch";
    SearchPlatform["Qobuz"] = "qbsearch";
    SearchPlatform["SoundCloud"] = "scsearch";
    SearchPlatform["Spotify"] = "spsearch";
    SearchPlatform["Tidal"] = "tdsearch";
    SearchPlatform["VKMusic"] = "vksearch";
    SearchPlatform["YouTube"] = "ytsearch";
    SearchPlatform["YouTubeMusic"] = "ytmsearch";
})(SearchPlatform || (exports.SearchPlatform = SearchPlatform = {}));
var AutoPlayPlatform;
(function (AutoPlayPlatform) {
    AutoPlayPlatform["Spotify"] = "spotify";
    AutoPlayPlatform["Deezer"] = "deezer";
    AutoPlayPlatform["SoundCloud"] = "soundcloud";
    AutoPlayPlatform["Tidal"] = "tidal";
    AutoPlayPlatform["VKMusic"] = "vkmusic";
    AutoPlayPlatform["Qobuz"] = "qobuz";
    AutoPlayPlatform["YouTube"] = "youtube";
})(AutoPlayPlatform || (exports.AutoPlayPlatform = AutoPlayPlatform = {}));
var PlayerStateEventTypes;
(function (PlayerStateEventTypes) {
    PlayerStateEventTypes["AutoPlayChange"] = "playerAutoplay";
    PlayerStateEventTypes["ConnectionChange"] = "playerConnection";
    PlayerStateEventTypes["RepeatChange"] = "playerRepeat";
    PlayerStateEventTypes["PauseChange"] = "playerPause";
    PlayerStateEventTypes["QueueChange"] = "queueChange";
    PlayerStateEventTypes["TrackChange"] = "trackChange";
    PlayerStateEventTypes["VolumeChange"] = "volumeChange";
    PlayerStateEventTypes["ChannelChange"] = "channelChange";
    PlayerStateEventTypes["PlayerCreate"] = "playerCreate";
    PlayerStateEventTypes["PlayerDestroy"] = "playerDestroy";
})(PlayerStateEventTypes || (exports.PlayerStateEventTypes = PlayerStateEventTypes = {}));
var ManagerEventTypes;
(function (ManagerEventTypes) {
    ManagerEventTypes["Debug"] = "debug";
    ManagerEventTypes["NodeCreate"] = "nodeCreate";
    ManagerEventTypes["NodeDestroy"] = "nodeDestroy";
    ManagerEventTypes["NodeConnect"] = "nodeConnect";
    ManagerEventTypes["NodeReconnect"] = "nodeReconnect";
    ManagerEventTypes["NodeDisconnect"] = "nodeDisconnect";
    ManagerEventTypes["NodeError"] = "nodeError";
    ManagerEventTypes["NodeRaw"] = "nodeRaw";
    ManagerEventTypes["PlayerCreate"] = "playerCreate";
    ManagerEventTypes["PlayerDestroy"] = "playerDestroy";
    ManagerEventTypes["PlayerStateUpdate"] = "playerStateUpdate";
    ManagerEventTypes["PlayerMove"] = "playerMove";
    ManagerEventTypes["PlayerDisconnect"] = "playerDisconnect";
    ManagerEventTypes["QueueEnd"] = "queueEnd";
    ManagerEventTypes["SocketClosed"] = "socketClosed";
    ManagerEventTypes["TrackStart"] = "trackStart";
    ManagerEventTypes["TrackEnd"] = "trackEnd";
    ManagerEventTypes["TrackStuck"] = "trackStuck";
    ManagerEventTypes["TrackError"] = "trackError";
    ManagerEventTypes["SegmentsLoaded"] = "segmentsLoaded";
    ManagerEventTypes["SegmentSkipped"] = "segmentSkipped";
    ManagerEventTypes["ChapterStarted"] = "chapterStarted";
    ManagerEventTypes["ChaptersLoaded"] = "chaptersLoaded";
})(ManagerEventTypes || (exports.ManagerEventTypes = ManagerEventTypes = {}));
