"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rest = void 0;
const tslib_1 = require("tslib");
const axios_1 = tslib_1.__importDefault(require("axios"));
const Manager_1 = require("./Manager");
/** Handles the requests sent to the Lavalink REST API. */
class Rest {
    /** The Node that this Rest instance is connected to. */
    node;
    /** The ID of the current session. */
    sessionId;
    /** The password for the Node. */
    password;
    /** The URL of the Node. */
    url;
    /** The Manager instance. */
    manager;
    constructor(node, manager) {
        this.node = node;
        this.url = `http${node.options.secure ? "s" : ""}://${node.options.host}:${node.options.port}`;
        this.sessionId = node.sessionId;
        this.password = node.options.password;
        this.manager = manager;
    }
    /**
     * Sets the session ID.
     * This method is used to set the session ID after a resume operation is done.
     * @param {string} sessionId The session ID to set.
     * @returns {string} Returns the set session ID.
     */
    setSessionId(sessionId) {
        this.sessionId = sessionId;
        return this.sessionId;
    }
    /**
     * Retrieves all the players that are currently running on the node.
     * @returns {Promise<unknown>} Returns the result of the GET request.
     */
    async getAllPlayers() {
        // Send a GET request to the Lavalink Node to retrieve all the players.
        const result = await this.get(`/v4/sessions/${this.sessionId}/players`);
        // Log the result of the request.
        this.manager.emit(Manager_1.ManagerEventTypes.Debug, `[REST] Getting all players on node: ${this.node.options.identifier} : ${JSON.stringify(result)}`);
        // Return the result of the request.
        return result;
    }
    /**
     * Sends a PATCH request to update player related data.
     * @param {playOptions} options The options to update the player with.
     * @returns {Promise<unknown>} Returns the result of the PATCH request.
     */
    async updatePlayer(options) {
        // Log the request.
        this.manager.emit(Manager_1.ManagerEventTypes.Debug, `[REST] Updating player: ${options.guildId}: ${JSON.stringify(options)}`);
        // Send the PATCH request.
        return await this.patch(`/v4/sessions/${this.sessionId}/players/${options.guildId}?noReplace=false`, options.data);
    }
    /**
     * Sends a DELETE request to the server to destroy the player.
     * @param {string} guildId The guild ID of the player to destroy.
     * @returns {Promise<unknown>} Returns the result of the DELETE request.
     */
    async destroyPlayer(guildId) {
        // Log the request.
        this.manager.emit(Manager_1.ManagerEventTypes.Debug, `[REST] Destroying player: ${guildId}`);
        // Send the DELETE request.
        return await this.delete(`/v4/sessions/${this.sessionId}/players/${guildId}`);
    }
    /**
     * Updates the session status for resuming.
     * This method sends a PATCH request to update the session's resuming status and timeout.
     *
     * @param {boolean} resuming - Indicates whether the session should be set to resuming.
     * @param {number} timeout - The timeout duration for the session resume.
     * @returns {Promise<unknown>} The result of the PATCH request.
     */
    async updateSession(resuming, timeout) {
        // Emit a debug event with information about the session being updated
        this.manager.emit(Manager_1.ManagerEventTypes.Debug, `[REST] Updating session: ${this.sessionId}`);
        // Send a PATCH request to update the session with the provided resuming status and timeout
        return await this.patch(`/v4/sessions/${this.sessionId}`, { resuming, timeout });
    }
    /**
     * Sends a request to the specified endpoint and returns the response data.
     * @param {string} method The HTTP method to use for the request.
     * @param {string} endpoint The endpoint to send the request to.
     * @param {unknown} [body] The data to send in the request body.
     * @returns {Promise<unknown>} The response data of the request.
     */
    async request(method, endpoint, body) {
        this.manager.emit(Manager_1.ManagerEventTypes.Debug, `[REST] ${method} api call for endpoint: ${endpoint} with data: ${JSON.stringify(body)}`);
        const config = {
            method,
            url: this.url + endpoint,
            headers: {
                "Content-Type": "application/json",
                Authorization: this.password,
            },
            data: body,
        };
        try {
            const response = await (0, axios_1.default)(config);
            return response.data;
        }
        catch (error) {
            if (!error.response) {
                console.error("No response from node:", error.message);
                return null;
            }
            if (error.response.data?.message === "Guild not found") {
                return [];
            }
            else if (error.response.status === 404) {
                await this.node.destroy();
                this.node.manager.createNode(this.node.options).connect();
            }
            return null;
        }
    }
    /**
     * Sends a GET request to the specified endpoint and returns the response data.
     * @param {string} endpoint The endpoint to send the GET request to.
     * @returns {Promise<unknown>} The response data of the GET request.
     */
    async get(endpoint) {
        // Send a GET request to the specified endpoint and return the response data.
        return await this.request("GET", endpoint);
    }
    /**
     * Sends a PATCH request to the specified endpoint and returns the response data.
     * @param {string} endpoint The endpoint to send the PATCH request to.
     * @param {unknown} body The data to send in the request body.
     * @returns {Promise<unknown>} The response data of the PATCH request.
     */
    async patch(endpoint, body) {
        // Send a PATCH request to the specified endpoint and return the response data.
        return await this.request("PATCH", endpoint, body);
    }
    /**
     * Sends a POST request to the specified endpoint and returns the response data.
     * @param {string} endpoint The endpoint to send the POST request to.
     * @param {unknown} body The data to send in the request body.
     * @returns {Promise<unknown>} The response data of the POST request.
     */
    async post(endpoint, body) {
        return await this.request("POST", endpoint, body);
    }
    /**
     * Sends a PUT request to the specified endpoint and returns the response data.
     * @param {string} endpoint The endpoint to send the PUT request to.
     * @param {unknown} body The data to send in the request body.
     * @returns {Promise<unknown>} The response data of the PUT request.
     */
    async put(endpoint, body) {
        // Send a PUT request to the specified endpoint and return the response data.
        return await this.request("PUT", endpoint, body);
    }
    /**
     * Sends a DELETE request to the specified endpoint.
     * @param {string} endpoint - The endpoint to send the DELETE request to.
     * @returns {Promise<unknown>} The response data of the DELETE request.
     */
    async delete(endpoint) {
        // Send a DELETE request using the request method and return the response data.
        return await this.request("DELETE", endpoint);
    }
}
exports.Rest = Rest;
