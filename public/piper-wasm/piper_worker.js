// worker_blob_cache.js
var getBlob = async (url, blobs) => new Promise((resolve) => {
  const cached = blobs[url];
  if (cached)
    return resolve(cached);
  const id = new Date().getTime();
  let xContentLength;
  self.postMessage({ kind: "fetch", id, url });
  const xhr = new XMLHttpRequest;
  xhr.responseType = "blob";
  xhr.onprogress = (event) => self.postMessage({
    kind: "fetch",
    id,
    url,
    total: xContentLength ?? event.total,
    loaded: event.loaded
  });
  xhr.onreadystatechange = () => {
    if (xhr.readyState >= xhr.HEADERS_RECEIVED && xContentLength === undefined && xhr.getAllResponseHeaders().includes("x-content-length"))
      xContentLength = Number(xhr.getResponseHeader("x-content-length"));
    if (xhr.readyState === xhr.DONE) {
      self.postMessage({ kind: "fetch", id, url, blob: xhr.response });
      resolve(xhr.response);
    }
  };
  xhr.open("GET", url);
  xhr.send();
});

// piper_worker.js
const cachedState = {
  modelUrl: null,
  modelConfig: null,
  session: null,
  phonemeIdMap: null,
  idPhonemeMap: null
};

async function phonemize(data, modelConfig) {
  const { input, blobs } = data;

  // 1. Initialize Cache (Once)
  if (!cachedState.piperPhonemizeModule) {
    const piperPhonemizeJs = URL.createObjectURL(await getBlob(data.piperPhonemizeJsUrl, blobs));
    const piperPhonemizeWasm = URL.createObjectURL(await getBlob(data.piperPhonemizeWasmUrl, blobs));
    // Store the BLOB URL for the data file, as the WASM module will request it via locateFile
    cachedState.piperPhonemizeDataUrl = URL.createObjectURL(await getBlob(data.piperPhonemizeDataUrl, blobs));

    importScripts(piperPhonemizeJs);

    // Create the module ONCE
    cachedState.piperPhonemizeModule = await createPiperPhonemize({
      print: (data2) => {
        if (cachedState.pendingResolve) {
          cachedState.pendingResolve(JSON.parse(data2).phoneme_ids);
          cachedState.pendingResolve = null;
        }
      },
      printErr: (message) => {
        self.postMessage({ kind: "stderr", message });
      },
      locateFile: (url) => {
        if (url.endsWith(".wasm")) return piperPhonemizeWasm;
        if (url.endsWith(".data")) return cachedState.piperPhonemizeDataUrl;
        return url;
      }
    });
  }

  // 2. Run Phonemization (Reused)
  return new Promise((resolve) => {
    // Store the resolve function so the 'print' callback can find it
    // Note: This simple approach assumes single-threaded sequential execution of phonemize calls,
    // which is true for this worker structure.
    cachedState.pendingResolve = resolve;

    cachedState.piperPhonemizeModule.callMain([
      "-l",
      modelConfig.espeak.voice,
      "--input",
      JSON.stringify([{ text: input }]),
      "--espeak_data",
      "/espeak-ng-data"
    ]);
  });
}

async function prepareSession(data) {
  const { modelUrl, modelConfigUrl, onnxruntimeUrl, blobs } = data;

  // Return cached if model hasn't changed
  if (cachedState.session && cachedState.modelUrl === modelUrl) {
    return;
  }

  self.postMessage({ kind: "stderr", message: "Loading model into memory..." });

  // Load Config
  if (!cachedState.modelConfig || cachedState.modelUrl !== modelUrl) {
    const modelConfigBlob = await getBlob(modelConfigUrl, blobs);
    cachedState.modelConfig = JSON.parse(await modelConfigBlob.text());

    // Compute Maps
    const phonemeIdMap = Object.entries(cachedState.modelConfig.phoneme_id_map);
    cachedState.idPhonemeMap = Object.fromEntries(phonemeIdMap.map(([k, v]) => [v[0], k]));
  }

  // Load ORT if needed
  if (typeof ort === 'undefined') {
    const onnxruntimeJs = URL.createObjectURL(await getBlob(`${onnxruntimeUrl}ort.min.js`, blobs));
    importScripts(onnxruntimeJs);
    ort.env.wasm.numThreads = 1;
    ort.env.wasm.wasmPaths = onnxruntimeUrl;
  }

  // Load Session
  if (!cachedState.session || cachedState.modelUrl !== modelUrl) {
    const modelBlob = await getBlob(modelUrl, blobs);
    const session = await ort.InferenceSession.create(URL.createObjectURL(modelBlob), { executionProviders: ["wasm"] });

    cachedState.session = session;
    cachedState.modelUrl = modelUrl;
    self.postMessage({ kind: "stderr", message: "Model loaded and session created successfully." });
  }
}

