import * as THREE from "https://cdn.skypack.dev/three@0.128.0/build/three.module.js";
// import { OrbitControls } from "https://cdn.jsdelivr.net/npm/three@0.117.1/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "https://cdn.skypack.dev/three@0.128.0/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "https://cdn.skypack.dev/three@0.128.0/examples/jsm/loaders/DRACOLoader.js";
// import { EffectComposer } from "https://cdn.skypack.dev/three@0.128.0/examples/jsm/postprocessing/EffectComposer.js";
// import { RenderPass } from "https://cdn.skypack.dev/three@0.128.0/examples/jsm/postprocessing/RenderPass.js";
// import { SAOPass } from "https://cdn.skypack.dev/three@0.128.0/examples/jsm/postprocessing/SAOPass.js";

import { WorldData } from "./worldData.js";

//#region CONSTANTS

// Page
export const PAGE_LENGTH = 12000;
const SECTIONS_COUNT = 7;
const SECTION_HEIGHT = 1.5;
export const HALF_SCROLL_SECTION = PAGE_LENGTH / (SECTIONS_COUNT - 1) / 4;
const INITIAL_HEIGHT = 0;

const BASE_URL = "";
const MODEL_DIRECTORY = "/public/models/";
const MODEL_FILE = "Apartment.glb";

const SECTIONS = [
	"roof",
	"projects",
	"tech-stack",
	"timeline",
	"inquiry",
	"contact",
	"donations"
];

// Camera
const CAMERA_LERP_SPEED = 1 / 500;
const CAMERA_TARGET_OFFSET = 0.5;
const INITIAL_CAMERA_HEIGHT = 75; // Higher number means longer intro animation
const INITIAL_CAMERA_DISTANCE = 0.5;
const MIN_CAMERA_DISTANCE = 0.45;

// Post-processing
const GAMMA = 1.5;
const SATURATION = 1;
const LIGHTNESS = 1;

// Lighting
const SUNLIGHT_INTENSITY = 0.75; // White
const AMBIENT_LIGHTS_INTENSITY = [
	0.25, // Blue
	0.85  // White
];
const LIGHTS_INTENSITY_MULTIPLIER = 1.5;

// Texts
const TEXT_ANIMATION_SPEED = 1 / 200;
const TEXT_OFFSET = -0.25;
const TEXT_APPEAR_DELAY = 0;
const TOUCH_BUTTON_MARGIN = 0.1;

// Clouds
const MIN_CLOUD_DISTANCE = 10;

// Night mode
const STAR_COUNT = 250;
const MIN_STAR_DISTANCE = 10;

// Scrolling
const MOUSE_SCROLL_SPEED = 2;
const TOUCH_SCROLL_SPEED = 8;
const KEYBOARD_SCROLL_SPEED = 100;

// Rooms
const ROOM_SWITCH_DELAY = 1000;

// Debugging
let DEBUG_MODE = false;
const DISABLE_WORLD = false;
const DISABLE_AUDIO = false;
const DISABLE_TEXT = true;
const DISABLE_CLOUDS = true;
const LOG_SCROLLING = false;
const LOG_LOADED_OBJECTS = false;
const PERSISTENT_LOADING_SCREEN = false;
const ENABLE_FLAT_VERSION = false;

// Objects
const OBJECTS = {
	TEXT: "TEXT",
	BUTTON: "BUTTON",
	IMAGE: "IMAGE",
	CLOUD: "CLOUD",
	STAR: "STAR",
}

// Colors (deprecated, use worldData instead)
const COLORS = {
	Turquoise: "1abc9c",
	DarkTurquoise: "16a085",
	Green: "2ecc71",
	DarkGreen: "27ae60",
	Blue: "3498db",
	DarkBlue: "2980b9",
	Purple: "9b59b6",
	DarkPurple: "8e44ad",
	DarkerBlue: "34495e",
	DarkestBlue: "2c3e50",
	Yellow: "f1c40f",
	DarkYellow: "f39c12",
	Orange: "e67e22",
	DarkOrange: "d35400",
	Red: "e74c3c",
	DarkRed: "c0392b",
	White: "ecf0f1",
	DarkWhite: "bdc3c7",
	Grey: "95a5a6",
	DarkGrey: "7f8c8d",
};

//#endregion

let colorPalette;

//#region UTIL

function degreesToRadians(degrees) {
	return degrees * Math.PI / 180;
}

function clamp(value, min, max) {
	return Math.min(Math.max(value, min), max);
}

function formatObjectName(name, addSpaces) {
	name = name.replace(/([0-9]|\.)/g, "");

	if (addSpaces)
		name = name.replace(/([A-Z][a-z])/g, " $1").trim();

	return name;
}

function randomRange(min, max) {
	return Math.random() * (max - min) + min;
}

export class Url {
	constructor(url) {
		this.url = url;
	}

	open() {
		if (DEBUG_MODE)
			console.log("Opening URl: " + this.url);

		window.open(this.url);
	}
}

class Time {
	constructor() {
		this.startTime = new Date();
		this.previousUpdate = this.startTime;
	}

	getElapsedTime() {
		const now = new Date();
		return now - this.startTime;
	}

	update() {
		const now = new Date();
		this.deltaTime = now - this.previousUpdate;
		this.previousUpdate = now;
	}
}

//#endregion

//#region URL PARAMETERS

let queries = getURLParameters();

function getURLParameters() {
	if (window.location.search) {
		let parameters = {};

		window.location.search.substring(1).split("&").forEach((query) => {
			parameters[query.split("=")[0]] = query.split("=")[1]
		});

		return parameters;
	} else {
		return null;
	}
}

function setURLParameter(key, value) {
	let url = location.protocol + "//" + location.host + location.pathname;
	queries = getURLParameters();

	if (queries == null && value != null) {
		// Add first query
		url += `?${key}=${value}`;
	} else {
		if (queries[key] == undefined && value != null) {
			// Add query
			url += window.location.search + `&${key}=${value}`;
		} else if (queries[key] != undefined) {
			if (value == null) {
				// Remove query
				delete queries[key];
			} else {
				// Change query
				queries[key] = value;
			}

			if (Object.keys(queries).length > 0) {
				// Add parameters to url
				let parameters = [];

				for (const [parameterKey, parameterValue] of Object.entries(queries)) {
					parameters.push(`${parameterKey}=${parameterValue}`);
				}

				url += "?" + parameters.join("&");
			}
		}
	}

	url += location.hash;
	history.replaceState({ path: url }, null, url);
}

