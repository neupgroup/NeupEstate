const UPLOAD_ENDPOINTS = [
  "https://cdn.neupgroup.com/bridge/api/v1/upload",
  "https://cdn.neupgroup.com/bridge/api/v1/upload.php",
];

type UploadPropertyMediaOptions = {
  file: File;
  platform: string;
  contentIds?: string[];
  name?: string;
};

function stripExtension(filename: string): string {
  return filename.replace(/\.[^.]+$/, "");
}

async function parseUploadError(response: Response): Promise<string> {
  const responseClone = response.clone();

  try {
    const payload = await responseClone.json();
    if (payload && typeof payload === "object" && "message" in payload && typeof payload.message === "string") {
      return payload.message;
    }
  } catch {
    // Fall through to plain text.
  }

  try {
    const text = await response.text();
    return text.trim() || `Upload failed with status ${response.status}.`;
  } catch {
    return `Upload failed with status ${response.status}.`;
  }
}

export async function uploadPropertyMediaFile(options: UploadPropertyMediaOptions): Promise<string> {
  const normalizedPlatform = options.platform.trim();
  if (!normalizedPlatform) {
    throw new Error("Upload platform is required.");
  }

  const normalizedContentIds = (options.contentIds ?? []).map((id) => id.trim()).filter(Boolean);
  const baseName = stripExtension((options.name || options.file.name || "upload").trim()) || "upload";

  let lastError: Error | null = null;

  for (const endpoint of UPLOAD_ENDPOINTS) {
    const formData = new FormData();
    formData.append("file", options.file);
    formData.append("platform", normalizedPlatform);
    if (normalizedContentIds.length > 0) {
      formData.append("contentIds", JSON.stringify(normalizedContentIds));
    }
    formData.append("name", baseName);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(await parseUploadError(response));
      }

      const payload = await response.json();
      if (!payload || typeof payload !== "object" || payload.success !== true || typeof payload.url !== "string") {
        throw new Error("Upload completed but the server did not return a file URL.");
      }

      return payload.url;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Upload failed.");
    }
  }

  throw lastError ?? new Error("Upload failed.");
}
