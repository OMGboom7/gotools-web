import axios, { AxiosProgressEvent } from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE || '/api/v1';

const client = axios.create({ baseURL: API_BASE });

// ── Types ──

export interface BucketItem {
  name: string;
  creation_date: string;
}

export interface BucketListResponse {
  buckets: BucketItem[];
}

export interface BucketCreateResponse {
  name: string;
  creation_date: string;
}

export interface ObjectItem {
  key: string;
  size: number;
  last_modified: string;
  content_type: string;
  etag: string;
}

export interface ObjectListResponse {
  objects: ObjectItem[];
}

export interface ObjectUploadResponse {
  key: string;
  bucket: string;
  size: number;
  etag: string;
  content_type: string;
}

export interface PresignedURLResponse {
  bucket: string;
  object: string;
  presigned_url: string;
}

// ── Buckets ──

export function listBuckets() {
  return client.get<BucketListResponse>('/');
}

export function createBucket(name: string) {
  return client.put<BucketCreateResponse>(`/${encodeURIComponent(name)}`);
}

export function deleteBucket(name: string) {
  return client.delete(`/${encodeURIComponent(name)}`);
}

// ── Objects ──

export function listObjects(bucket: string, prefix = '') {
  const params: Record<string, string> = {};
  if (prefix) params.prefix = prefix;
  return client.get<ObjectListResponse>(`/${encodeURIComponent(bucket)}`, { params });
}

export function uploadObject(
  bucket: string,
  key: string,
  file: File,
  onProgress?: (e: AxiosProgressEvent) => void,
) {
  const form = new FormData();
  form.append('file', file);
  return client.put<ObjectUploadResponse>(
    `/${encodeURIComponent(bucket)}/${encodeURIComponent(key)}`,
    form,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: onProgress,
    },
  );
}

export function getPresignedUrl(bucket: string, key: string, expiry = 3600) {
  return client.get<PresignedURLResponse>(
    `/${encodeURIComponent(bucket)}/${encodeURIComponent(key)}`,
    { params: { presigned: 'true', expiry } },
  );
}

export function downloadUrl(bucket: string, key: string): string {
  return `${API_BASE}/${encodeURIComponent(bucket)}/${encodeURIComponent(key)}`;
}

export function deleteObject(bucket: string, key: string) {
  return client.delete(`/${encodeURIComponent(bucket)}/${encodeURIComponent(key)}`);
}
