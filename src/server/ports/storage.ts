export type IssueUploadUrlInput = {
  filename: string;
  contentType: string;
  sizeBytes: number;
};

export type IssueUploadUrlResult = {
  uploadUrl: string;
  blobUrl: string;
};

export interface StoragePort {
  issueUploadUrl(input: IssueUploadUrlInput): Promise<IssueUploadUrlResult>;
  resolveVideoUrl(key: string): Promise<string>;
}
