import axios from 'axios';

const API_BASE = 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 60000, // 60s timeout for large uploads / model inference
});

// === Types ===
export interface LibraryImage {
  image_id: string;
  filename: string;
  file_path: string;
  image_url: string;
  created_at: string;
}

export interface SearchResult {
  image_id: string;
  filename: string;
  file_path: string;
  image_url: string;
  similarity_score: number;
  similarity_score_percentage: number;
  created_at: string;
}

export interface UploadResponse {
  uploaded: number;
  failed: number;
  results: { image_id: string; filename: string; status: string }[];
  errors: { filename: string; error: string }[];
}

export interface SearchResponse {
  query_filename: string;
  total_results: number;
  results: SearchResult[];
}

export interface StatsResponse {
  library_size: number;
  feature_dimension: number;
  model: string;
}

// === API Functions ===

/** Upload images to the library */
export async function uploadToLibrary(
  files: File[],
  onProgress?: (percent: number) => void
): Promise<UploadResponse> {
  const formData = new FormData();
  files.forEach((file) => formData.append('files', file));

  const response = await api.post<UploadResponse>('/api/library/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (e) => {
      if (e.total && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    },
  });
  return response.data;
}

/** List all library images */
export async function listLibrary(): Promise<{ total: number; images: LibraryImage[] }> {
  const response = await api.get('/api/library');
  return response.data;
}

/** Delete a library image */
export async function deleteLibraryImage(imageId: string): Promise<void> {
  await api.delete(`/api/library/${imageId}`);
}

/** Search for similar images */
export async function searchSimilar(
  file: File,
  topN: number = 10
): Promise<SearchResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await api.post<SearchResponse>(`/api/search?top_n=${topN}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
}

/** Get system stats */
export async function getStats(): Promise<StatsResponse> {
  const response = await api.get<StatsResponse>('/api/stats');
  return response.data;
}

/** Get full image URL */
export function getImageUrl(imageUrl: string): string {
  return `${API_BASE}${imageUrl}`;
}

export default api;
