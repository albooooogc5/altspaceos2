"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const assert = require("assert");
const MRE = __importStar(require("@microsoft/mixed-reality-extension-sdk"));
const lodash_1 = require("lodash");
const timer_1 = require("./timer");
const cuadroTexto_1 = require("./cuadroTexto");
const playing_media_1 = require("./playing-media");
const parameter_set_util_1 = require("./parameter-set-util");
;
;
/**
 * The main class of this app. All the logic goes here.
 */
class AlarmTimer {
    constructor(context, params, baseUrl) {
        this.context = context;
        this.params = params;
        this.baseUrl = baseUrl;
        this.rootActor = undefined;
        this.timer = undefined;
        this.cuadroTexto = undefined;
        this.colaiderApple = undefined;
        this.userTrackers = new Map();
        this.buttonDefaultLocalTransform = {
            x: 0, y: 0, z: -0.2
        };
        this.alarmSound = undefined;
        this.maxVolume = 0;
        this.volumeIncrementPercent = 0.0;
        //Cuadro de texto
        this.text = null;
        this.cube = null;
        this.arrow = null;
        this.getAudioOptions = (params) => {
            const volume = lodash_1.clamp(parseFloat(parameter_set_util_1.getParameterLastValue(params, 'v', '50')), 0, this.maxVolume) / this.maxVolume;
            const looping = parameter_set_util_1.getBooleanOption(params, 'l', false);
            let options = { volume: volume, looping: looping };
            const ambient = parameter_set_util_1.getBooleanOption(params, 'am', false);
            if (ambient) {
                options.doppler = 0;
                options.spread = 0;
                options.rolloffStartDistance = 100;
            }
            options.time = 0;
            return options;
        };
        this.createButtonTimer = (config, position, actorProperties) => {
            const buttonTimer = MRE.Actor.Create(this.context, {
                actor: Object.assign({
                    name: `button${position}`,
                    parentId: this.rootActor.id,
                    appearance: { meshId: this.buttonSquareTimer.id },
                    transform: {
                        app: {
                            position: Object.assign({}, this.buttonDefaultLocalTransform, { x: position * 0.3 - 0.5 }, { y: 6.5 }),
                        }
                    }
                }, actorProperties),
            });
            buttonTimer.setCollider(MRE.ColliderType.Box, true);
            MRE.Actor.Create(this.context, {
                actor: {
                    name: `button${position}Caption`,
                    parentId: buttonTimer.id,
                    text: Object.assign({}, this.commonTextProperties, {
                        contents: config.caption,
                        height: 0.2
                    }),
                    transform: {
                        local: {
                            position: Object.assign({}, this.buttonDefaultLocalTransform, { x: 0, y: 0 }),
                            rotation: MRE.Quaternion.FromEulerAngles(0, 0, Math.PI * config.rotationDeg / 180.0)
                        }
                    }
                }
            });
            const buttonBehaviorTimer = buttonTimer.setBehavior(MRE.ButtonBehavior);
            buttonBehaviorTimer.onClick(config.clickHandler);
            return buttonTimer;
        };
        this.setTimerText = (value) => {
            this.timerContent.forEach((tc) => {
                tc.text.contents = value;
            });
        };
        this.startSound = () => {
            if (this.soundPlaying.isLoaded) {
                if (this.pauseOnly) {
                    this.soundPlaying.resume();
                    return;
                }
                else {
                    this.soundPlaying.stop();
                }
            }
            assert(!this.soundPlaying.isLoaded);
            if (this.alarmSound != undefined) {
                const playOptions = Object.assign({ time: 0 }, this.audioOptions);
                this.soundPlaying = new playing_media_1.PlayingMedia(this.rootActor.startSound(this.alarmSound.id, playOptions), playOptions);
            }
            return;
        };
        this.initialTimerCount = parseInt(parameter_set_util_1.getParameterLastValue(params, 'c', '10'));
        this.increment = parseInt(parameter_set_util_1.getParameterLastValue(params, 'i', '60'));
        this.viewableByModsOnly = parameter_set_util_1.getBooleanOption(params, 'mo', false);
        this.alarmSoundPath = parameter_set_util_1.getParameterLastValue(params, 'as', 'Pitido.ogg');
        this.pauseOnly = parameter_set_util_1.getBooleanOption(params, 'p', false);
        this.audioOptions = this.getAudioOptions(params);
        this.soundPlaying = new playing_media_1.PlayingMedia();
        this.assets = new MRE.AssetContainer(this.context);
        this.context.onStarted(() => this.started());
        this.context.onUserJoined(user => this.onUserJoined(user));
        // Initialize assets
        this.buttonSquareTimer = this.assets.createBoxMesh('buttonSquareTimer', 0.25, 0.25, 0.1);
        this.commonTextProperties = {
            justify: MRE.TextJustify.Center,
            font: MRE.TextFontFamily.SansSerif,
            anchor: MRE.TextAnchorLocation.MiddleCenter,
            color: MRE.Color3.FromInts(30, 30, 30)
        };
    }
    get setToInitial() {
        return this.increment == 0;
    }
    /**
     * Once the context is "started", initialize the app.
     */
    async started() {
        this.rootActor = MRE.Actor.Create(this.context, {
            actor: {
                name: 'Root Actor',
            }
        });
        this.context.onUserJoined((user) => this.userJoined(user));
        this.context.onUserLeft((user) => this.userLeft(user));
        let alarmSoundUri = decodeURIComponent(this.alarmSoundPath);
        if (!alarmSoundUri.startsWith("http://") && !alarmSoundUri.startsWith("https://")) {
            alarmSoundUri = `${this.baseUrl}/${this.alarmSoundPath}`;
        }
        this.alarmSound = this.assets.createSound('alarmSound', { uri: alarmSoundUri });
        this.cuadroTexto = new cuadroTexto_1.CuadroTexto(this.context);
        this.timer = new timer_1.Timer(this.initialTimerCount, (value) => {
            this.setTimerText(value);
        }, this.startSound);
        //Start Collider door
        await this.createColaiderApple();
        //Start Timer
        await this.createBody();
        //Start Cuadro Texto
        //await this.createCuadroTexto();
        //await this.createCuadroTexto2(new MRE.Vector3 (-24, 7, 18));
        //await this.createCuadroTexto2(new MRE.Vector3 (-24.05, 7, -9.2));
        //await this.createCuadroTexto2(new MRE.Vector3 (29, 7, 18));
        //await this.createCuadroTexto2(new MRE.Vector3 (29, 7, -9.5));
        //Start Watch
        await this.createWatch();
        if (!this.viewableByModsOnly) {
        }
    }
    async onUserJoined(user) {
        await this.createWatch(user.id);
        await this.createColaiderApple();
        if (this.viewableByModsOnly) {
            const isModerator = user.properties["altspacevr-roles"].toLowerCase().includes("moderator");
            if (isModerator) {
            }
        }
        return;
    }
    async createWatch(exclusiveToUser = undefined) {
        const textTimerRectangleWatch = this.assets.createBoxMesh('textTimerRectangleWatch', 0.1, 0.1, 0.1);
        this.materialTimer = this.assets.createMaterial("materialTimer", {
            color: new MRE.Color4(0, 0, 0, 0),
            alphaMode: MRE.AlphaMode.Blend
        });
        let timerWatch = MRE.Actor.Create(this.context, {
            actor: {
                attachment: {
                    attachPoint: 'left-hand',
                    userId: exclusiveToUser,
                },
                name: 'timerWatch',
                parentId: this.rootActor.id,
                exclusiveToUser: exclusiveToUser,
                appearance: { meshId: textTimerRectangleWatch.id,
                    materialId: this.materialTimer.id },
                transform: {
                    app: {
                        position: { x: 0, y: 0.08, z: 0 },
                    }
                }
            }
        });
        timerWatch.setCollider(MRE.ColliderType.Box, true);
        MRE.Actor.Create(this.context, {
            actor: {
                name: 'timerContent',
                parentId: timerWatch.id,
                text: Object.assign({}, this.commonTextProperties, {
                    contents: 'Timer',
                    height: 0.05,
                    color: { r: 0 / 255, g: 109 / 255, b: 255 / 255 },
                    scale: { x: 0.1, y: 0.1, z: 0.1 },
                }),
                transform: {
                    local: {
                        position: { x: 0, y: 0, z: -timerWatch.transform.app.position.z }
                    }
                }
            }
        });
    }
    async createBody(exclusiveToUser = undefined) {
        const textTimerRectangle = this.assets.createBoxMesh('textTimerRectangle', 5, 1, 0.20);
        this.materialTimer = this.assets.createMaterial("materialTimer", {
            color: new MRE.Color4(1, 1, 1, 1),
            alphaMode: MRE.AlphaMode.Blend
        });
        let timerBody = MRE.Actor.Create(this.context, {
            actor: {
                attachment: {
                    userId: exclusiveToUser,
                },
                name: 'timerBody',
                parentId: this.rootActor.id,
                exclusiveToUser: exclusiveToUser,
                appearance: {
                    meshId: textTimerRectangle.id,
                    materialId: this.materialTimer.id
                },
                transform: {
                    app: {
                        position: { x: 0, y: 0, z: -this.buttonDefaultLocalTransform.z },
                        rotation: { x: Math.PI * 0 / 180.0, y: Math.PI * -45 / 180.0, z: Math.PI * 0 / 180.0 },
                    }
                }
            }
        });
        timerBody.setCollider(MRE.ColliderType.Box, true);
        MRE.Actor.Create(this.context, {
            actor: {
                name: 'timerContent',
                parentId: timerBody.id,
                text: Object.assign({}, this.commonTextProperties, {
                    contents: 'Timer',
                    height: 0.3
                }),
                transform: {
                    local: {
                        position: { x: 0, y: 0, z: -timerBody.transform.app.position.z }
                        //rotation: {x: Math.PI * 0 / 180.0, y: Math.PI * -45 / 180.0, z: Math.PI * 0 / 180.0},
                    }
                }
            }
        });
        /*const buttonConfigsTimer: Array<buttonConfigTimer> = [
            {
                caption: ">",
                rotationDeg: 0,
                //clickHandler: this.startSound
                clickHandler: () => {
                    //this.soundPlaying.changeVolume(this.volumeIncrementPercent);
                    this.timer?.playValue();
                }
            }, {
                caption: "=",
                rotationDeg: 90,
                //clickHandler: this.stopSound
                clickHandler: () => {
                    //this.soundPlaying.changeVolume(this.volumeIncrementPercent);
                    this.timer?.pauseValue();
                }

            }, {
                caption:  "↺",
                rotationDeg: 0,
                clickHandler: () => {
                    //this.soundPlaying.changeVolume(this.volumeIncrementPercent);
                    this.timer?.resetValue();
                }
            },
        ];
        for (let i = 0; i < buttonConfigsTimer.length; i++) {
            this.createButtonTimer(
                buttonConfigsTimer[i],
                i,
                { exclusiveToUser: exclusiveToUser });
        }*/
        return;
    }
    get timerContent() {
        var _a;
        return ((_a = this.rootActor) === null || _a === void 0 ? void 0 : _a.findChildrenByName("timerContent", true)) || [];
    }
    async createCuadroTexto2(position) {
        this.text = MRE.Actor.Create(this.context, {
            actor: {
                name: 'Text',
                appearance: { enabled: true },
                transform: {
                    local: { position: { x: position.x, y: position.y, z: position.z } }
                },
                text: {
                    contents: "",
                    anchor: MRE.TextAnchorLocation.MiddleCenter,
                    color: { r: 204 / 255, g: 204 / 255, b: 0 / 255 },
                    height: 0.5
                }
            }
        });
        const spinAnimData = this.assets.createAnimationData("Spin", {
            tracks: [{
                    target: MRE.ActorPath("text").transform.local.rotation,
                    keyframes: this.generateSpinKeyframes2(20, MRE.Vector3.Up()),
                    easing: MRE.AnimationEaseCurves.Linear
                }]
        });
        spinAnimData.bind({ text: this.text }, { isPlaying: true, wrapMode: MRE.AnimationWrapMode.PingPong });
        const cubeData = await this.assets.loadGltf('flecha.glb', "box");
        this.cube = MRE.Actor.CreateFromPrefab(this.context, {
            firstPrefabFrom: cubeData,
            actor: {
                name: 'Altspace Trofeo',
                parentId: this.text.id,
                transform: {
                    local: {
                        position: { x: 0, y: 0, z: 0 },
                        scale: { x: 1, y: 1, z: 1 }
                    }
                }
            }
        });
    }
    ;
    async createColaiderApple() {
        this.triggerVolume = MRE.Actor.CreatePrimitive(this.assets, {
            definition: { shape: MRE.PrimitiveShape.Box },
            actor: {
                transform: {
                    local: {
                        position: { x: 36, y: 4, z: -5 },
                        scale: { x: 2, y: 7, z: 4 }
                    }
                },
                appearance: { enabled: false }
            },
            addCollider: true
        });
        this.triggerVolume.collider.isTrigger = true;
        //this.triggerVolume.collider.onTrigger('trigger-enter', (actor) => this.arrow.appearance.enabled = true);
        this.triggerVolume.collider.onTrigger('trigger-enter', (user) => { var _a; return (_a = this.timer) === null || _a === void 0 ? void 0 : _a.playValue(); });
    }
    ;
    async userJoined(user) {
        await this.createColaiderApple();
        const tracker = MRE.Actor.CreatePrimitive(this.assets, {
            // Make the attachment a small box.
            definition: {
                shape: MRE.PrimitiveShape.Box,
                dimensions: { x: 0.1, y: 0.1, z: 0.1 }
            },
            actor: {
                attachment: {
                    attachPoint: 'center-eye',
                    userId: user.id
                },
                appearance: { enabled: false },
                subscriptions: ['transform'],
            },
            addCollider: true
        });
        this.userTrackers.set(user.id, tracker);
    }
    userLeft(user) {
        //================================
        // If the user has a tracker, delete it.
        //================================
        if (this.userTrackers.has(user.id)) {
            const tracker = this.userTrackers.get(user.id);
            tracker.detach();
            tracker.destroy();
            // Remove the entry from the map.
            this.userTrackers.delete(user.id);
        }
    }
    /**
 * Generate keyframe data for a simple spin animation.
 * @param duration The length of time in seconds it takes to complete a full revolution.
 * @param axis The axis of rotation in local space.
 */
    generateSpinKeyframes(duration, axis) {
        return [{
                time: 0 * duration,
                value: MRE.Quaternion.RotationAxis(axis, 0)
            }, {
                time: 0.25 * duration,
                value: MRE.Quaternion.RotationAxis(axis, Math.PI / 4)
            },];
    }
    generateSpinKeyframes2(duration, axis) {
        return [{
                time: 0 * duration,
                value: MRE.Quaternion.RotationAxis(axis, 0)
            }, {
                time: 0.25 * duration,
                value: MRE.Quaternion.RotationAxis(axis, Math.PI / 2)
            }, {
                time: 0.5 * duration,
                value: MRE.Quaternion.RotationAxis(axis, Math.PI)
            }, {
                time: 0.75 * duration,
                value: MRE.Quaternion.RotationAxis(axis, 3 * Math.PI / 2)
            }, {
                time: 1 * duration,
                value: MRE.Quaternion.RotationAxis(axis, 2 * Math.PI)
            }];
    }
}
exports.default = AlarmTimer;
//# sourceMappingURL=app.js.map