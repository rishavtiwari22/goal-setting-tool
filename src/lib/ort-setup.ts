import * as ort from "onnxruntime-web";

// Configure WASM paths to use local files from public/ort
// This must run BEFORE piper-tts-web is imported/initialized
ort.env.wasm.wasmPaths = "/ort/";

// Force single-threaded execution to avoid SharedArrayBuffer/COOP/COEP issues
ort.env.wasm.numThreads = 1;
ort.env.wasm.proxy = false;

// Set the ort globally for piper-tts-web to use
(globalThis as any).ort = ort;

console.log("[Setup] ONNX Runtime configured with local WASM paths");
