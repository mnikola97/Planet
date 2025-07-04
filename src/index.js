// ThreeJS and Third-party deps
import * as THREE from "three"
import * as dat from 'dat.gui'
import Stats from "three/examples/jsm/libs/stats.module"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls"

// Core boilerplate code deps
import { createCamera, createRenderer, runApp, updateLoadingProgressBar } from "./core-utils"

// Other deps
import { loadTexture } from "./common-utils"
import Albedo from "./assets/Albedo.jpg"
import Bump from "./assets/Bump.jpg"
import Clouds from "./assets/Clouds.png"
import Ocean from "./assets/Ocean.png"
import NightLights from "./assets/night_lights_modified.png"
import vertexShader from "./shaders/vertex.glsl"
import fragmentShader from "./shaders/fragment.glsl"
import GaiaSky from "./assets/Gaia_EDR3_darkened.png"

const locations = [
 { name: "Bogotá, Colombia", lat: 4.642477, lon: -74.119466 },
  { name: "Yantai, China", lat: 37.505996, lon: 121.376953 },
  { name: "Shanghai, China", lat: 31.230416, lon: 121.473701 },
  { name: "Düsseldorf, Germany", lat: 51.227741, lon: 6.773456 },
  { name: "Montornès del Vallès, Spain", lat: 41.544987, lon: 2.256310 },
  { name: "Kurkumbh, India", lat: 18.315196, lon: 74.564888 },
  { name: "Songdo, South Korea", lat: 37.387553, lon: 126.643573 },
  { name: "Bien Hoa, Vietnam", lat: 10.944332, lon: 106.821991 },
  { name: "Bac Ninh, Vietnam", lat: 21.186928, lon: 106.071644 },
  { name: "Kruševac, Serbia", lat: 43.580000, lon: 21.333000 },
  { name: "Inđija, Serbia", lat: 45.048676, lon: 20.079016 },
  { name: "Maribor, Slovenia", lat: 46.554650, lon: 15.645881 },
  { name: "Ferentino, Italy", lat: 41.765685, lon: 13.233647 },
  { name: "Racibórz, Poland", lat: 50.091160, lon: 18.219565 }

  // Add more as needed
]

function latLngToVector3(lat, lon, radius) {
  const phi = (90 - lat) * (Math.PI / 180)
  const theta = (lon + 180) * (Math.PI / 180)

  const x = -radius * Math.sin(phi) * Math.cos(theta)
  const y = radius * Math.cos(phi)
  const z = radius * Math.sin(phi) * Math.sin(theta)

  return new THREE.Vector3(x, y, z)
}

function addPinsFromLocations(locationsArray, parentGroup, earthRadius = 10.2) {
  const loader = new THREE.TextureLoader()
  const pinTexture = loader.load('https://cdn-icons-png.flaticon.com/512/684/684908.png')

  locationsArray.forEach((loc) => {
    const pinMaterial = new THREE.SpriteMaterial({ map: pinTexture, color: 0xffffff })
    const pin = new THREE.Sprite(pinMaterial)
    pin.scale.set(0.4, 0.4, 0.1)

    const position = latLngToVector3(loc.lat, loc.lon, earthRadius)
    pin.position.copy(position)

    parentGroup.add(pin)
  })
}



global.THREE = THREE
// previously this feature is .legacyMode = false, see https://www.donmccurdy.com/2020/06/17/color-management-in-threejs/
// turning this on has the benefit of doing certain automatic conversions (for hexadecimal and CSS colors from sRGB to linear-sRGB)
THREE.ColorManagement.enabled = true

/**************************************************
 * 0. Tweakable parameters for the scene
 *************************************************/
const params = {
  // general scene params
  sunIntensity: 1.3, // brightness of the sun
  speedFactor: 2.0, // rotation speed of the earth
  metalness: 0.1,
  atmOpacity: { value: 0.7 },
  atmPowFactor: { value: 4.1 },
  atmMultiplier: { value: 9.5 },
}


/**************************************************
 * 1. Initialize core threejs components
 *************************************************/
// Create the scene
let scene = new THREE.Scene()

// Create the renderer via 'createRenderer',
// 1st param receives additional WebGLRenderer properties
// 2nd param receives a custom callback to further configure the renderer
let renderer = createRenderer({ antialias: true }, (_renderer) => {
  // best practice: ensure output colorspace is in sRGB, see Color Management documentation:
  // https://threejs.org/docs/#manual/en/introduction/Color-management
  _renderer.outputColorSpace = THREE.SRGBColorSpace
})

// Create the camera
// Pass in fov, near, far and camera position respectively
let camera = createCamera(45, 1, 1000, { x: 0, y: 0, z: 30 })


