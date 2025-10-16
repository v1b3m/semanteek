import axios from "axios";
import { loadConfig } from "./config";
export const QDRANT_URL = "http://localhost:6333";

export async function ensureCollection(
  dimension: number = 384,
  distance: string = "Cosine"
) {
  const cfg = await loadConfig();
  const collection = cfg?.collection;
  try {
    await axios.get(`${QDRANT_URL}/collections/${collection}`);
  } catch {
    await axios.put(`${QDRANT_URL}/collections/${collection}`, {
      vectors: { size: dimension, distance: distance },
    });
  }
}

export async function upsert(
  points: Array<{ id: string; vector: number[]; payload: any }>
) {
  try {
    const cfg = await loadConfig();
    const collection = cfg?.collection;
    await axios.put(
      `${QDRANT_URL}/collections/${collection}/points?wait=true`,
      {
        batch: {
          ids: points.map((p) => p.id),
          vectors: points.map((p) => p.vector),
          payloads: points.map((p) => p.payload),
        },
      }
    );
  } catch (e: any) {
    if (e.response?.data?.status?.error) {
      throw new Error(`Qdrant: ${e.response.data.status.error}`);
    }
    throw e;
  }
}

export async function search(vector: number[], topK = 10) {
  const cfg = await loadConfig();
  const collection = await cfg?.collection;
  const res = await axios.post(
    `${QDRANT_URL}/collections/${collection}/points/search`,
    {
      vector,
      limit: topK,
      with_payload: true,
    }
  );
  return res.data.result;
}
