import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE || '/api/v1';

const client = axios.create({ baseURL: API_BASE });

// ── Buckets ──

export function listBuckets() {
  return client.get('/');
}

export function createBucket(name) {
  return client.put(`/${encodeURIComponent(name)}`);
}

export function bucketExists(name) {
  return client.head(`/${encodeURIComponent(name)}`);
}

export function deleteBucket(name) {
  return client.delete(`/${encodeURIComponent(name)}`);
}

// ── Objects ──

export function listObjects(bucket, prefix = '') {
  const params = prefix ? { prefix } : {};
  return client.get(`/${encodeURIComponent(bucket)}`, { params });
}

export function uploadObject(bucket, key, file, onProgress) {
  const form = new FormData();
  form.append('file', file);
  return client.put(`/${encodeURIComponent(bucket)}/${encodeURIComponent(key)}`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: onProgress,
  });
}

export function getPresignedUrl(bucket, key, expiry = 3600) {
  return client.get(`/${encodeURIComponent(bucket)}/${encodeURIComponent(key)}`, {
    params: { presigned: 'true', expiry },
  });
}

export function downloadUrl(bucket, key) {
  return `${API_BASE}/${encodeURIComponent(bucket)}/${encodeURIComponent(key)}`;
}

export function deleteObject(bucket, key) {
  return client.delete(`/${encodeURIComponent(bucket)}/${encodeURIComponent(key)}`);
}
