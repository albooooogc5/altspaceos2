import assert = require("assert");
import * as MRE from '@microsoft/mixed-reality-extension-sdk';
import { clamp } from 'lodash';
import { Timer } from './timer'
import { CuadroTexto } from './cuadroTexto'
import { PlayingMedia } from './playing-media'
import { getParameterLastValue, getBooleanOption } from './parameter-set-util'
import { Colaider } from "./pruebasColaider";
import { Actor, User, Vector3 } from "@microsoft/mixed-reality-extension-sdk";


interface buttonConfigTimer {
	caption: string,
	rotationDeg: number,
	clickHandler: () => void
};

interface buttonConfigCounter {
	caption: string,
	rotationDeg: number,
	clickHandler: () => void
};

/**
 * The main class of this app. All the logic goes here.
 */
export default class AlarmTimer {
	private rootActor?: MRE.Actor = undefined;
	private timer?: Timer = undefined;
	private assets: MRE.AssetContainer;
	private cuadroTexto?: CuadroTexto = undefined;
	private colaiderApple?: Colaider = undefined;
	private userTrackers = new Map<MRE.Guid, MRE.Actor>();

	// Specific assets and their properties
	private readonly buttonSquareTimer: MRE.Mesh;
	private readonly buttonDefaultLocalTransform: MRE.Vector3Like = {
		x: 0, y: 0, z: -0.2
	};
	private readonly commonTextProperties: Partial<MRE.TextLike>;

	// Relative path of the audio file to play as alarm in the public directory
	private readonly alarmSoundPath: string;
	private alarmSound?: MRE.Sound = undefined;
	private soundPlaying: PlayingMedia;
	private readonly audioOptions: MRE.SetAudioStateOptions;

	// Number of seconds to count initially
	private readonly initialTimerCount: number;

	// Increment to the counter (in seconds) when clicked
	private readonly increment: number;
	private readonly maxVolume = 0;
	private readonly volumeIncrementPercent: number = 0.0;
	private readonly viewableByModsOnly: boolean;
	private readonly pauseOnly: boolean;

	//Cuadro de texto
	private text: MRE.Actor = null;
	private cube: MRE.Actor = null;
	private arrow: MRE.Actor = null;





	//Colaider Apple
	private triggerVolume: MRE.Actor;
	private apple: MRE.Actor;

	//Materials counterBody and timmerBody
	private materialTimer: MRE.Asset;