//#endregion

//#region FLAT VERSION

class FlatVersion {
	constructor() {
		this.container = document.getElementById("flat-version-container");
		this.toggleButton = document.getElementById("toggle-flat-button");
	}

	toggle(activate) {
		if (activate == null)
			activate = !document.body.classList.contains("show-flat-version");

		if (activate) {
			document.body.classList.add("show-flat-version");
			this.toggleButton.textContent = "3D";
		} else {
			document.body.classList.remove("show-flat-version");
			this.toggleButton.textContent = "2D";
		}
	}
}

//#endregion

//#region ANIMATIONS

function lerp(start, end, amount) {
	let output = (1 - amount) * start + amount * end;

	const rising = start < end;

	// Constrain output to end value
	if ((rising && output > end) || (!rising && output < end))
		output = end;

	return output;
}

function easeOut(start, end, amount) {
	const bounce = 1.70158;
	const x = amount;
	
	// Graph: https://www.desmos.com/calculator/hjqnoxpfj7
	return (1 + (bounce + 1) * Math.pow(x - 1, 3) + bounce * Math.pow(x - 1, 2)) * (end - start) + start;
}

//#endregion

//#region 3D OBJECTS

function createBoxWithRoundedEdges(width, height, depth, radius0, smoothness) {
	let shape = new THREE.Shape();
	let eps = 0.00001;
	let radius = radius0 - eps;

	shape.absarc(eps, eps, eps, -Math.PI / 2, -Math.PI, true);
	shape.absarc(eps, height -  radius * 2, eps, Math.PI, Math.PI / 2, true);
	shape.absarc(width - radius * 2, height -  radius * 2, eps, Math.PI / 2, 0, true);
	shape.absarc(width - radius * 2, eps, eps, 0, -Math.PI / 2, true);
	
	let geometry = new THREE.ExtrudeBufferGeometry( shape, {
		depth: depth - radius0 * 2,
		bevelEnabled: true,
		bevelSegments: smoothness * 2,
		steps: 1,
		bevelSize: radius,
		bevelThickness: radius0,
		curveSegments: smoothness
	});
	
	geometry.center();
	
	return geometry;
}

function setScale(mesh, value) {
	mesh.scale.set(value, value, value);
}

function loadColorPalette() {
	return new Promise((resolve, reject) => {
		new THREE.TextureLoader().load(BASE_URL + "/public/models/ColorPalette.png", (texture) => {
			texture.wrapS = THREE.RepeatWrapping;
			texture.wrapT = THREE.RepeatWrapping;
			texture.minFilter = THREE.NearestFilter;
			texture.encoding = THREE.sRGBEncoding;
			texture.mapping = THREE.EquirectangularReflectionMapping;
			texture.encoding = THREE.sRGBEncoding;
    		texture.flipY = false;

			colorPalette = texture;
			resolve("SUCCESS");
		});
	});
}

function processMaterial() {
	let newMaterial = new THREE.MeshLambertMaterial();

	newMaterial.map = colorPalette;
	newMaterial.needsUpdate = true;
	newMaterial.map.needsUpdate = true;

	return newMaterial;
}

function createBackground(mesh, padding, textDepth, backgroundDepth, color) {
	if (!padding)
		padding = {horizontal: 0, vertical: 0};

	const boundingBox = mesh.geometry.boundingBox;
	const width = boundingBox.max.x - boundingBox.min.x + padding.horizontal * 2;
	const height = boundingBox.max.y - boundingBox.min.y + padding.vertical * 2;

	const rotation = mesh.rotation.y;
	const cos = Math.sin(rotation);
	const sin = Math.cos(rotation);

	let backgroundOffsetX = (textDepth + backgroundDepth / 2) * cos;
	let backgroundOffsetZ = (textDepth + backgroundDepth / 2) * sin;

	const geometry = createBoxWithRoundedEdges(width, height, backgroundDepth, backgroundDepth / 2, 4);
	const material = new THREE.MeshLambertMaterial({color: color, transparent: true});
	const backgroundMesh = new THREE.Mesh(geometry, material);
	backgroundMesh.position.set(mesh.position.x - backgroundOffsetX, mesh.position.y, mesh.position.z - backgroundOffsetZ);
	backgroundMesh.rotation.y = rotation;

	return backgroundMesh;
}

export class Text {
	constructor(position, rotation, content, font, color, backgroundColor, backgroundOpacity, size, padding, depth, backgroundDepth, minScrollHeight, maxScrollHeight, room) {
		Object.assign(this, {position, rotation, color, backgroundColor, backgroundOpacity, size, padding, depth, backgroundDepth, minScrollHeight, maxScrollHeight, room});

		this.visible = true;

		const geometry = new THREE.TextGeometry(content, {font, size, height: depth});
		geometry.computeBoundingBox();
		geometry.center();

		this.mesh = new THREE.Mesh(geometry, new THREE.MeshLambertMaterial({color, transparent: true}));
		this.mesh.position.set(this.position.x, this.position.y, this.position.z);
		this.mesh.rotation.y = degreesToRadians(this.rotation);
		this.mesh.material.opacity = 0;

		this.mesh.name = OBJECTS.TEXT;

		if (this.backgroundColor && this.backgroundOpacity > 0) {
			this.backgroundMesh = createBackground(this.mesh, this.padding, this.depth, this.backgroundDepth, this.backgroundColor);
			this.backgroundMesh.opacity = 0;

			this.backgroundMesh.name = OBJECTS.TEXT;

			this.room.add(this.backgroundMesh);
		}

		setScale(this.mesh, 0);

		this.room.add(this.mesh);
	}

