"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlayingMedia = void 0;
const mixed_reality_extension_sdk_1 = require("@microsoft/mixed-reality-extension-sdk");
const lodash_1 = require("lodash");
// A class acting as a delegate to the SDK's MediaInstance class,
// and tracks the options specified to it, simplifying some of the logic.
class PlayingMedia {
    constructor(mediaInstance, initialOptions) {
        this.mediaInstance = mediaInstance;
        // Delegate the methods of MediaInstance to the MediaInstance object
        this.setState = (options) => {
            var _a;
            (_a = this.mediaInstance) === null || _a === void 0 ? void 0 : _a.setState(options);
            this.updateOptions(options);
        };
        this.pause = () => {
            var _a;
            (_a = this.mediaInstance) === null || _a === void 0 ? void 0 : _a.pause();
            this.updateOptions({ paused: true });
        };
        this.resume = () => {
            var _a;
            (_a = this.mediaInstance) === null || _a === void 0 ? void 0 : _a.resume();
            this.updateOptions({ paused: false });
        };
        this.stop = () => {
            var _a, _b;
            (_a = this.mediaInstance) === null || _a === void 0 ? void 0 : _a.pause();
            (_b = this.mediaInstance) === null || _b === void 0 ? void 0 : _b.stop();
            this.mediaInstance = undefined;
            this.lastSetOptions = {};
        };
        // Utility functions to manage specific options
        // Change the paused volume by a given percentage, taking care
        // to remain inside the allowed volume range
        this.changeVolume = (byPercent) => {
            const currentVolume = this.currentVolume;
            if (currentVolume != undefined) {
                const amplificationFactor = (100 + byPercent) / 100.0;
                const newVolume = lodash_1.clamp(currentVolume * amplificationFactor, 0, 1);
                mixed_reality_extension_sdk_1.log.debug("Set volume to:", newVolume);
                this.setState({ volume: newVolume });
            }
            return;
        };
        this.updateOptions = (newOptions) => {
            Object.assign(this.lastSetOptions, newOptions);
        };
        this.lastSetOptions = initialOptions || {};
    }
    // Properties for inquiring current state
    get isLoaded() {
        return this.mediaInstance != undefined;
    }
    get isPaused() {
        return this.lastSetOptions.paused || false;
    }
    // Current volume on a scale of 0 to 1, or undefined if not set.
    get currentVolume() {
        return this.lastSetOptions.volume;
    }
}
exports.PlayingMedia = PlayingMedia;
//# sourceMappingURL=playing-media.js.map