/**************************************************
 * 2. Build your scene in this threejs app
 * This app object needs to consist of at least the async initScene() function (it is async so the animate function can wait for initScene() to finish before being called)
 * initScene() is called after a basic threejs environment has been set up, you can add objects/lighting to you scene in initScene()
 * if your app needs to animate things(i.e. not static), include a updateScene(interval, elapsed) function in the app as well
 *************************************************/
let app = {
  async initScene() {
    // OrbitControls
    this.controls = new OrbitControls(camera, renderer.domElement)
    this.controls.minDistance = 12  // minimum zoom distance (can't zoom closer than this)
this.controls.maxDistance = 100 
    this.controls.enableDamping = true

    // adding a virtual sun using directional light
    // this.dirLight = new THREE.DirectionalLight(0xffffff, params.sunIntensity)
    // this.dirLight.position.set(-50, 0, 30)
    // scene.add(this.dirLight)

    scene.add(new THREE.AmbientLight(0xffffff, 1.1));


    // updates the progress bar to 10% on the loading UI
    await updateLoadingProgressBar(0.1)

    // loads earth's color map, the basis of how our earth looks like
    const albedoMap = await loadTexture(Albedo)
    albedoMap.colorSpace = THREE.SRGBColorSpace
    await updateLoadingProgressBar(0.2)

    const bumpMap = await loadTexture(Bump)
    await updateLoadingProgressBar(0.3)
    
    const cloudsMap = await loadTexture(Clouds)
    await updateLoadingProgressBar(0.4)

    const oceanMap = await loadTexture(Ocean)
    await updateLoadingProgressBar(0.5)

    const lightsMap = await loadTexture(NightLights)
    await updateLoadingProgressBar(0.6)

    const envMap = await loadTexture(GaiaSky)
    envMap.mapping = THREE.EquirectangularReflectionMapping
    await updateLoadingProgressBar(0.7)
    
    scene.background = envMap

    // create group for easier manipulation of objects(ie later with clouds and atmosphere added)
    this.group = new THREE.Group()
    // earth's axial tilt is 23.5 degrees
    this.group.rotation.z = 0 / 360 * 2 * Math.PI
    
    let earthGeo = new THREE.SphereGeometry(10, 64, 64)
    let earthMat = new THREE.MeshStandardMaterial({
      map: albedoMap,
      bumpMap: bumpMap,
      bumpScale: 0.03, // must be really small, if too high even bumps on the back side got lit up
      roughnessMap: oceanMap, // will get reversed in the shaders
      metalness: params.metalness, // gets multiplied with the texture values from metalness map
      metalnessMap: oceanMap,
      emissiveMap: null,
      emissive: new THREE.Color(0x000000),
    })
    this.earth = new THREE.Mesh(earthGeo, earthMat)
    this.group.add(this.earth)
    
    let cloudGeo = new THREE.SphereGeometry(10.05, 64, 64)
    let cloudsMat = new THREE.MeshStandardMaterial({
      alphaMap: cloudsMap,
      transparent: true,
    })
    this.clouds = new THREE.Mesh(cloudGeo, cloudsMat)
    this.group.add(this.clouds)
    

    addPinsFromLocations(locations, this.group)



    // set initial rotational position of earth to get a good initial angle
    this.group.rotation.y = -0.3


    let atmosGeo = new THREE.SphereGeometry(12.5, 64, 64)
    let atmosMat = new THREE.ShaderMaterial({
      vertexShader: vertexShader,
      fragmentShader: fragmentShader,
      uniforms: {
        atmOpacity: params.atmOpacity,
        atmPowFactor: params.atmPowFactor,
        atmMultiplier: params.atmMultiplier
      },
      // notice that by default, Three.js uses NormalBlending, where if your opacity of the output color gets lower, the displayed color might get whiter
      blending: THREE.AdditiveBlending, // works better than setting transparent: true, because it avoids a weird dark edge around the earth
      side: THREE.BackSide // such that it does not overlays on top of the earth; this points the normal in opposite direction in vertex shader
    })
    this.atmos = new THREE.Mesh(atmosGeo, atmosMat)
    this.group.add(this.atmos)

    scene.add(this.group)

    // meshphysical.glsl.js is the shader used by MeshStandardMaterial: https://github.com/mrdoob/three.js/blob/dev/src/renderers/shaders/ShaderLib/meshphysical.glsl.js
    // shadowing of clouds, from https://discourse.threejs.org/t/how-to-cast-shadows-from-an-outer-sphere-to-an-inner-sphere/53732/6
    // some notes of the negative light map done on the earth material to simulate shadows casted by clouds
    // we need uv_xOffset so as to act as a means to calibrate the offset of the clouds shadows on earth(especially when earth and cloud rotate at different speeds)
    // the way I need to use fracts here is to get a correct calculated result of the cloud texture offset as it moves,
    // arrived at current method by doing the enumeration of cases (writing them down truly helps, don't keep everything in your head!)
    earthMat.onBeforeCompile = function( shader ) {
      shader.uniforms.tClouds = { value: cloudsMap }
      shader.uniforms.tClouds.value.wrapS = THREE.RepeatWrapping;
      shader.uniforms.uv_xOffset = { value: 0 }
      shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `
        #include <common>
        uniform sampler2D tClouds;
        uniform float uv_xOffset;
      `);
      shader.fragmentShader = shader.fragmentShader.replace('#include <roughnessmap_fragment>', `
        float roughnessFactor = roughness;

        #ifdef USE_ROUGHNESSMAP

          vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
          // reversing the black and white values because we provide the ocean map
          texelRoughness = vec4(1.0) - texelRoughness;

          // reads channel G, compatible with a combined OcclusionRoughnessMetallic (RGB) texture
          roughnessFactor *= clamp(texelRoughness.g, 0.5, 1.0);

        #endif
      `);
     shader.fragmentShader = shader.fragmentShader.replace('#include <emissivemap_fragment>', '');

      // need save to userData.shader in order to enable our code to update values in the shader uniforms,
      // reference from https://github.com/mrdoob/three.js/blob/master/examples/webgl_materials_modified.html
      earthMat.userData.shader = shader
    }

    // GUI controls
    // const gui = new dat.GUI()
    // gui.add(params, "sunIntensity", 0.0, 5.0, 0.1).onChange((val) => {
    //   this.dirLight.intensity = val
    // }).name("Sun Intensity")
    // gui.add(params, "metalness", 0.0, 1.0, 0.05).onChange((val) => {
    //   earthMat.metalness = val
    // }).name("Ocean Metalness")
    // gui.add(params, "speedFactor", 0.1, 20.0, 0.1).name("Rotation Speed")
    // gui.add(params.atmOpacity, "value", 0.0, 1.0, 0.05).name("atmOpacity")
    // gui.add(params.atmPowFactor, "value", 0.0, 20.0, 0.1).name("atmPowFactor")
    // gui.add(params.atmMultiplier, "value", 0.0, 20.0, 0.1).name("atmMultiplier")

    // Stats - show fps
    // this.stats1 = new Stats()
    // this.stats1.showPanel(1) // Panel 0 = fps
    // this.stats1.domElement.style.cssText = "position:absolute;top:0px;left:0px;"
    // // this.container is the parent DOM element of the threejs canvas element
    // this.container.appendChild(this.stats1.domElement)

    await updateLoadingProgressBar(1.0, 100)
  },
  // @param {number} interval - time elapsed between 2 frames
  // @param {number} elapsed - total time elapsed since app start
  updateScene(interval, elapsed) {
    this.controls.update()
    // this.stats1.update()

    // use rotateY instead of rotation.y so as to rotate by axis Y local to each mesh
// REMOVE IF PRESENT:
this.group.rotation.y += interval * 0.005 * params.speedFactor


    const shader = this.earth.material.userData.shader
    if ( shader ) {
      // As for each n radians Point X has rotated, Point Y would have rotated 2n radians.
      // Thus uv.x of Point Y would always be = uv.x of Point X - n / 2π.
      // Dividing n by 2π is to convert from radians(i.e. 0 to 2π) into the uv space(i.e. 0 to 1).
      // The offset n / 2π would be passed into the shader program via the uniform variable: uv_xOffset.
      // We do offset % 1 because the value of 1 for uv.x means full circle,
      // whenever uv_xOffset is larger than one, offsetting 2π radians is like no offset at all.
      let offset = (interval * 0.005 * params.speedFactor) / (2 * Math.PI)
      shader.uniforms.uv_xOffset.value += offset % 1
    }
  }
}

/**************************************************
 * 3. Run the app
 * 'runApp' will do most of the boilerplate setup code for you:
 * e.g. HTML container, window resize listener, mouse move/touch listener for shader uniforms, THREE.Clock() for animation
 * Executing this line puts everything together and runs the app
 * ps. if you don't use custom shaders, pass undefined to the 'uniforms'(2nd-last) param
 * ps. if you don't use post-processing, pass undefined to the 'composer'(last) param
 *************************************************/
runApp(app, scene, renderer, camera, true, undefined, undefined)
