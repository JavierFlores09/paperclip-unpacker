const FILL_API = "https://fill.papermc.io/v3/projects/paper";

export async function fetchVersions(): Promise<string[]> {
  const res = await fetch(FILL_API);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return Object.values(data.versions).flat() as string[];
}

export async function fetchLatestBuild(version: string): Promise<any> {
  const res = await fetch(`${FILL_API}/versions/${version}/builds/latest`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}
