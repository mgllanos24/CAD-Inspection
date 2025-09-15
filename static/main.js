import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { ImportManager, SetOCCTWorkerUrl } from 'occt-import-js';
// Import the CAD viewing mode from the bundled rev-viewer library.
// The real library exposes `CADMode` which we map through the import
// map to our local vendor copy.
import { CADMode } from 'rev-viewer';
import { createHandleFileSelect } from './handleFileSelect.js';

let scene, camera, renderer, controls, currentModel, revViewer;
let currentFileName = '';
let currentObjectUrl = null;
let objectUrlRevokeTimeout = null;
let errorBanner = null;

const viewerContainer = document.getElementById('viewer-container');
const revViewerContainer = document.getElementById('rev-viewer-container');
const fileInput = document.getElementById('file-input');
const loaderElement = document.getElementById('loader');
const conversionLoaderElement = document.getElementById('conversion-loader');
const convertBtn = document.getElementById('convert-btn');
const downloadLink = document.getElementById('download-link');

// Set occt-import-js worker path for local vendor copy
SetOCCTWorkerUrl(
    new URL('./vendor/occt-import-js/occt-import-js-worker.js', import.meta.url).href
);

// Log asset loading failures (e.g., missing modules or 404 responses)
// to help users diagnose which resource failed and why.
window.addEventListener('error', (event) => {
    const asset = event.target?.src || event.filename;
    if (asset) {
        console.error(`Failed to load asset "${asset}":`, event.message || event.error);

        if (!errorBanner) {
            errorBanner = document.createElement('div');
            errorBanner.style.position = 'fixed';
            errorBanner.style.top = '0';
            errorBanner.style.left = '0';
            errorBanner.style.width = '100%';
            errorBanner.style.backgroundColor = '#c0392b';
            errorBanner.style.color = '#fff';
            errorBanner.style.padding = '8px';
            errorBanner.style.textAlign = 'center';
            errorBanner.style.zIndex = '1000';
            document.body.appendChild(errorBanner);
        }

        errorBanner.textContent = `Failed to load asset "${asset}". See console for details.`;
    }
}, true);

window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    alert('An unexpected error occurred. Check the console for details.');
});

function init() {
    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x282c34);

    // Camera
    camera = new THREE.PerspectiveCamera(75, viewerContainer.clientWidth / viewerContainer.clientHeight, 0.1, 2000);
    camera.position.set(10, 10, 10);

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(viewerContainer.clientWidth, viewerContainer.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    viewerContainer.appendChild(renderer.domElement);

    // Controls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const directionalLight1 = new THREE.DirectionalLight(0xffffff, 0.6);
    directionalLight1.position.set(5, 10, 7.5);
    scene.add(directionalLight1);
    
    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.3);
    directionalLight2.position.set(-5, -10, -7.5);
    scene.add(directionalLight2);

    // Handle window resize
    window.addEventListener('resize', onWindowResize, false);

    // File input listener
    fileInput.addEventListener('change', handleFileSelect, false);
    convertBtn.addEventListener('click', handleConversion, false);

    animate();
}

function onWindowResize() {
    if (!viewerContainer.classList.contains('hidden')) {
        camera.aspect = viewerContainer.clientWidth / viewerContainer.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(viewerContainer.clientWidth, viewerContainer.clientHeight);
    }
}

function animate() {
    requestAnimationFrame(animate);
    if (!viewerContainer.classList.contains('hidden')) {
        controls.update();
        renderer.render(scene, camera);
    }
}

function resetUI() {
    convertBtn.classList.add('hidden');
    downloadLink.classList.add('hidden');
    downloadLink.href = '';
    downloadLink.download = '';
    downloadLink.textContent = '';
    currentFileName = '';
}

