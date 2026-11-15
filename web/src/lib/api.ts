export const API = process.env.NEXT_PUBLIC_API ?? ""

export async function post<T>(path: string, body: unknown, signal?: AbortSignal): Promise<T> {
  const r = await fetch(`${API}/api${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), signal })
  if (!r.ok) throw new Error(`${path}: ${r.status}`)
  return r.json()
}
export async function get<T>(path: string, signal?: AbortSignal): Promise<T> {
  const r = await fetch(`${API}/api${path}`, { signal })
  if (!r.ok) throw new Error(`${path}: ${r.status}`)
  return r.json()
}