	constructor(private context: MRE.Context, private params: MRE.ParameterSet, private baseUrl: string) {
		this.initialTimerCount = parseInt(getParameterLastValue(params, 'c', '150'));
		this.increment = parseInt(getParameterLastValue(params, 'i', '60'));
		this.viewableByModsOnly = getBooleanOption(params, 'mo', false);
		this.alarmSoundPath = getParameterLastValue(params, 'as', 'Pitido.ogg');
		this.pauseOnly = getBooleanOption(params, 'p', false);
		this.audioOptions = this.getAudioOptions(params);
		this.soundPlaying = new PlayingMedia();
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

	private getAudioOptions = (params: MRE.ParameterSet): MRE.SetAudioStateOptions =>  {
		const volume = clamp(
			parseFloat(getParameterLastValue(params, 'v', '50')),
			0,
			this.maxVolume
		) / this.maxVolume;
		const looping = getBooleanOption(params, 'l', false);
		let options: MRE.SetAudioStateOptions = { volume: volume, looping: looping };

		const ambient = getBooleanOption(params, 'am', false);
		if (ambient) {
			options.doppler = 0;
			options.spread = 0;
			options.rolloffStartDistance = 100;
		}
		options.time = 0;
		return options;
	}

	get setToInitial(): boolean {
		return this.increment == 0;
	}

	/**
	 * Once the context is "started", initialize the app.
	 */
	private async started() {
		this.rootActor = MRE.Actor.Create(this.context, {
            actor: 
			{
                name: 'Root Actor',
            }
		});

		this.context.onUserJoined((user) => this.userJoined(user));
		this.context.onUserLeft((user) => this.userLeft(user));	
		let alarmSoundUri = decodeURIComponent(this.alarmSoundPath);
		/*if( !alarmSoundUri.startsWith("http://") && !alarmSoundUri.startsWith("https://") ) {
			alarmSoundUri = `${this.baseUrl}/${this.alarmSoundPath}`;
		}*/
		this.alarmSound = this.assets.createSound(
			'alarmSound',
			{ uri: alarmSoundUri });

		this.cuadroTexto = new CuadroTexto (
			this.context,
		)
		this.timer = new Timer(
			this.initialTimerCount,
			(value: string) => {
				this.setTimerText(value);
			},
			this.startSound
			);

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

		if (! this.viewableByModsOnly) {
		}

	}

	private async onUserJoined(user: MRE.User) {
		await this.createWatch(user.id);
		await this.createColaiderApple();	
		if (this.viewableByModsOnly) {
			const isModerator = user.properties["altspacevr-roles"].toLowerCase().includes("moderator");
			if (isModerator) {								
			}
		}
		return;
	}

	private async createWatch(exclusiveToUser: MRE.Guid | undefined = undefined) {
		const textTimerRectangleWatch = this.assets.createBoxMesh('textTimerRectangleWatch', 0.1, 0.1, 0.1);

		this.materialTimer = this.assets.createMaterial("materialTimer", {
            color: new MRE.Color4(0, 0, 0, 0),
            alphaMode: MRE.AlphaMode.Blend
		})

		
		let timerWatch = MRE.Actor.Create(this.context, {
			actor: {

				attachment: {
					attachPoint: 'left-hand',
					userId: exclusiveToUser,
				},
			
				name: 'timerWatch',
				parentId: this.rootActor!.id,
				exclusiveToUser: exclusiveToUser,
				appearance: { meshId: textTimerRectangleWatch.id,
					materialId: this.materialTimer.id},
				transform: {
					app: {
						position: { x: 0, y: 0.08, z: 0 },
						//rotation: {x: Math.PI * 0 / 180.0, y: Math.PI * -45 / 180.0, z: Math.PI * 0 / 180.0},
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
		});}

	private async createBody(exclusiveToUser: MRE.Guid | undefined = undefined) {
		const textTimerRectangle = this.assets.createBoxMesh('textTimerRectangle', 5, 1, 0.20);
		this.materialTimer = this.assets.createMaterial("materialTimer", {
            color: new MRE.Color4(1, 1, 1, 1),
            alphaMode: MRE.AlphaMode.Blend
		})
		let timerBody = MRE.Actor.Create(this.context, {
			actor: {
				attachment: {
					userId: exclusiveToUser,
				},
				name: 'timerBody',
				parentId: this.rootActor!.id,
				exclusiveToUser: exclusiveToUser,
				appearance: { 
						meshId: textTimerRectangle.id,
						materialId: this.materialTimer.id 
					},
				transform: {
					app: {						
						position: { x: 0, y: 0, z: -this.buttonDefaultLocalTransform.z },
						rotation: {x: Math.PI * 0 / 180.0, y: Math.PI * -45 / 180.0, z: Math.PI * 0 / 180.0},
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

	private createButtonTimer = (
		config: buttonConfigTimer,
		position: number,
		actorProperties: Partial<MRE.ActorLike>
	): MRE.Actor => {
		const buttonTimer = MRE.Actor.Create(this.context, {
			actor: Object.assign({
				name: `button${position}`,
				parentId: this.rootActor!.id,
				appearance: { meshId: this.buttonSquareTimer.id },
				transform: {
					app: {
						position: Object.assign({},
							this.buttonDefaultLocalTransform,
							{ x: position * 0.3 - 0.5 },
							{ y: 6.5 }
						),
						//rotation: {x: Math.PI * 0 / 180.0, y: Math.PI * -45 / 180.0, z: Math.PI * 0 / 180.0},
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
	}

	private get timerContent(): Array<MRE.Actor> {
		return this.rootActor?.findChildrenByName("timerContent", true) || [];
	}


	private setTimerText = (value: string) => {
		this.timerContent.forEach((tc: MRE.Actor) => {
			tc.text.contents = value;
		})
	}
		
	private startSound = () => {
		if (this.soundPlaying.isLoaded) {
			if (this.pauseOnly) {
				this.soundPlaying.resume();
				return;
			}
			else {
				this.soundPlaying.stop();
			}
		}

		assert (!this.soundPlaying.isLoaded);
		if (this.alarmSound != undefined) {
			const playOptions = Object.assign({time: 0}, this.audioOptions)
			this.soundPlaying = new PlayingMedia(
				this.rootActor!.startSound(this.alarmSound.id, playOptions),
				playOptions);
		}

		return
	}


	private async createCuadroTexto2 (position: MRE.Vector3)  {
		this.text = MRE.Actor.Create(this.context, {
			actor: {
				name: 'Text',
				appearance: { enabled: true },
				transform: {
					local: { position: {x: position.x, y: position.y, z: position.z } }
				},
				text: {
					contents: "",
					anchor: MRE.TextAnchorLocation.MiddleCenter,
					color: { r: 204 / 255, g: 204 / 255, b: 0 / 255 },
					height: 0.5
				}
			}
		});

		const spinAnimData = this.assets.createAnimationData("Spin",{
				tracks: [{
					target: MRE.ActorPath("text").transform.local.rotation,
					keyframes: this.generateSpinKeyframes2(20, MRE.Vector3.Up()),
					easing: MRE.AnimationEaseCurves.Linear
				}]
			});	
			
		spinAnimData.bind(				
			{ text: this.text },
			{ isPlaying: true, wrapMode: MRE.AnimationWrapMode.PingPong });

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
		
	};

	private async createColaiderApple()  {
		this.triggerVolume = MRE.Actor.CreatePrimitive(this.assets,
			{
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
			}
		);

		this.triggerVolume.collider.isTrigger = true;
		//this.triggerVolume.collider.onTrigger('trigger-enter', (actor) => this.arrow.appearance.enabled = true);
		this.triggerVolume.collider.onTrigger('trigger-enter', (user) => this.timer?.playValue());
	};

	private async userJoined(user: MRE.User) {

		await this.createColaiderApple();
		const tracker = MRE.Actor.CreatePrimitive(this.assets,
			{
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
			}
		);
		this.userTrackers.set(user.id, tracker);
		}

		private userLeft(user: MRE.User) {
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
		 public generateSpinKeyframes(duration: number, axis: MRE.Vector3): Array<MRE.Keyframe<MRE.Quaternion>> {
			return [{
				time: 0 * duration,
				value: MRE.Quaternion.RotationAxis(axis, 0)
			}, {
				time: 0.25 * duration,
				value: MRE.Quaternion.RotationAxis(axis, Math.PI / 4)
			},];
		}

		public generateSpinKeyframes2(duration: number, axis: MRE.Vector3): Array<MRE.Keyframe<MRE.Quaternion>> {
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