	update(deltaTime) {
		if (world.switchingRooms || world.currentRoom != this.room) {
			this.visible = false;
		} else if (world.currentRoom.actualScrollHeight >= this.minScrollHeight && world.currentRoom.actualScrollHeight <= this.maxScrollHeight) {
			this.appear = true;

			setTimeout(() => {
				if (this.appear)
					this.visible = true;
			}, TEXT_APPEAR_DELAY);
		} else {
			this.visible = false;
			this.appear = false;
		}

		if (DEBUG_MODE && DISABLE_TEXT) {
			this.visible = false;
		} else if (this.room == world.projectsRoom) {
			this.visible = true;
		}

		if (this.visible) {
			setScale(this.mesh, lerp(this.mesh.scale.x, 1, deltaTime * TEXT_ANIMATION_SPEED));
			this.mesh.material.opacity = lerp(this.mesh.material.opacity, 1, deltaTime * TEXT_ANIMATION_SPEED);
		} else {
			setScale(this.mesh, lerp(this.mesh.scale.x, 0, deltaTime * TEXT_ANIMATION_SPEED));
			this.mesh.material.opacity = lerp(this.mesh.material.opacity, 0, deltaTime * TEXT_ANIMATION_SPEED);
		}

		if (this.backgroundMesh) {
			setScale(this.backgroundMesh, this.mesh.scale.x);
			this.backgroundMesh.material.opacity = this.mesh.material.opacity * this.backgroundOpacity;
		}
	}
}

// class Tooltip extends Text {
// 	constructor(position, rotation, content, font, color, size, depth, minScrollHeight, maxScrollHeight, room) {

// 	}
// }

export class Interactable {
	constructor(mesh, onClick) {
		this.mesh = mesh;
		this.onClick = onClick;
	}

	interact() {
		if (this.onClick)
			this.onClick(this.mesh);
	}
}

export class Button extends Text {
	constructor(position, rotation, content, font, color, backgroundColor, backgroundOpacity, size, padding, textDepth, backgroundDepth, minScrollHeight, maxScrollHeight, room, callback) {
		super(position, rotation, content, font, color, backgroundColor, backgroundOpacity, size, padding, textDepth, backgroundDepth, minScrollHeight, maxScrollHeight, room);
		Object.assign(this, {position, rotation, content, font, color, backgroundColor, backgroundOpacity, size, padding, textDepth, backgroundDepth, minScrollHeight, maxScrollHeight, callback});

		this.mesh.name = OBJECTS.BUTTON;
		this.backgroundMesh.name = OBJECTS.BUTTON;

		// Create collider
		const boundingBox = this.mesh.geometry.boundingBox;
		const width = boundingBox.max.x - boundingBox.min.x + padding.horizontal * 2 + TOUCH_BUTTON_MARGIN;
		const height = boundingBox.max.y - boundingBox.min.y + padding.vertical * 2 + TOUCH_BUTTON_MARGIN;

		const colliderGeometry = new THREE.BoxGeometry(width , height , this.backgroundDepth + TOUCH_BUTTON_MARGIN);
		const colliderMaterial = new THREE.MeshLambertMaterial();
		this.collider = new THREE.Mesh(colliderGeometry, colliderMaterial);
		this.collider.position.set(this.backgroundMesh.position.x, this.backgroundMesh.position.y, this.backgroundMesh.position.z);
		this.collider.rotation.y = degreesToRadians(this.rotation);
		this.collider.visible = false;

		this.collider.name = OBJECTS.BUTTON;

		world.scene.add(this.collider);
	}

	interact() {
		if (this.callback)
			this.callback();
	}
}

export class Image extends Interactable {
	constructor(position, rotation, source, scale, room, onClick) {
		super(null, onClick);
		Object.assign(this, {position, rotation, source, scale, room});

		const texture = new THREE.TextureLoader().load(source, (texture) => {
			texture.matrixAutoUpdate = false;
	
			const aspect = scale.x / scale.y;
			const imageAspect = texture.image.width / texture.image.height;
	
			if (aspect < imageAspect) {
				texture.matrix.setUvTransform(0, 0, aspect / imageAspect, 1, 0, 0.5, 0.5);
			} else {
				texture.matrix.setUvTransform(0, 0, 1, imageAspect / aspect, 0, 0.5, 0.5);
			}
		});

		const material = new THREE.MeshBasicMaterial({
            map: texture,
        });

        this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(scale.x, scale.y), material);
        this.mesh.overdraw = true;

		this.mesh.position.set(position.x, position.y, position.z);
		this.mesh.rotation.y = degreesToRadians(this.rotation);

		this.mesh.name = OBJECTS.IMAGE;

		this.room.add(this.mesh);
	}
}

class Cloud {
	constructor(mesh) {
		this.mesh = mesh;

		this.mesh.receiveShadow = false;
		this.mesh.material.transparent = true;
		this.mesh.material.fog = false;

		this.mesh.name = OBJECTS.CLOUD;
	}

	update() {
		const cameraPosition = world.camera.getWorldPosition(new THREE.Vector3());
		const distance = this.mesh.position.distanceTo(cameraPosition);

		if (distance < MIN_CLOUD_DISTANCE || (DEBUG_MODE && DISABLE_CLOUDS)) {
			this.mesh.material.opacity = 0;
		} else {
			this.mesh.material.opacity = world.nightMode ? 0.25 : 1;
		}
	}
}

class Star {
	constructor(position, radius, opacity) {
		this.geometry = new THREE.SphereGeometry(radius, 7, 5);
		this.material = new THREE.MeshBasicMaterial({
			color: 0xffffff
		});

		this.mesh = new THREE.Mesh(this.geometry, this.material);

		this.mesh.receiveShadow = false;
		this.mesh.material.transparent = true;
		this.mesh.material.fog = false;
		this.opacity = opacity;
		this.mesh.position.set(position.x, position.y, position.z);
		this.mesh.name = OBJECTS.STAR;

		world.scene.add(this.mesh);
	}

	update() {
		const cameraPosition = world.camera.getWorldPosition(new THREE.Vector3());
		const distance = this.mesh.position.distanceTo(cameraPosition);

		if (distance < MIN_STAR_DISTANCE) {
			this.mesh.material.opacity = 0;
		} else {
			this.mesh.material.opacity = this.opacity;
		}
	}

	hide() {
		this.mesh.material.opacity = 0;
	}
}

//#endregion

//#region WORLD

class Room {
	constructor(objects, cameraZoom, cameraPosition, cameraTargetPosition, cameraRotation, maxScrollHeight, initialScrollheight, horizontalScrolling, overlay, hidePreviousRoom) {
		Object.assign(this, {objects, cameraZoom, cameraPosition, cameraTargetPosition, cameraRotation, maxScrollHeight, initialScrollheight, horizontalScrolling, overlay, hidePreviousRoom});

		this.scrollHeight = initialScrollheight;
		this.actualScrollHeight = this.scrollHeight;
		this.buttonColliders = [];
	}

