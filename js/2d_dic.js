import * as THREE from 'three';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';

let py_file;
async function fetchPyFile() {
    const response = await fetch("python/2d_dic.py");
    py_file = await response.text();
}
fetchPyFile();

let spinner = document.getElementById("spinner");
let video = document.getElementById("video");
let live_view = document.getElementById("live_view");
let live_view_ctx = live_view.getContext("2d");

let renderer1, renderer2;
let scene1, camera1;
let scene2, camera2;
let displacementArrows;

let nx;
let ny;
let im1;
let im2;
let nDIC_x, nDIC_y;
let nodePositions = [];
let e_h = [];
let e_v = [];

let camera_settings;
let offscreenCtx;
let pyodide;

let params = {
    arrow_scale : 10,
    nodeSpacing : 32,
};

function streamVideoToCanvas() {
    function drawFrame() {
        live_view_ctx.drawImage(video, 0, 0, nx, ny);
        requestAnimationFrame(drawFrame);
    }
    drawFrame();
}

navigator.mediaDevices.getUserMedia({ video: true })
    .then(stream => {
        video.srcObject = stream;
        camera_settings = stream.getVideoTracks()[0].getSettings();
        camera_settings.aspect_ratio = camera_settings.height / camera_settings.width;

        init_three();
        init_pyodide();
        live_view.width = nx;
        live_view.height = ny;
        video.addEventListener("play", streamVideoToCanvas);
    })
    .catch(err => console.error("Error accessing camera: ", err));

function captureFrame() {
    offscreenCtx.drawImage(video, 0, 0, nx, ny);
    return offscreenCtx.getImageData(0, 0, nx, ny).data; // Returns pixel array
}

document.getElementById('capture1').addEventListener('click', () => {
    im1 = captureFrame();
    updateImagePlane(scene1, im1)
    renderer1.render(scene1, camera1);
});

document.getElementById('capture2').style.display = 'none';
document.getElementById('capture2').addEventListener('click', () => {
    im2 = captureFrame();
    updateImagePlane(scene2, im2)
    renderer2.render(scene2, camera2);
    DIC();
});

function init_three() {

    const offscreenCanvas = document.createElement("canvas");
    offscreenCanvas.width = 400;//camera_settings.width;
    offscreenCanvas.height = 400 * camera_settings.aspect_ratio;
    offscreenCtx = offscreenCanvas.getContext("2d");
    displacementArrows = new THREE.Group();

    nx = 400;
    ny = nx * camera_settings.aspect_ratio;
    nDIC_x = Math.floor(nx / params.nodeSpacing) - 1; // offset to account for the fact that the grid starts at half a nodeSpacing
    nDIC_y = Math.floor(ny / params.nodeSpacing) - 1;
    im1 = new Uint8ClampedArray(nx * ny * 4); // rgba
    im2 = new Uint8ClampedArray(nx * ny * 4); // rgba
    for (let i = 0; i < nDIC_x; i++) {
        for (let j = 0; j < nDIC_y; j++) {
            nodePositions.push([0, params.nodeSpacing / 2 + i * params.nodeSpacing - nx / 2, params.nodeSpacing / 2 + j * params.nodeSpacing - ny / 2]);
            e_h.push(0);
            e_v.push(0);
        }
    }

    for (let i = 0; i < nx * ny * 4; i += 4) {
        im1[i] = 255 * Math.random();
        im1[i + 1] = im1[i];
        im1[i + 2] = im1[i];
        im1[i + 3] = 255;
    }
    let offset = 4; // offset for the displacement in px
    for (let i = 0; i < nx * ny * 4 - offset * 4; i += 4) {
        im2[i] = im1[i + offset * 4] || im1[i];
        im2[i + 1] = im1[i + 1 + offset * 4] || im1[i + 1];
        im2[i + 2] = im1[i + 2 + offset * 4] || im1[i + 2];
        im2[i + 3] = 255;
    }

    renderer1 = createRenderer(document.getElementById("canvas1"));
    renderer2 = createRenderer(document.getElementById("canvas2"));
    [scene1, camera1] = createScene(renderer1);
    [scene2, camera2] = createScene(renderer2);

    createImagePlane(scene1, im1, nx, ny);
    createImagePlane(scene2, im2, nx, ny);
    generateArrows();
    renderer1.render(scene1, camera1);
    renderer2.render(scene2, camera2);

    let gui = new GUI();
    gui.add(params, 'arrow_scale', 0, 1000).onChange(() => update_arrows());
    // gui.add(params, 'nodeSpacing', 8, 128,1).onChange(() => {
    //     nDIC_x = Math.floor(nx / params.nodeSpacing) - 1;
    //     nDIC_y = Math.floor(ny / params.nodeSpacing) - 1;
    //     nodePositions = [];
    //     e_h = [];
    //     e_v = [];
    //     for (let i = 0; i < nDIC_x; i++) {
    //         for (let j = 0; j < nDIC_y; j++) {
    //             nodePositions.push([0, params.nodeSpacing / 2 + i * params.nodeSpacing - nx / 2, params.nodeSpacing / 2 + j * params.nodeSpacing - ny / 2]);
    //             e_h.push(0);
    //             e_v.push(0);
    //         }
    //     }
    //     displacementArrows.clear();
    //     generateArrows();
    //     renderer2.render(scene2, camera2);
    // });
}



