import * as ImagePicker from "expo-image-picker";
import { supabase } from "./supabase";

type PublicImageBucket = "avatars" | "listing-photos" | "garden-photos" | "feed-photos";

export type PickedImage = {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
  base64?: string | null;
};

export type UploadedImage = {
  path: string;
  publicUrl: string;
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

function uriToBlob(uri: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.onload = function () {
      resolve(xhr.response);
    };
    xhr.onerror = function () {
      reject(new Error("Unable to resolve local image file."));
    };
    xhr.responseType = "blob";
    xhr.open("GET", uri, true);
    xhr.send(null);
  });
}

export async function uploadPublicImage(bucket: PublicImageBucket, userId: string, folder: string, image: PickedImage): Promise<UploadedImage> {
  if (!supabase) throw new Error("Supabase is not configured.");

  const extension = getFileExtension(image);
  const path = `${userId}/${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;
  const blob = await uriToBlob(image.uri);
  const contentType = image.mimeType ?? (extension === "png" ? "image/png" : extension === "webp" ? "image/webp" : "image/jpeg");

  const { error } = await supabase.storage.from(bucket).upload(path, blob, {
    contentType,
    upsert: false,
  });

  if (error) {
    throw error;
  }

  const publicUrl = supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;

  return { path, publicUrl };
}
