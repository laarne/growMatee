import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { decode } from "base64-arraybuffer";
import { supabase } from "./supabase";

type PublicImageBucket = "avatars" | "listing-photos" | "garden-photos" | "feed-photos";
type PrivateFileBucket = "verification-docs" | "regulated-plant-permits";

export type PickedImage = {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
  base64?: string | null;
  fileSize?: number | null;
};

export type UploadedImage = {
  path: string;
  publicUrl: string;
};

export type PickedDocument = {
  uri: string;
  fileName: string;
  mimeType: string | null;
  fileSize?: number | null;
};

export async function pickImageFromLibrary(): Promise<PickedImage | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (!permission.granted) {
    throw new Error("Photo library permission is required to upload images.");
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    allowsEditing: true,
    base64: true,
    mediaTypes: ["images"],
    quality: 0.85,
  });

  if (result.canceled) {
    return null;
  }

  const asset = result.assets[0];

  return {
    uri: asset.uri,
    fileName: asset.fileName,
    mimeType: asset.mimeType,
    base64: asset.base64,
    fileSize: asset.fileSize,
  };
}

export async function takePhotoWithCamera(): Promise<PickedImage | null> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();

  if (!permission.granted) {
    throw new Error("Camera permission is required to take photos.");
  }

  const result = await ImagePicker.launchCameraAsync({
    allowsEditing: true,
    base64: true,
    mediaTypes: ["images"],
    quality: 0.85,
  });

  if (result.canceled) {
    return null;
  }

  const asset = result.assets[0];

  return {
    uri: asset.uri,
    fileName: asset.fileName,
    mimeType: asset.mimeType,
    base64: asset.base64,
    fileSize: asset.fileSize,
  };
}

export async function pickPermitDocument(): Promise<PickedDocument | null> {
  const result = await DocumentPicker.getDocumentAsync({
    copyToCacheDirectory: true,
    multiple: false,
    type: ["application/pdf", "image/jpeg", "image/png", "image/webp"],
  });

  if (result.canceled) {
    return null;
  }

  const asset = result.assets[0];

  return {
    uri: asset.uri,
    fileName: asset.name,
    mimeType: asset.mimeType ?? null,
    fileSize: asset.size ?? null,
  };
}

function getFileExtension(image: PickedImage) {
  const fromName = image.fileName?.split(".").pop();
  if (fromName) return fromName.toLowerCase();

  const fromUri = image.uri.split("?")[0].split(".").pop();
  if (fromUri && fromUri.length <= 5) return fromUri.toLowerCase();

  if (image.mimeType?.includes("png")) return "png";
  if (image.mimeType?.includes("webp")) return "webp";

  return "jpg";
}

export async function uploadPublicImage(bucket: PublicImageBucket, userId: string, folder: string, image: PickedImage): Promise<UploadedImage> {
  if (!supabase) throw new Error("Supabase is not configured.");
  if (!image.base64) throw new Error("Selected image could not be prepared for upload.");
  if (image.fileSize && image.fileSize > 6 * 1024 * 1024) {
    throw new Error("Image is too large. Please choose a photo under 6 MB.");
  }

  const extension = getFileExtension(image);
  if (!["jpg", "jpeg", "png", "webp"].includes(extension)) {
    throw new Error("Unsupported image type. Please upload a JPG, PNG, or WebP photo.");
  }
  const path = `${userId}/${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;
  const fileData = decode(image.base64);
  const contentType = image.mimeType ?? (extension === "png" ? "image/png" : extension === "webp" ? "image/webp" : "image/jpeg");

  const { error } = await supabase.storage.from(bucket).upload(path, fileData, {
    contentType,
    upsert: false,
  });

  if (error) {
    throw error;
  }

  const publicUrl = supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;

  return { path, publicUrl };
}

export async function uploadPrivateImage(bucket: PrivateFileBucket, userId: string, folder: string, image: PickedImage): Promise<{ path: string }> {
  if (!supabase) throw new Error("Supabase is not configured.");
  if (!image.base64) throw new Error("Selected image could not be prepared for upload.");
  if (image.fileSize && image.fileSize > 6 * 1024 * 1024) {
    throw new Error("Image is too large. Please choose a photo under 6 MB.");
  }

  const extension = getFileExtension(image);
  if (!["jpg", "jpeg", "png", "webp"].includes(extension)) {
    throw new Error("Unsupported image type. Please upload a JPG, PNG, or WebP photo.");
  }

  const path = `${userId}/${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;
  const fileData = decode(image.base64);
  const contentType = image.mimeType ?? (extension === "png" ? "image/png" : extension === "webp" ? "image/webp" : "image/jpeg");

  const { error } = await supabase.storage.from(bucket).upload(path, fileData, {
    contentType,
    upsert: false,
  });

  if (error) throw error;
  return { path };
}

function getDocumentExtension(document: PickedDocument) {
  const fromName = document.fileName.split(".").pop();
  if (fromName) return fromName.toLowerCase();

  if (document.mimeType === "application/pdf") return "pdf";
  if (document.mimeType?.includes("png")) return "png";
  if (document.mimeType?.includes("webp")) return "webp";

  return "jpg";
}

function sanitizeFileName(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 80);
}

export async function uploadPrivateDocument(bucket: PrivateFileBucket, userId: string, folder: string, document: PickedDocument): Promise<{ path: string }> {
  if (!supabase) throw new Error("Supabase is not configured.");
  if (document.fileSize && document.fileSize > 10 * 1024 * 1024) {
    throw new Error("Document is too large. Please upload a file under 10 MB.");
  }

  const extension = getDocumentExtension(document);
  const allowedTypes = ["pdf", "jpg", "jpeg", "png", "webp"];

  if (!allowedTypes.includes(extension)) {
    throw new Error("Unsupported document type. Please upload a PDF, JPG, PNG, or WebP file.");
  }

  const fileData = await fetch(document.uri).then((response) => response.arrayBuffer());
  const contentType =
    document.mimeType ??
    (extension === "pdf" ? "application/pdf" : extension === "png" ? "image/png" : extension === "webp" ? "image/webp" : "image/jpeg");
  const path = `${userId}/${folder}/${Date.now()}-${sanitizeFileName(document.fileName)}`;

  const { error } = await supabase.storage.from(bucket).upload(path, fileData, {
    contentType,
    upsert: false,
  });

  if (error) throw error;
  return { path };
}

export async function createPrivateImageSignedUrl(bucket: PrivateFileBucket, path: string | null | undefined, expiresInSeconds = 300): Promise<string | null> {
  if (!supabase || !path) return null;
  if (/^https?:\/\//i.test(path)) return path;

  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresInSeconds);
  if (error) {
    throw error;
  }

  return data.signedUrl;
}
