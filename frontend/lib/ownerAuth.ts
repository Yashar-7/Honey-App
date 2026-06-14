export async function resolveOwnerDestination(
  token: string,
  options: { forceRegister?: boolean } = {},
): Promise<string> {
  const { forceRegister = false } = options;
  if (forceRegister) return "/registro";

  try {
    const res = await fetch("/api/owner/war-room", {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.status === 401) {
      sessionStorage.removeItem("honey_owner_jwt");
      sessionStorage.removeItem("honey_owner_email");
      sessionStorage.removeItem("honey_owner_name");
      return "/login";
    }

    if (!res.ok) return "/registro";

    const data = await res.json();
    const hasPets = Array.isArray(data.pets) && data.pets.length > 0;
    return hasPets ? "/dashboard" : "/registro";
  } catch {
    return "/registro";
  }
}