async function runInference(phonemeIds, speakerId, input) {
  const { session, modelConfig, idPhonemeMap } = cachedState;
  if (!session || !modelConfig) throw new Error("Session not initialized");

  const phonemes = phonemeIds.map((id) => idPhonemeMap[id]);

  const feeds = {
    input: new ort.Tensor("int64", phonemeIds, [1, phonemeIds.length]),
    input_lengths: new ort.Tensor("int64", [phonemeIds.length]),
    scales: new ort.Tensor("float32", [
      modelConfig.inference.noise_scale,
      modelConfig.inference.length_scale,
      modelConfig.inference.noise_w
    ])
  };

  if (Object.keys(modelConfig.speaker_id_map).length) {
    feeds.sid = new ort.Tensor("int64", [speakerId || 0]);
  }

  const { output: { data: pcm } } = await session.run(feeds);

  return { pcm, phonemes };
}

function pcmToWav(pcm, sampleRate, numChannels) {
  const bufferLength = pcm.length;
  const headerLength = 44;
  const view = new DataView(new ArrayBuffer(bufferLength * numChannels * 2 + headerLength));

  // WAV Header
  view.setUint32(0, 1179011410, true); // RIFF
  view.setUint32(4, view.buffer.byteLength - 8, true);
  view.setUint32(8, 1163280727, true); // WAVE
  view.setUint32(12, 544501094, true); // fmt 
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, numChannels * 2 * sampleRate, true);
  view.setUint16(32, numChannels * 2, true);
  view.setUint16(34, 16, true);
  view.setUint32(36, 1635017060, true); // data
  view.setUint32(40, 2 * bufferLength, true);

  let p = headerLength;
  for (let i = 0; i < bufferLength; i++) {
    const v = pcm[i];
    view.setInt16(p, v >= 1 ? 32767 : v <= -1 ? -32768 : v * 32768 | 0, true);
    p += 2;
  }
  return { wavBuffer: view.buffer, duration: bufferLength / (sampleRate * numChannels) };
}

// --- Message Handlers ---

async function init(data) {
  try {
    await prepareSession(data); // Ensures session is loaded

    // Run specific warmup or standard inference
    const phonemeIds = data.phonemeIds ?? await phonemize(data, cachedState.modelConfig);

    const { pcm, phonemes } = await runInference(phonemeIds, data.speakerId, data.input);
    const { wavBuffer, duration } = pcmToWav(pcm, cachedState.modelConfig.audio.sample_rate, 1);

    self.postMessage({
      kind: "output",
      input: data.input,
      file: new Blob([wavBuffer], { type: "audio/x-wav" }),
      duration: Math.floor(duration * 1000),
      phonemes,
      phonemeIds
    });
    self.postMessage({ kind: "complete" });

  } catch (err) {
    self.postMessage({ kind: "stderr", message: "Init failed: " + err.message });
  }
}

async function generate(data) {
  if (!cachedState.session) {
    self.postMessage({ kind: "stderr", message: "Session not initialized. Call init first." });
    return;
  }

  try {
    // Skip all blob loading, use cached config
    const phonemeIds = await phonemize(data, cachedState.modelConfig);
    const { pcm, phonemes } = await runInference(phonemeIds, data.speakerId, data.input);
    const { wavBuffer, duration } = pcmToWav(pcm, cachedState.modelConfig.audio.sample_rate, 1);

    self.postMessage({
      kind: "output",
      input: data.input,
      file: new Blob([wavBuffer], { type: "audio/x-wav" }),
      duration: Math.floor(duration * 1000),
      phonemes,
      phonemeIds
    });
    self.postMessage({ kind: "complete" });

  } catch (err) {
    self.postMessage({ kind: "stderr", message: "Generate failed: " + err.message });
  }
}

self.addEventListener("message", (event) => {
  const data = event.data;
  if (data.kind === "init") init(data);
  if (data.kind === "generate") generate(data);
});