async function handleConversion() {
    conversionLoaderElement.classList.remove('hidden');
    convertBtn.classList.add('hidden');

    if (currentObjectUrl) {
        URL.revokeObjectURL(currentObjectUrl);
        currentObjectUrl = null;
    }
    if (objectUrlRevokeTimeout) {
        clearTimeout(objectUrlRevokeTimeout);
        objectUrlRevokeTimeout = null;
    }

    // Simulate conversion delay
    setTimeout(() => {
        showThreeJsViewer();
        if (currentModel) {
            scene.remove(currentModel);
        }
        
        // As a placeholder, show a simple cube to represent the converted model.
        const geometry = new THREE.BoxGeometry(5, 5, 5);
        const material = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
        currentModel = new THREE.Mesh(geometry, material);
        scene.add(currentModel);
        centerCamera(currentModel);

        // Create a dummy file for download
        const stpFileName = currentFileName.replace(/\.[^/.]+$/, "") + ".stp";
        const dummyStpContent = new Blob(["This is a placeholder for the converted STP file."], { type: 'text/plain' });
        currentObjectUrl = URL.createObjectURL(dummyStpContent);
        downloadLink.href = currentObjectUrl;
        downloadLink.download = stpFileName;
        downloadLink.textContent = `Download ${stpFileName}`;
        downloadLink.classList.remove('hidden');

        downloadLink.addEventListener(
            'click',
            () => {
                setTimeout(() => {
                    if (currentObjectUrl) {
                        URL.revokeObjectURL(currentObjectUrl);
                        currentObjectUrl = null;
                    }
                }, 0);
            },
            { once: true }
        );

        objectUrlRevokeTimeout = setTimeout(() => {
            if (currentObjectUrl) {
                URL.revokeObjectURL(currentObjectUrl);
                currentObjectUrl = null;
            }
        }, 60000);

        conversionLoaderElement.classList.add('hidden');

        alert("SLDPRT to STP conversion is a complex process requiring a server-side converter.\n\nThis is a demonstration of the UI flow. A placeholder model is shown, and you can download a dummy STP file.");

    }, 1500);
}

async function loadStepModel(fileName, fileContent) {
    console.log(`Loading STEP model: ${fileName}`);
    if (currentModel) {
        scene.remove(currentModel);
        currentModel.traverse(child => {
            if (child.isMesh) {
                child.geometry.dispose();
                child.geometry = null;

                const materials = Array.isArray(child.material) ? child.material : [child.material];
                materials.forEach(material => {
                    if (!material) return;
                    const textureProps = [
                        'map',
                        'normalMap',
                        'roughnessMap',
                        'metalnessMap',
                        'bumpMap',
                        'alphaMap',
                        'aoMap',
                        'displacementMap',
                        'emissiveMap',
                        'lightMap',
                        'envMap',
                        'specularMap',
                        'gradientMap'
                    ];
                    textureProps.forEach(prop => {
                        if (material[prop]) {
                            material[prop].dispose();
                            material[prop] = null;
                        }
                    });
                    material.dispose();
                });
                child.material = null;
            }
        });
        currentModel = null;
    }

    const importManager = new ImportManager();
    try {
        const result = await importManager.import(fileName, new Uint8Array(fileContent));
        if (result.isSuccess && result.root) {
            currentModel = result.root;
            scene.add(currentModel);
            centerCamera(currentModel);
        } else {
            console.error('Failed to load model:', result.message);
            alert('Error: Could not load the model. Check the console for details.');
            currentModel = null;
        }
    } catch (error) {
        console.error(`An error occurred during STEP model import for "${fileName}":`, error);
        alert('An unexpected error occurred. Check the console for details.');
        currentModel = null;
    } finally {
        loaderElement.classList.add('hidden');
        fileInput.value = ''; // Reset file input
    }
}

async function loadSldprtModel(file) {
    const fileName = file.name;
    console.log(`Loading SLDPRT model: ${fileName}`);
    if (revViewer) {
        revViewer.dispose();
    }
    revViewerContainer.innerHTML = '';

    try {
        revViewer = new CADMode(revViewerContainer);
        await revViewer.load(file);
    } catch (error) {
        console.error(`An error occurred during SLDPRT model import for "${fileName}":`, error);
        alert('An unexpected error occurred while loading the SLDPRT file. Check the console for details.');
    } finally {
        loaderElement.classList.add('hidden');
        fileInput.value = ''; // Reset file input
    }
}

function showThreeJsViewer() {
    viewerContainer.classList.remove('hidden');
    revViewerContainer.classList.add('hidden');
    if (revViewer) {
        revViewer.dispose();
        revViewer = null;
    }
    revViewerContainer.innerHTML = '';
}

function showRevViewer() {
    viewerContainer.classList.add('hidden');
    revViewerContainer.classList.remove('hidden');
}

const handleFileSelect = createHandleFileSelect({
    resetUI,
    showThreeJsViewer,
    showRevViewer,
    loadStepModel,
    loadSldprtModel,
    loaderElement,
    conversionLoaderElement,
    fileInput,
    convertBtn,
    alertFn: alert,
    setCurrentFileName: (name) => { currentFileName = name; },
});

function centerCamera(object) {
    const box = new THREE.Box3().setFromObject(object);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    
    const fov = camera.fov * (Math.PI / 180);
    let cameraDistance = Math.abs(maxDim / 2 / Math.tan(fov / 2));
    
    // Padding
    cameraDistance *= 1.5;

    const direction = controls.target.clone().sub(camera.position).normalize().multiplyScalar(cameraDistance);
    camera.position.copy(center).sub(direction);
    camera.far = Math.max(cameraDistance * 2, 2000);
    camera.updateProjectionMatrix();
    
    controls.target.copy(center);
    controls.update();
}

init();
