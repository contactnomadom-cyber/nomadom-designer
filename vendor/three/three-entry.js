import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { Sky } from 'three/examples/jsm/objects/Sky.js';
import { WebGLPathTracer, ProceduralEquirectTexture } from 'three-gpu-pathtracer';
window.THREEKIT = { THREE, GLTFLoader, RoomEnvironment, Sky, WebGLPathTracer, ProceduralEquirectTexture };