	add(child) {
		this.objects.children.push(child);
	}
}

class World {
	constructor() {
		this.data = new WorldData(this, overlay);

		this.createRooms();
		this.init();

		window.addEventListener("resize", () => {
			this.resize();
		});

		this.resize();

		this.nightMode = false;
		
		this.loadScene();
		this.addInteractables();
	}

	createRooms() {
		// TO DO: Some of the following values should be moved to world data 
		this.building = new Room(new THREE.Group(), 1, new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, -CAMERA_TARGET_OFFSET, 0), 0, PAGE_LENGTH, 0, false, null, true);
		this.projectsRoom = new Room(new THREE.Group(), 5, new THREE.Vector3(0, 8.25, -0.15), new THREE.Vector3(-10, 0, 0), 225, 3125, 100, true, null, true);
		this.timelineRoom = new Room(new THREE.Group(), 5, new THREE.Vector3(0, 5.35, 0.15), new THREE.Vector3(-10, 0, 0), 585, 5000, 250, true, null, true);
		this.businessRoom = new Room(new THREE.Group(), 3.5, new THREE.Vector3(0, 3.9, 0), new THREE.Vector3(0, 0, 10), 675, 0, 0, true, null, false);
		this.contactRoom = new Room(new THREE.Group(), 3.5, new THREE.Vector3(0, 2.4, 0), new THREE.Vector3(0, 0, -10), 855, 0, 0, true, null, false);

