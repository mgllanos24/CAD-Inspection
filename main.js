import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { ImportManager, SetOCCTWorkerUrl } from 'occt-import-js';
import { Viewer } from 'rev-viewer';

let scene, camera, renderer, controls, currentModel, revViewer;
let currentFileName = '';

const viewerContainer = document.getElementById('viewer-container');
const revViewerContainer = document.getElementById('rev-viewer-container');
const fileInput = document.getElementById('file-input');
const loaderElement = document.getElementById('loader');
const conversionLoaderElement = document.getElementById('conversion-loader');
const convertBtn = document.getElementById('convert-btn');
const downloadLink = document.getElementById('download-link');

// Set occt-import-js worker path for local vendor copy
SetOCCTWorkerUrl('./vendor/occt-import-js/occt-import-js-worker.js');

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

function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    resetUI();
    loaderElement.classList.remove('hidden');

    currentFileName = file.name;
    const extension = file.name.split('.').pop().toLowerCase();

    if (extension === 'stp' || extension === 'step') {
        showThreeJsViewer();
        const reader = new FileReader();
        reader.onload = (e) => {
            const fileContent = e.target.result;
            loadStepModel(file.name, fileContent);
        };
        reader.readAsArrayBuffer(file);
    } else if (extension === 'sldprt') {
        showRevViewer();
        convertBtn.classList.remove('hidden');
        loadSldprtModel(file);
    } else {
        alert('Unsupported file format.');
        loaderElement.classList.add('hidden');
    }
}

async function handleConversion() {
    conversionLoaderElement.classList.remove('hidden');
    convertBtn.classList.add('hidden');

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
        downloadLink.href = URL.createObjectURL(dummyStpContent);
        downloadLink.download = stpFileName;
        downloadLink.textContent = `Download ${stpFileName}`;
        downloadLink.classList.remove('hidden');

        conversionLoaderElement.classList.add('hidden');
        
        alert("SLDPRT to STP conversion is a complex process requiring a server-side converter.\n\nThis is a demonstration of the UI flow. A placeholder model is shown, and you can download a dummy STP file.");

    }, 1500);
}

async function loadStepModel(fileName, fileContent) {
    if (currentModel) {
        scene.remove(currentModel);
        currentModel.traverse(child => {
            if (child.isMesh) {
                child.geometry.dispose();
                child.material.dispose();
            }
        });
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
        }
    } catch (error) {
        console.error('An error occurred during model import:', error);
        alert('An unexpected error occurred. Check the console for details.');
    } finally {
        loaderElement.classList.add('hidden');
        fileInput.value = ''; // Reset file input
    }
}

async function loadSldprtModel(file) {
    if (revViewer) {
        revViewer.dispose();
    }
    revViewerContainer.innerHTML = '';

    try {
        revViewer = new Viewer(revViewerContainer);
        await revViewer.load(file);
    } catch (error) {
        console.error('An error occurred during SLDPRT model import:', error);
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
