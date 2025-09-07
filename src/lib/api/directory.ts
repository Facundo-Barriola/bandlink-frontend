const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export type UpdateStudioProfilePatch = {
  displayName?: string;          
  bio?: string | null;
  legalName?: string | null;
  phone?: string | null;
  website?: string | null;
  cancellationPolicy?: string | null;
  openingHours?: Record<string, any> | null;
  amenities?: number[];
};


export type StudioUpdateResult = {
    ok: true;
    idStudio: number;
    idUserProfile: number;
    legalName: string | null;
    phone: string | null;
    website: string | null;
    isVerified: boolean;
    openingHours: any | null;
    cancellationPolicy: string | null;
    displayName: string;
    bio: string | null;
    avatarUrl: string | null;
    idAddress: number | null;
    latitude: number | null;
    longitude: number | null;
    updatedStudioAt: string;
    updatedProfileAt: string;
};


export type StudioRoom = {
    idRoom: number;
    idStudio: number;
    roomName: string;
    capacity: number | null;
    hourlyPrice: number;
    notes: string | null;
    equipment: any | null;
};

export async function apiUpdateStudio(
    studioId: number,
    patch: UpdateStudioProfilePatch
): Promise<StudioUpdateResult> {
    const res = await fetch(`${API_URL}/directory/studios/${studioId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(patch),
        cache: "no-store",
    });
    const j = await res.json();
    if (!res.ok || !j?.ok) throw new Error(j?.error || "update_failed");
    return j.data as StudioUpdateResult;
}

export type EditRoomPayload = {
  roomName?: string | null;
  capacity?: number | null;
  hourlyPrice?: number | null;
  notes?: string | null;
  equipment?: any | null; // jsonb (puede ser array de strings)
};

export async function apiEditRoom(roomId: number, payload: EditRoomPayload) {
  const res = await fetch(`${API_URL}/directory/rooms/${roomId}`, {
    method: "PUT",
    credentials: "include",              // ← usa cookie de sesión
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json?.ok) {
    const msg = json?.error || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return json.data as {
    idRoom: number;
    idStudio: number;
    roomName: string;
    capacity: number | null;
    hourlyPrice: number;
    notes: string | null;
    equipment: any | null;
  };
}