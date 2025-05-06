"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Plugin = void 0;
class Plugin {
    name;
    /**
     * @param name The name of the plugin
     */
    constructor(name) {
        this.name = name;
    }
    load(manager) { }
}
exports.Plugin = Plugin;