function createRenderer(canvas) {
    let renderer = new THREE.WebGLRenderer({ canvas });
    renderer.setSize(nx, ny);
    return renderer;
}

function createScene(renderer) {
    let scene = new THREE.Scene();
    let camera = new THREE.OrthographicCamera(-nx / 2, nx / 2, ny / 2, -ny / 2, 1, 1000);
    camera.position.z = 5;
    camera.rotation.z = Math.PI;
    return [scene, camera];
}

function createImagePlane(scene, data, width, height) {
    let texture = new THREE.DataTexture(data, width, height, THREE.RGBAFormat);
    texture.needsUpdate = true;
    texture.colorSpace = THREE.SRGBColorSpace;
    let geometry = new THREE.PlaneGeometry(width, height);
    let material = new THREE.MeshBasicMaterial({ map: texture });
    let plane = new THREE.Mesh(geometry, material);
    scene.add(plane);
}



function updateImagePlane(scene, data) {
    scene.children[0].material.map.image.data.set(data);
    scene.children[0].material.map.needsUpdate = true;
}

// function animate() {
//     requestAnimationFrame(animate);
//     renderer1.render(scene1, camera1);
//     renderer2.render(scene2, camera2);
// }

async function init_pyodide() {
    pyodide = await loadPyodide();
    await pyodide.loadPackage("micropip");
    const micropip = pyodide.pyimport("micropip");
    await micropip.install("http://localhost:8000/assets/spam-0.7.1.0-cp312-cp312-pyodide_2024_0_wasm32.whl");
    pyodide.globals.set('im1', im1);
    pyodide.globals.set('im2', im2);
    pyodide.globals.set('nodeSpacing', params.nodeSpacing);
    pyodide.globals.set('nx', nx);
    pyodide.globals.set('ny', ny);
    pyodide.ready = true;
    let loadingSpan = document.getElementById('loadingSpan');
    loadingSpan.style.display = 'none';
    document.getElementById('capture2').style.display = 'block';
    return pyodide;
}

async function DIC() {
    // let pyodide = await pyodideP;
    if (pyodide !== undefined && pyodide.ready) {
        // e_h = e_h.map(() => 0);
        // e_v = e_v.map(() => 0);
        // update_arrows();
        spinner.style.display = "block";
        displacementArrows.visible = false;
        renderer2.render(scene2, camera2);

        await pyodide.runPythonAsync(py_file);

        e_h = pyodide.globals.get('e_h').toJs();
        e_v = pyodide.globals.get('e_v').toJs();
        // console.log(e_h);
        // console.log(e_v);
        nodePositions = pyodide.globals.get('nodePositions').toJs();
        spinner.style.display = "none";
        update_arrows();

        // renderer1.render(scene1, camera1);
        renderer2.render(scene2, camera2);
    }
}

function generateArrows() {
    console.log("Generating " + nodePositions.length + " arrows");
    for (let n = 0; n < nodePositions.length; n++) {
        let i = nodePositions[n][1];
        let j = nodePositions[n][2];
        createArrow(i, j, e_h[n], e_v[n]);
        // console.log(i, j, e_h[n], e_v[n]);
    }
    scene2.add(displacementArrows);
    displacementArrows.visible = false;
}

function update_arrows() {
    for (let i = 0; i < displacementArrows.children.length; i++) {
        let arrow = displacementArrows.children[i];
        let e_h_val = e_h[i];
        let e_v_val = e_v[i];
        arrow.setLength(params.arrow_scale * Math.sqrt(e_h_val * e_h_val + e_v_val * e_v_val));
        arrow.setDirection(new THREE.Vector3(e_h_val, e_v_val, 0).normalize());
    }
    displacementArrows.visible = true;
    renderer2.render(scene2, camera2);
}

function Arrow(dir, origin, length, color) {
    let coneGeometry = new THREE.ConeGeometry(4, 10, 8);
    let coneMaterial = new THREE.MeshBasicMaterial({ color: color });
    let cone = new THREE.Mesh(coneGeometry, coneMaterial);

    let lineGeometry = new LineGeometry();
    lineGeometry.setPositions([0, 0, 0, 0, 1, 0]);
    let lineMaterial = new LineMaterial({ color: color, linewidth: 2 });
    let line = new Line2(lineGeometry, lineMaterial);

    let arrow = new THREE.Group();
    arrow.add(line);
    arrow.add(cone);

    cone.position.y = 10;

    arrow.position.copy(origin);
    arrow.setDirection = function (dir) {
        let axis = new THREE.Vector3(0, 1, 0).cross(dir);
        let angle = Math.acos(new THREE.Vector3(0, 1, 0).dot(dir));
        arrow.quaternion.setFromAxisAngle(axis.normalize(), angle);
    };
    arrow.setLength = function (length) {
        line.scale.y = length;
        cone.position.y = length;
    };

    arrow.setDirection(dir);
    arrow.setLength(length);

    return arrow;
}

function createArrow(x, y, e_h, e_v) {
    let dir = new THREE.Vector3(e_h, e_v, 0);
    dir.normalize();
    let origin = new THREE.Vector3(x, y, 0);
    let length = params.arrow_scale * Math.sqrt(e_h * e_h + e_v * e_v);
    let color = new THREE.Color(0xff0000);
    let arrow = Arrow(dir, origin, length, color);
    arrow.position.set(x, y, 0);
    displacementArrows.add(arrow);
}