		this.currentRoom = this.building;
	} 

	init() {
		this.initRenderer();
		this.initCamera();
		// this.initControls();
		this.initScene();
		this.initLighting();
		this.initFog();
		// this.initComposer();

		this.initialRender = true;
	}

	initRenderer() {
		this.canvas = document.querySelector("canvas");
		this.renderer = new THREE.WebGLRenderer({canvas: this.canvas, antialias: true});

		// Shadows
		this.renderer.shadowMap.enabled = true;
		this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

		// Color correction
		this.renderer.outputEncoding = THREE.sRGBEncoding;
		this.renderer.gammaFactor = GAMMA;
	}

	initComposer() {
		this.composer = new EffectComposer(this.renderer);
		this.composer.addPass(new RenderPass(this.scene, this.camera));

		const saoPass = new SAOPass(this.scene, this.camera, false, true);

		saoPass.params.saoBias = 0.5;
		saoPass.params.saoIntensity = 0.5;
		saoPass.params.saoScale = 500;
		saoPass.params.saoKernelRadius = 15;
		saoPass.params.saoMinResolution = 0;
		saoPass.params.saoBlur = true;
		saoPass.params.saoBlurRadius = 8;
		saoPass.params.saoBlurStdDev = 150;
		saoPass.params.saoBlurDepthCutoff = 0.01;

		if (DEBUG_MODE)
			console.log(saoPass);

		this.composer.addPass(saoPass);
	}

	initCamera() {
		const fov = 25;
		const aspect = window.innerWidth / window.innerHeight;
		const near = 0.01;
		const far = 1000;

		this.cameraGroup = new THREE.Group();

		this.camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
		this.cameraDistance = INITIAL_CAMERA_DISTANCE;
		this.currentCameraZoom = this.currentRoom.cameraZoom;
		this.currentCameraRotation = this.currentRoom.cameraRotation;

		// Copying values is required to avoid references
		this.currentCameraPosition = new THREE.Vector3(this.currentRoom.cameraPosition.x, this.currentRoom.cameraPosition.y, this.currentRoom.cameraPosition.z);
		this.currentCameraTargetPosition = new THREE.Vector3(this.currentRoom.cameraTargetPosition.x, this.currentRoom.cameraTargetPosition.y, this.currentRoom.cameraTargetPosition.z);

		if (DEBUG_MODE)
			console.log(this.currentCameraPosition);

		this.cameraGroup.add(this.camera);

		this.updateCamera();
	}

	updateCamera() {
		this.cameraGroup.rotation.y = degreesToRadians(this.currentCameraRotation);
		this.cameraGroup.position.set(this.currentCameraPosition.x, 0, this.currentCameraPosition.z);

		const distance = this.cameraDistance / this.currentCameraZoom;
		const cameraPosition = new THREE.Vector3(-7.5 * distance, this.currentCameraPosition.y, -7.5 * distance);
		const cameraTargetPosition = new THREE.Vector3(this.currentCameraPosition.x + this.currentCameraTargetPosition.x, this.currentCameraPosition.y + this.currentCameraTargetPosition.y, this.currentCameraPosition.z + this.currentCameraTargetPosition.z);

		this.camera.position.set(cameraPosition.x, cameraPosition.y, cameraPosition.z);
		this.camera.lookAt(cameraTargetPosition);
	}

	initControls() {
		const controls = new OrbitControls(this.camera, this.renderer.domElement);
		controls.target.set(0, 5, 0);
		controls.zoomSpeed = 2;
		controls.update();
	}

	initScene() {
		this.scene = new THREE.Scene();
		this.scene.background = new THREE.Color(this.data.colors.sky.day);

		this.scene.add(this.cameraGroup);
	}

	initLighting() {
		// Sunlight
		this.sunlight = new THREE.DirectionalLight("#FFFFFF", SUNLIGHT_INTENSITY * LIGHTS_INTENSITY_MULTIPLIER);

		this.sunlight.position.set(-6, -2.5, 10);
		this.sunlight.castShadow = true;
		this.sunlight.shadow.normalBias = 10;
		this.sunlight.shadow.camera.near = 0.1;
		this.sunlight.shadow.camera.far = 25;
		this.sunlight.shadow.mapSize.width = 1024;
   		this.sunlight.shadow.mapSize.height = 1024;

		// const d = 100;
		// this.sunlight.shadow.camera.left = -d;
		// this.sunlight.shadow.camera.right = d;
		// this.sunlight.shadow.camera.top = d;
		// this.sunlight.shadow.camera.bottom = -d;

		this.scene.add(this.sunlight);

		// Ambient lights
		this.ambientLights = [
			new THREE.AmbientLight("#C1F8FF", AMBIENT_LIGHTS_INTENSITY[0] * LIGHTS_INTENSITY_MULTIPLIER),
			new THREE.AmbientLight("#FFFFFF", AMBIENT_LIGHTS_INTENSITY[1] * LIGHTS_INTENSITY_MULTIPLIER)
		];

		for (let i = 0; i < this.ambientLights.length; i++) {
			this.scene.add(this.ambientLights[i]);
		}
	}

	initFog() {
		const color = this.data.colors.sky.day;
		const density = 0.05;
		this.scene.fog = new THREE.FogExp2(color, density);
	}

	prepareObject(object) {
		// Change materials
		if (object.material.length) {
			const materials = [];

			for (let i = 0; i < object.material.length; i++) {
				materials.push(this.universalMaterial.clone());
			}

			object.material = materials;
		} else {
			object.material = this.universalMaterial.clone();
		}

		object.castShadow = true;
		object.receiveShadow = true;

		let added = false;

		if (object.name.startsWith("Cloud")) {
			const cloud = new Cloud(object);
			this.clouds.push(cloud);
		} else if (object.name.startsWith("Project")) {
			this.projectsRoom.add(object);
			added = true;
		} else if (object.name.startsWith("Timeline") || object.parent.name == "TimelineWall") {
			this.timelineRoom.add(object);
			added = true;
		}

		const cleanName = formatObjectName(object.name).toLowerCase();

		const addInteractable = (callback) => {
			this.interactables.push(new Interactable(object, callback));
		}

		if (Object.keys(this.data.links).includes(cleanName)) {
			const url = this.data.links[cleanName];
			
			// Clickable links
			addInteractable(() => { new Url(url).open(); });
		} else if (this.data.hoverHints.includes(cleanName)) {
			// Hint on hover
			addInteractable((mesh) => { overlay.showTooltip(formatObjectName(mesh.name, true), 2000); });
		} else {
			// Other interactable elements
			switch (cleanName) {
				case "arrow":
					addInteractable(() => { controls.resetScroll(); });
					break;
				case "telescope":
					addInteractable(() => { this.toggleNightMode(); });
					break;
				case "buildingwall":
					// this.exteriorWalls = [object, object.clone()];
					break;
			}
		}

		if (!added)
			this.building.add(object);
	}

	loadObjects() {
		// Create universal material
		this.universalMaterial = new THREE.MeshLambertMaterial();
		this.universalMaterial.map = colorPalette;
		this.universalMaterial.needsUpdate = true;
		this.universalMaterial.map.needsUpdate = true;

		// Create loading manager
		const loadingManager = new THREE.LoadingManager();

		let loadingCompleted = 0;
		let loadingTotal = 0;
		let loadingProgress = 0;
		let traversingCompleted = 0;
		let traversingTotal = 0;
		let traversingProgress = 0;

		const logProgress = () => {
			// if (!DEBUG_MODE)
			// 	return;

			// const currentLoadingProgress = (loadingTotal > 0) ? loadingCompleted / loadingTotal : 0;
			// const currentTraversingProgress = (traversingTotal > 0) ? traversingCompleted / traversingTotal : 0;

			// // Only update when there are changes
			// if (currentLoadingProgress != loadingProgress || currentTraversingProgress != traversingProgress) {
			// 	loadingProgress = currentLoadingProgress;
			// 	traversingProgress = currentTraversingProgress;

			// 	const totalProgress = (loadingProgress + traversingProgress) / 2;

			// 	console.log(`Total: ${Math.round(totalProgress * 100)}% | Loading: ${Math.round(loadingProgress * 100)}% | Traversing: ${Math.round(traversingProgress * 100)}%`);
			// }
		};

		// loadingManager.onStart = (url, itemsLoaded, itemsTotal) => {
		// 	loadingCompleted = itemsLoaded;
		// 	loadingTotal = itemsTotal;

		// 	logProgress();
		// };

		// loadingManager.onLoad = () => {
		// 	loadingCompleted = loadingTotal;

		// 	logProgress();
		// };


		// loadingManager.onProgress = (url, itemsLoaded, itemsTotal) => {
		// 	loadingCompleted = itemsLoaded;
		// 	loadingTotal = itemsTotal;

		// 	logProgress();
		// };

		loadingManager.onError = (url) => {
			loadingScreen.showError();
			console.error(`Error while loading ${url}`);
		};

		// Create GLTF loader, with Draco decompression
		const loader = new GLTFLoader(loadingManager).setPath(BASE_URL + MODEL_DIRECTORY);

		const dracoLoader = new DRACOLoader();
		dracoLoader.setDecoderPath("https://www.gstatic.com/draco/versioned/decoders/1.5.6/");
		dracoLoader.setDecoderConfig({ type: "js" });
		loader.setDRACOLoader(dracoLoader);

		loader.load(MODEL_FILE, (model) => {
			if (DEBUG_MODE)
				console.log(model);

			traversingTotal = model.scene.children.length;

			model.scene.traverse((object) => {
				if (!object.name.startsWith("Ground|Grass|Dupli|") && LOG_LOADED_OBJECTS && DEBUG_MODE)
					console.log("Loaded " + object.name);

				if (object.isMesh) {
					this.prepareObject(object);
				}

				traversingCompleted++;
				logProgress();
			});
				
			this.showLoadedObjects();
			dracoLoader.dispose();
		});
	}

	loadScene() {
		this.clouds = [];
		this.interactables = [];
		this.stars = [];

		loadColorPalette().then(() => {
			this.loadObjects()
		});

		this.scene.add(this.building.objects);
		this.currentObjects = this.building.objects.children;
	}

	showLoadedObjects() {
		this.startRender();

		loadingScreen.hide();
	}

	addInteractables() {
		const loader = new THREE.FontLoader();

		loader.load(BASE_URL + "/public/fonts/dosis/Dosis_Bold.json", (font) => {
			this.texts = this.data.getTexts(font);
			this.buttons = this.data.getButtons(font);

			// Add button colliders
			for (let i = 0; i < this.buttons.length; i++) {
				const button = this.buttons[i];
				button.room.buttonColliders.push(button.collider);
			}
		});

		// Images
		this.images = this.data.getImages();

		// Add duplicates of the first 3 images to the building
		const duplicateImages = [];

		for (let i = 0; i < 3; i++) {
			const image = this.images[i];
			const newImage = new Image(image.position, image.rotation, image.source, image.scale, this.building, image.onClick);

			duplicateImages.push(newImage);
		}

		this.interactables = this.interactables.concat(this.images.concat(duplicateImages));
	}

	switchRoom(newRoom, previousRoom, delay) {
		this.currentRoom = newRoom;
		this.switchingRooms = true;

		overlay.hideCurrentProject();

		setTimeout(() => {
			// Switch scene objects
			if (newRoom.objects.children.length) {
				this.currentObjects = newRoom.objects.children;

				if (newRoom.hidePreviousRoom) {
					this.scene.remove(previousRoom.objects);
				} else {
					this.currentObjects = this.currentObjects.concat(previousRoom.objects.children);
				}

				this.scene.add(newRoom.objects);
			}

			// Switch overlay
			if (newRoom.overlay)
				overlay.toggleOverlay(newRoom.overlay, true);
			if (previousRoom.overlay)
				overlay.toggleOverlay(previousRoom.overlay, false);

			this.switchingRooms = false;
		}, delay);
	}

	enterRoom(room) {
		this.switchRoom(room, this.building, ROOM_SWITCH_DELAY);
	}

	exitRoom() {
		this.currentRoom.scrollHeight = 0;
		this.updateScroll();

		// Hide overlay
		if (this.currentRoom.overlay)
			overlay.toggleOverlay(this.currentRoom.overlay, false);

		this.switchRoom(this.building, this.currentRoom, 0);
	}

	setCurrentSection() {
		const previousSection = this.currentSection;
		this.currentSection = controls.getCurrentSectionIndex();

		if (previousSection == null || this.currentSection != previousSection) {
			overlay.setActiveNavButton(this.currentSection);

			// Update hash
			if (controls.initialized) {
				const urlWithoutHash = window.location.href.split("#")[0];

				if (this.currentSection > 0) {
					const sectionName = this.currentSection > 0 ? SECTIONS[this.currentSection] : "";
					history.replaceState(null, null, `${urlWithoutHash}#${sectionName}`);
				} else {
					// Remove hash
					history.replaceState(null, null, urlWithoutHash);
				}
			}

			// Update exterior walls
			// this.exteriorWalls[0].position.set(0, (this.currentSection + 1) * SECTION_HEIGHT, 0);
			// this.exteriorWalls[1].position.set(0, (this.currentSection + 3) * SECTION_HEIGHT, 0);

			// for (let i = 0; i < this.exteriorWalls.length; i++) {
			// 	const exteriorWall = this.exteriorWalls[i];
			// 	exteriorWall.rotation.y = 0;
			// 	console.log(exteriorWall.rotation.y);
			// 	// exteriorWall.rotation.y = (this.currentSection % 2 == 0) ? 0 : 180;
			// }
		}
	}

	updateScroll() {
		const factor = (this.currentRoom.scrollHeight / PAGE_LENGTH);
		this.currentRoom.actualScrollHeight = lerp(this.currentRoom.actualScrollHeight, this.currentRoom.scrollHeight, time.deltaTime * CAMERA_LERP_SPEED);

		let maxCameraPositionZ;

		if (this.currentRoom == this.building) {
			const rotation = 180 * (SECTIONS_COUNT - 1) * factor;
			const height = SECTION_HEIGHT * (SECTIONS_COUNT - 1) * (1 - factor) + 0.75 + 0.5;

			this.currentRoom.cameraRotation = rotation;
			this.currentRoom.cameraPosition.y = height;

			this.setCurrentSection();
		} else if (this.currentRoom == this.projectsRoom) {
			maxCameraPositionZ = -2.25;
		} else if (this.currentRoom == this.timelineRoom) {
			maxCameraPositionZ = -3.83;
		}


		if (maxCameraPositionZ != null)
			this.currentRoom.cameraPosition.z = clamp(0.35 - factor * 10, maxCameraPositionZ, 0.35);

		if (LOG_SCROLLING && DEBUG_MODE)
			console.log("Scroll height: " + this.currentRoom.scrollHeight + "; Camera position: " + this.currentRoom.cameraPosition.toArray().join("; "));
	}

	stopRender() {
		if (DEBUG_MODE)
			console.log("Stopped rendering");

		this.rendering = false;
	}

	startRender() {
		if (this.rendering)
			return;

		if (DEBUG_MODE)
			console.log("Started rendering");

		this.rendering = true;
		this.render();
	}

	render() {
		if (!this.rendering)
			return;

		requestAnimationFrame(() => {
			time.update();

			// Check if size is still correct
			const rendererSize = new THREE.Vector2();
			this.renderer.getSize(rendererSize);

			if (rendererSize.x != window.innerWidth || rendererSize.y != window.innerHeight)
				this.resize();

			// Apply scroll
			if (!this.initialRender)
				this.updateScroll();

			// Update camera
			const cameraSpeed = time.deltaTime * CAMERA_LERP_SPEED;

			this.currentCameraRotation = lerp(this.currentCameraRotation, this.currentRoom.cameraRotation, cameraSpeed);
			this.currentCameraZoom = lerp(this.currentCameraZoom, this.currentRoom.cameraZoom, cameraSpeed);
			
			this.currentCameraPosition.x = lerp(this.currentCameraPosition.x, this.currentRoom.cameraPosition.x, cameraSpeed);
			this.currentCameraPosition.y = lerp(this.currentCameraPosition.y, this.currentRoom.cameraPosition.y, cameraSpeed);
			this.currentCameraPosition.z = lerp(this.currentCameraPosition.z, this.currentRoom.cameraPosition.z, cameraSpeed);

			this.currentCameraTargetPosition.x = lerp(this.currentCameraTargetPosition.x, this.currentRoom.cameraTargetPosition.x, cameraSpeed);
			this.currentCameraTargetPosition.y = lerp(this.currentCameraTargetPosition.y, this.currentRoom.cameraTargetPosition.y, cameraSpeed);
			this.currentCameraTargetPosition.z = lerp(this.currentCameraTargetPosition.z, this.currentRoom.cameraTargetPosition.z, cameraSpeed);

			this.updateCamera();

			// Update texts
			for (let i = 0; i < this.texts.length; i++) {
				this.texts[i].update(time.deltaTime);
			}

			// Update buttons
			for (let i = 0; i < this.buttons.length; i++) {
				this.buttons[i].update(time.deltaTime);
			}

			// Update clouds
			for (let i = 0; i < this.clouds.length; i++) {
				this.clouds[i].update();
			}

			// Update stars
			if (this.nightMode) {
				for (let i = 0; i < this.stars.length; i++) {
						this.stars[i].update();
				}
			}

			// Render scene and request next frame
			if (this.composer) {
				this.composer.render(this.scene, this.camera);
			} else {
				this.renderer.render(this.scene, this.camera);
			}

			this.initialRender = false;
			this.render();
		});
	}

	resize() {
		this.renderer.setSize(window.innerWidth, window.innerHeight);
		this.renderer.setPixelRatio(window.devicePixelRatio);

		if (this.composer)
			this.composer.setSize(window.innerWidth, window.innerHeight);

		const aspect = window.innerWidth / window.innerHeight;
		this.camera.aspect = aspect;
		this.camera.updateProjectionMatrix();

		this.cameraDistance = 1 / (aspect * 1.5);

		if (this.cameraDistance < MIN_CAMERA_DISTANCE)
			this.cameraDistance = MIN_CAMERA_DISTANCE;

		this.scene.fog.density = 0.025 / this.cameraDistance;

		document.documentElement.style.setProperty("--vw", `${window.innerWidth / 100}px`);
		document.documentElement.style.setProperty("--vh", `${window.innerHeight / 100}px`);

		// console.log(`Width: ${window.innerWidth}, Height: ${window.innerHeight}, Distance: ${this.cameraDistance}`);
	}

	toggleNightMode() {
		this.nightMode = !this.nightMode;

		console.log("Set night mode to: " + this.nightMode);

		const skyColor = new THREE.Color(this.nightMode ? this.data.colors.sky.night : this.data.colors.sky.day);
		this.scene.background = skyColor;
		this.scene.fog.color = skyColor;

		if (this.nightMode && !this.stars.length) {
			const buildingHeight = SECTION_HEIGHT * (SECTIONS_COUNT + 2.5);

			// TO DO: move hardcoded values in the following code
			for (let i = 0; i < STAR_COUNT; i++) {
				const minDistance = 5;
				const maxDistance = 10;

				let position;

				while (position == null || position.x > -minDistance && position.x < minDistance && position.z > -minDistance && position.z < minDistance) {
					position = {
						x: randomRange(-maxDistance, maxDistance),
						y: buildingHeight / STAR_COUNT * i,
						z: randomRange(-maxDistance, maxDistance),
					};
				}

				const radius = randomRange(0.015, 0.025);
				const opacity = randomRange(0, 1);

				this.stars.push(new Star(position, radius, opacity));
			}
		} else if (!this.nightMode) {
			for (let i = 0; i < this.stars.length; i++) {
				this.stars[i].hide();
			}
		}
	}
}

