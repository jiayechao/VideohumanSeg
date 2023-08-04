// Copyright 2023 The MediaPipe Authors.

// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at

//      http://www.apache.org/licenses/LICENSE-2.0

// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import vision from "./assets/vision_bundle.mjs";
const { ImageSegmenter, SegmentationMask, FilesetResolver } = vision;


// Get DOM elements
const video = document.getElementById("webcam")
const bg = document.getElementsByClassName('bg')[0]
const canvasElement = document.getElementById("canvas")
const canvasCtx = canvasElement.getContext("2d")
const canvasElement1 = document.getElementById("canvas1")
const canvasCtx1 = canvasElement1.getContext("2d");
let enableWebcamButton
let webcamRunning = false;
let runningMode = "VIDEO"; // "IMAGE" | "VIDEO" 
let width = 640, height = 480

let imageSegmenter, legendColors;


function createBgData() {
  const videoCanvas = document.createElement('canvas')
  const videoCanvasCtx = videoCanvas.getContext('2d')
  videoCanvas.width = width
  videoCanvas.height = height
  console.log(bg.clientWidth)
  videoCanvasCtx.drawImage(bg, 0, 0, bg.clientWidth,
    bg.clientHeight,
    0,
    0,
    width, 
    height)
  legendColors = videoCanvasCtx.getImageData(
    0,
    0,
    width,
    height 
  ).data;
}

createBgData()


// legendColors = [
//   [255, 197, 0, 255], // Vivid Yellow
//   [128, 62, 117, 255], // Strong Purple
//   [255, 104, 0, 255], // Vivid Orange
//   [166, 189, 215, 255], // Very Light Blue
//   [193, 0, 32, 255], // Vivid Red
//   [206, 162, 98, 255], // Grayish Yellow
//   [129, 112, 102, 255], // Medium Gray
//   [0, 125, 52, 255], // Vivid Green
//   [246, 118, 142, 255], // Strong Purplish Pink
//   [0, 83, 138, 255], // Strong Blue
//   [255, 112, 92, 255], // Strong Yellowish Pink
//   [83, 55, 112, 255], // Strong Violet
//   [255, 142, 0, 255], // Vivid Orange Yellow
//   [179, 40, 81, 255], // Strong Purplish Red
//   [244, 200, 0, 255], // Vivid Greenish Yellow
//   [127, 24, 13, 255], // Strong Reddish Brown
//   [147, 170, 0, 255], // Vivid Yellowish Green
//   [89, 51, 21, 255], // Deep Yellowish Brown
//   [241, 58, 19, 255], // Vivid Reddish Orange
//   [35, 44, 22, 255], // Dark Olive Green
//   [0, 161, 194, 255], // Vivid Blue
//   [0, 161, 194, 255]
// ];

const createImageSegmenter = async () => {
  const audio = await FilesetResolver.forVisionTasks(
    "./assets/wasm"
  );

  imageSegmenter = await ImageSegmenter.createFromOptions(audio, {
    baseOptions: {
      modelAssetPath:
        "./models/selfie_segmenter.tflite",
      delegate: "GPU"
    },
    runningMode: runningMode,
    outputCategoryMask: true,
    outputConfidenceMasks: false
  });
};
createImageSegmenter();

async function callbackForVideo(result) {
  let imageData = canvasCtx.getImageData(
    0,
    0,
    video.videoWidth,
    video.videoHeight
  ).data;
  // 分割后的掩码
  const mask = result.categoryMask.getAsFloat32Array();
  // const mask = result.confidenceMasks[0].getAsFloat32Array();
  let j = 0;
  // 针对掩码做一个像素混合
  for (let i = 0; i < mask.length; ++i) {
    const maskVal = mask[i] // Math.round(mask[i] * 255.0);
    // 需要混合的颜色
    const legendColor = legendColors
    //const legendColor = legendColors[maskVal % legendColors.length];
    // for (let i = 0; i < mask.length; ++i) {
  //   const maskVal = Math.round(mask[i] * 255.0);
  //   const legendColor = legendColors[maskVal % legendColors.length];
  //   imageData[j] = (legendColor[0] + imageData[j]) / 2;
  //   imageData[j + 1] = (legendColor[1] + imageData[j + 1]) / 2;
  //   imageData[j + 2] = (legendColor[2] + imageData[j + 2]) / 2;
  //   imageData[j + 3] = (legendColor[3] + imageData[j + 3]) / 2;
  //   j += 4;
  // }
    if(maskVal === 1) {
      imageData[j] = legendColor[j]
      imageData[j + 1] = legendColor[j + 1]
      imageData[j + 2] = legendColor[j + 2]
      imageData[j + 3] = Math.round(maskVal * 255.0);
    }
    j += 4;
  }
  const uint8Array = new Uint8ClampedArray(imageData.buffer);
  const dataNew = new ImageData(
    uint8Array,
    video.videoWidth,
    video.videoHeight
  );
  canvasCtx1.putImageData(dataNew, 0, 0);

  if (webcamRunning === true) {
    window.requestAnimationFrame(predictWebcam);
  }
}


function hasGetUserMedia() {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}

let lastWebcamTime = -1;
async function predictWebcam() {
  if (video.currentTime === lastWebcamTime) {
    if (webcamRunning === true) {
      window.requestAnimationFrame(predictWebcam);
    }
    return;
  }
  lastWebcamTime = video.currentTime;

  canvasCtx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);

  if (imageSegmenter === undefined) {
    return;
  }

  let startTimeMs = performance.now();


  imageSegmenter.segmentForVideo(video, startTimeMs, callbackForVideo);

}


async function enableCam(event) {
  if (imageSegmenter === undefined) {
    return;
  }

  if (webcamRunning === true) {
    webcamRunning = false;
    enableWebcamButton.innerText = "开启";
  } else {
    webcamRunning = true;
    enableWebcamButton.innerText = "关闭";
  }

  const constraints = {
    video: true,
    // audio: true
  };

  video.srcObject = await navigator.mediaDevices.getUserMedia(constraints);
  
  video.addEventListener("loadeddata", predictWebcam);
}


if (hasGetUserMedia()) {
  enableWebcamButton = document.getElementById(
    "webcamButton"
  );
  enableWebcamButton.addEventListener("click", enableCam);
} else {
  console.warn("getUserMedia() is not supported by your browser");
}
