"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// nip96.ts
var nip96_exports = {};
__export(nip96_exports, {
  calculateFileHash: () => calculateFileHash,
  checkFileProcessingStatus: () => checkFileProcessingStatus,
  deleteFile: () => deleteFile,
  generateDownloadUrl: () => generateDownloadUrl,
  generateFSPEventTemplate: () => generateFSPEventTemplate,
  readServerConfig: () => readServerConfig,
  uploadFile: () => uploadFile,
  validateDelayedProcessingResponse: () => validateDelayedProcessingResponse,
  validateFileUploadResponse: () => validateFileUploadResponse,
  validateServerConfiguration: () => validateServerConfiguration
});
module.exports = __toCommonJS(nip96_exports);
var import_sha256 = require("@noble/hashes/sha256");

// kinds.ts
var FileServerPreference = 10096;

// nip96.ts
var import_utils = require("@noble/hashes/utils");
function validateServerConfiguration(config) {
  if (Boolean(config.api_url) == false) {
    return false;
  }
  if (Boolean(config.delegated_to_url) && Boolean(config.api_url)) {
    return false;
  }
  return true;
}
async function readServerConfig(serverUrl) {
  const HTTPROUTE = "/.well-known/nostr/nip96.json";
  let fetchUrl = "";
  try {
    const { origin } = new URL(serverUrl);
    fetchUrl = origin + HTTPROUTE;
  } catch (error) {
    throw new Error("Invalid URL");
  }
  try {
    const response = await fetch(fetchUrl);
    if (!response.ok) {
      throw new Error(`Error fetching ${fetchUrl}: ${response.statusText}`);
    }
    const data = await response.json();
    if (!data) {
      throw new Error("No data");
    }
    if (!validateServerConfiguration(data)) {
      throw new Error("Invalid configuration data");
    }
    return data;
  } catch (_) {
    throw new Error(`Error fetching.`);
  }
}
function validateFileUploadResponse(response) {
  if (typeof response !== "object" || response === null)
    return false;
  if (!response.status || !response.message) {
    return false;
  }
  if (response.status !== "success" && response.status !== "error" && response.status !== "processing") {
    return false;
  }
  if (typeof response.message !== "string") {
    return false;
  }
  if (response.status === "processing" && !response.processing_url) {
    return false;
  }
  if (response.processing_url) {
    if (typeof response.processing_url !== "string") {
      return false;
    }
  }
  if (response.status === "success" && !response.nip94_event) {
    return false;
  }
  if (response.nip94_event) {
    if (!response.nip94_event.tags || !Array.isArray(response.nip94_event.tags) || response.nip94_event.tags.length === 0) {
      return false;
    }
    for (const tag of response.nip94_event.tags) {
      if (!Array.isArray(tag) || tag.length !== 2)
        return false;
      if (typeof tag[0] !== "string" || typeof tag[1] !== "string")
        return false;
    }
    if (!response.nip94_event.tags.find((t) => t[0] === "url")) {
      return false;
    }
    if (!response.nip94_event.tags.find((t) => t[0] === "ox")) {
      return false;
    }
  }
  return true;
}
async function uploadFile(file, serverApiUrl, nip98AuthorizationHeader, optionalFormDataFields) {
  const formData = new FormData();
  optionalFormDataFields && Object.entries(optionalFormDataFields).forEach(([key, value]) => {
    if (value) {
      formData.append(key, value);
    }
  });
  formData.append("file", file);
  const response = await fetch(serverApiUrl, {
    method: "POST",
    headers: {
      Authorization: nip98AuthorizationHeader
    },
    body: formData
  });
  if (response.ok === false) {
    if (response.status === 413) {
      throw new Error("File too large!");
    }
    if (response.status === 400) {
      throw new Error("Bad request! Some fields are missing or invalid!");
    }
    if (response.status === 403) {
      throw new Error("Forbidden! Payload tag does not match the requested file!");
    }
    if (response.status === 402) {
      throw new Error("Payment required!");
    }
    throw new Error("Unknown error in uploading file!");
  }
  try {
    const parsedResponse = await response.json();
    if (!validateFileUploadResponse(parsedResponse)) {
      throw new Error("Invalid response from the server!");
    }
    return parsedResponse;
  } catch (error) {
    throw new Error("Error parsing JSON response!");
  }
}
function generateDownloadUrl(fileHash, serverDownloadUrl, fileExtension) {
  let downloadUrl = `${serverDownloadUrl}/${fileHash}`;
  if (fileExtension) {
    downloadUrl += fileExtension;
  }
  return downloadUrl;
}
async function deleteFile(fileHash, serverApiUrl, nip98AuthorizationHeader) {
  if (!serverApiUrl.endsWith("/")) {
    serverApiUrl += "/";
  }
  const deleteUrl = `${serverApiUrl}${fileHash}`;
  const response = await fetch(deleteUrl, {
    method: "DELETE",
    headers: {
      Authorization: nip98AuthorizationHeader
    }
  });
  if (!response.ok) {
    throw new Error("Error deleting file!");
  }
  try {
    return await response.json();
  } catch (error) {
    throw new Error("Error parsing JSON response!");
  }
}
function validateDelayedProcessingResponse(response) {
  if (typeof response !== "object" || response === null)
    return false;
  if (!response.status || !response.message || !response.percentage) {
    return false;
  }
  if (response.status !== "processing" && response.status !== "error") {
    return false;
  }
  if (typeof response.message !== "string") {
    return false;
  }
  if (typeof response.percentage !== "number") {
    return false;
  }
  if (Number(response.percentage) < 0 || Number(response.percentage) > 100) {
    return false;
  }
  return true;
}
async function checkFileProcessingStatus(processingUrl) {
  const response = await fetch(processingUrl);
  if (!response.ok) {
    throw new Error(`Failed to retrieve processing status. Server responded with status: ${response.status}`);
  }
  try {
    const parsedResponse = await response.json();
    if (response.status === 201) {
      if (!validateFileUploadResponse(parsedResponse)) {
        throw new Error("Invalid response from the server!");
      }
      return parsedResponse;
    }
    if (response.status === 200) {
      if (!validateDelayedProcessingResponse(parsedResponse)) {
        throw new Error("Invalid response from the server!");
      }
      return parsedResponse;
    }
    throw new Error("Invalid response from the server!");
  } catch (error) {
    throw new Error("Error parsing JSON response!");
  }
}
function generateFSPEventTemplate(serverUrls) {
  serverUrls = serverUrls.filter((serverUrl) => {
    try {
      new URL(serverUrl);
      return true;
    } catch (error) {
      return false;
    }
  });
  return {
    kind: FileServerPreference,
    content: "",
    tags: serverUrls.map((serverUrl) => ["server", serverUrl]),
    created_at: Math.floor(Date.now() / 1e3)
  };
}
async function calculateFileHash(file) {
  return (0, import_utils.bytesToHex)((0, import_sha256.sha256)(new Uint8Array(await file.arrayBuffer())));
}