//#endregion

//#region AUDIO

class AudioManager {
	constructor() {
		// this.windSound = document.createElement("audio");
		// this.windSound.setAttribute("src", "media/Audio/Wind.ogg");
		// this.windSound.loop = true;
		// this.windSound.preload = "auto"; 

		// window.addEventListener("mouseover", () => {
		// 	this.windSound.play();
		// });
		// window.addEventListener("mouseout", () => {
		// 	this.windSound.pause();
		// });
	}
}

//#endregion

//#region CONTROLS

class Controls {
	constructor() {
		document.addEventListener("wheel", (event) => {
			this.scroll(event.deltaY * MOUSE_SCROLL_SPEED, event);
		});

		let previousPosition;
		document.addEventListener("touchmove", (event) => {
    		event.stopPropagation();

			if (!world)
				return;

			const currentPosition = world.currentRoom.horizontalScrolling ? event.touches[0].clientX : event.touches[0].clientY;

			if (previousPosition) {
				const delta = (previousPosition - currentPosition) * TOUCH_SCROLL_SPEED;
				this.scroll(delta, event);
			}

			previousPosition = currentPosition;
		});

		document.addEventListener("touchend", (event) => {
			if (!previousPosition)
				this.click(event, true);

			previousPosition = null;
		});

		document.addEventListener("mousedown", (event) => {
			this.click(event, false);
		});

		document.addEventListener("mousemove", (event) => {
			if (event.target.id == "canvas" && world)
				event.preventDefault();
			// this.hover(event);
		});

		this.pressingShift = false;

		document.addEventListener("keydown", (event) => {
			switch (event.code) {
				case "ArrowUp":
					this.scroll(-KEYBOARD_SCROLL_SPEED);
					break;
				case "ArrowDown":
					this.scroll(KEYBOARD_SCROLL_SPEED);
					break;
				case "Space":
					if (this.pressingShift) {
						this.scrollToSection(world.currentSection - 1);
					} else {
						this.scrollToSection(world.currentSection + 1);
					}
					break;
				case "ShiftLeft":
				case "ShiftRight":
					this.pressingShift = true;
			}
		});

		document.addEventListener("keyup", (event) => {
			if (event.code == "ShiftLeft" || event.code == "ShiftRight")
				this.pressingShift = false;
		});

		this.scroll(INITIAL_HEIGHT);

		if (window.location.hash) {
			const currentSection = window.location.hash.slice(1);
			
			if (SECTIONS.includes(currentSection)) {
				const currentSectionIndex = SECTIONS.indexOf(currentSection);
				this.scrollToSection(currentSectionIndex);
			}
		}

		this.initialized = true;
	}

