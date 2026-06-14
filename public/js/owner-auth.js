/**
 * Redirige al dueño según sesión: dashboard si ya tiene mascotas, registro si no.
 */
async function resolveOwnerDestination(token, options = {}) {
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

async function redirectOwnerIfAuthenticated() {
    const token = sessionStorage.getItem("honey_owner_jwt");
    if (!token) return;
    const dest = await resolveOwnerDestination(token);
    window.location.replace(dest);
}
