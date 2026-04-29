import type { StoragePort } from "@/server/ports/storage";

export const stubStorage: StoragePort = {
  async issueUploadUrl() {
    return { uploadUrl: "/sample.mp4", blobUrl: "/sample.mp4" };
  },
  async resolveVideoUrl() {
    return "/sample.mp4";
  },
};