	setScroll(value) {
		if (!world)
			return;

		const newScrollHeight = clamp(value, 0, world.currentRoom.maxScrollHeight);

		if (this.initialized && world.currentRoom.scrollHeight != newScrollHeight)
			overlay.hideCurrentProject();

		world.currentRoom.scrollHeight = newScrollHeight;
	}

	scroll(delta, event) {
		if (world && (!event || event.target.id == "canvas"))
			this.setScroll(world.currentRoom.scrollHeight + delta);
	}

	scrollToSection(index) {
		index = clamp(index, 0, SECTIONS_COUNT - 1);
		this.setScroll(PAGE_LENGTH / (SECTIONS_COUNT - 1) * index);
	}

	resetScroll() {
		this.setScroll(world.currentRoom.initialScrollheight);
	}

	getCurrentSectionIndex() {
		const sectionScrollHeight = PAGE_LENGTH / (SECTIONS_COUNT - 1);
		const index = Math.round(world.currentRoom.actualScrollHeight / sectionScrollHeight);
		return index;
	}

	getMouseIntersection(mousePosition, isTouch) {
		const raycaster = new THREE.Raycaster();
		const mouse = new THREE.Vector2();
	
		mouse.x = (mousePosition.x / world.renderer.domElement.clientWidth) * 2 - 1;
		mouse.y = - (mousePosition.y / world.renderer.domElement.clientHeight) * 2 + 1;
	
		raycaster.setFromCamera(mouse, world.camera);
	
		// TO DO: Optimise raycasts for hover states

		const objects = !isTouch ? world.currentObjects : world.currentObjects.concat(world.currentRoom.buttonColliders);
		const intersects = raycaster.intersectObjects(objects);

		return intersects[0];
	}

	hover(event) {
		const intersection = this.getMouseIntersection({x: event.clientX, y: event.clientY}, false);
	
		let hoveringButton = false;

		if (intersection) {
			if (DEBUG_MODE)
				console.log(intersection.object);

			// for (let i = 0; i < world.buttons.length; i++) {
			// 	const button = world.buttons[i];
				
			// 	if (button.mesh.id == intersection.object.id || button.backgroundMesh.id == intersection.object.id)
			// 		hoveringButton = true;
			// }
		}

		if (hoveringButton) {
			document.body.style.cursor = "pointer";
		} else {
			document.body.style.cursor = "auto";
		}
	}

	click(event, isTouch) {
		let element = event.target;

		if (DEBUG_MODE)
			console.log(element);

		if (element.id == "canvas" && world) {
			event.preventDefault();

			const intersection = this.getMouseIntersection(!isTouch ? {x: event.clientX, y: event.clientY} : {x: event.changedTouches[0].clientX, y: event.changedTouches[0].clientY}, isTouch);
	
			if (!intersection)
				return;
	
			const interactables = world.interactables.concat(world.buttons);
	
			for (let i = 0; i < interactables.length; i++) {
				const interactable = interactables[i];
				
				if (interactable.mesh.id == intersection.object.id || (interactable.backgroundMesh && interactable.backgroundMesh.id == intersection.object.id) || (isTouch && interactable.collider && interactable.collider.id == intersection.object.id)) {
					interactable.interact();

					if (DEBUG_MODE)
						console.log(interactable);
				}
			}
		} else {
			if (!element.classList.contains("button"))
				element = element.closest(".button");

			if (!element)
				return;

			let functionName = element.getAttribute("data-onclick");

			if (functionName == null && element.id != null) {
				functionName = element.id;
			} else if (functionName == null) {
				return;
			}
			
			if (DEBUG_MODE)
				console.log("Button clicked: " + functionName + " Touch: " + isTouch);

			let handled = true;

			switch (functionName) {
				case "menu-button":
					overlay.toggleOverlay(overlay.navMenu);
					break;
				case "close-nav-button":
					overlay.toggleOverlay(overlay.navMenu, false);
					break;
				case "nav-button":
					const section = element.getAttribute("data-nav-index");

					if (world && world.currentRoom != world.building)
						world.exitRoom();

					controls.scrollToSection(section);
					overlay.toggleOverlay(overlay.navMenu, false);
					break;
				case "close-project-button":
					overlay.hideCurrentProject();
					break;
				case "toggle-flat-button":
					flatVersion.toggle();
					break;
				case "close-inquiry":
					overlay.toggleOverlay(overlay.inquiry, false);
					world.exitRoom();
					break;
				default:
					handled = false;
					break;
			}

			if (handled)
				event.preventDefault();
		}
	}
}

//#endregion

//#region DOM ELEMENTS

class LoadingScreen {
	constructor() {
		this.element = document.getElementById("loading-screen");
	}

	hide() {
		if (DEBUG_MODE && PERSISTENT_LOADING_SCREEN)
			return;

		this.element.style.display = "None";
	}

	showError() {
		this.element.classList.add("failed");
	}
}

class Overlay {
	constructor() {
		this.navMenu = document.getElementById("nav-menu");
		this.navButtons = document.querySelectorAll(".nav-button");
		this.tooltip = document.getElementById("tooltip");
		this.inquiry = document.getElementById("inquiry");

		this.currentOverlay = null;

		this.projects = {};
		const projects = document.querySelectorAll(".project");
		for (let i = 0; i < projects.length; i++) {
			const project = projects[i];
			this.projects[project.id] = project;
		}

		if (queries && queries.project) {
			this.showProject(queries.project);
		}
	}

	toggleOverlay(element, active) {
		if (!element)
			return;

		if (active == null)
			active = !element.classList.contains("active");

		if (active) {
			if (this.currentOverlay) {
				this.currentOverlay.classList.remove("active");

				if (this.currentOverlay == this.inquiry)
					world.exitRoom();
			}

			element.classList.add("active");
			this.currentOverlay = element;
		} else {
			element.classList.remove("active");

			this.currentOverlay = null;

			if (this.currentProject == element)
				this.currentProject = null;
		}
	}

	showProject(name) {
		if (!Object.keys(this.projects).includes(name))
			return;

		this.currentProject = this.projects[name];
		this.toggleOverlay(this.currentProject, true);
		setURLParameter("project", name);
	}

	hideCurrentProject() {
		if (this.currentProject) {
			this.toggleOverlay(this.currentProject, false);

			setURLParameter("project", null);
		}
	}

	setActiveNavButton(index) {
		for (let i = 0; i < this.navButtons.length; i++) {
			const navButton = this.navButtons[i];
			
			if (i == index) {
				navButton.classList.add("active");
			} else {
				navButton.classList.remove("active");
			}
		}
	}

	showTooltip(text, duration) {
		this.tooltip.textContent = text;
		this.tooltip.classList.add("active");

		if (this.tooltipTimeout) {
			clearTimeout(this.tooltipTimeout);
		}

		this.tooltipTimeout = setTimeout(() => {
			this.tooltip.classList.remove("active");
		}, duration);
	}
}

//#endregion

const time = new Time();
const loadingScreen = new LoadingScreen();
const overlay = new Overlay();
const flatVersion = new FlatVersion();

let world = null;
if (!DISABLE_WORLD || !DEBUG_MODE)
	world = new World();

let audioManager = null;
if (!DISABLE_AUDIO || !DEBUG_MODE)
	audioManager = new AudioManager();

const controls = new Controls();

if (DISABLE_WORLD && DEBUG_MODE && !PERSISTENT_LOADING_SCREEN)
	loadingScreen.hide();

if (ENABLE_FLAT_VERSION && DEBUG_MODE)
	flatVersion.toggle(true);
