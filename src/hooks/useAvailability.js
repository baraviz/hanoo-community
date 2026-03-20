/**
 * useAvailability — React Query hooks with optimistic updates for parking availability.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

// ─── Query keys ────────────────────────────────────────────────────────────
export const availKeys = {
  all: (email) => ["availability", email],
  recurring: (email) => ["availability", email, "recurring"],
  temp: (email) => ["availability", email, "temp"],
  block: (email) => ["availability", email, "block"],
};

// ─── Fetchers ───────────────────────────────────────────────────────────────
export function useRecurringSlots(email) {
  return useQuery({
    queryKey: availKeys.recurring(email),
    queryFn: () => base44.entities.WeeklyAvailability.filter({ owner_email: email, slot_type: "recurring" }),
    enabled: !!email,
    staleTime: 30_000,
  });
}

export function useTempSlots(email) {
  return useQuery({
    queryKey: availKeys.temp(email),
    queryFn: async () => {
      const slots = await base44.entities.WeeklyAvailability.filter({ owner_email: email, slot_type: "temp" });
      return slots.filter(s => new Date(s.end_at) > new Date());
    },
    enabled: !!email,
    staleTime: 15_000,
  });
}

export function useBlockSlots(email) {
  return useQuery({
    queryKey: availKeys.block(email),
    queryFn: async () => {
      const slots = await base44.entities.WeeklyAvailability.filter({ owner_email: email, slot_type: "block" });
      return slots.filter(s => new Date(s.end_at) > new Date());
    },
    enabled: !!email,
    staleTime: 15_000,
  });
}

// ─── Mutations ──────────────────────────────────────────────────────────────

/** Create a temp/block slot — optimistically adds to list */
export function useCreateSlot(email, slotType) {
  const qc = useQueryClient();
  const queryKey = slotType === "temp" ? availKeys.temp(email) : availKeys.block(email);

  return useMutation({
    mutationFn: (slotData) => base44.entities.WeeklyAvailability.create(slotData),
    onMutate: async (slotData) => {
      await qc.cancelQueries({ queryKey });
      const previous = qc.getQueryData(queryKey);
      const optimistic = { ...slotData, id: `optimistic-${Date.now()}` };
      qc.setQueryData(queryKey, (old = []) => [...old, optimistic]);
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(queryKey, ctx.previous);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: availKeys.all(email) });
    },
  });
}

/** Delete a slot — optimistically removes from list */
export function useDeleteSlot(email, slotType) {
  const qc = useQueryClient();
  const queryKey =
    slotType === "recurring" ? availKeys.recurring(email)
    : slotType === "temp" ? availKeys.temp(email)
    : availKeys.block(email);

  return useMutation({
    mutationFn: (id) => base44.entities.WeeklyAvailability.delete(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey });
      const previous = qc.getQueryData(queryKey);
      qc.setQueryData(queryKey, (old = []) => old.filter(s => s.id !== id));
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(queryKey, ctx.previous);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: availKeys.all(email) });
    },
  });
}

/** Create a recurring slot — optimistically adds */
export function useCreateRecurring(email) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (slotData) => base44.entities.WeeklyAvailability.create(slotData),
    onMutate: async (slotData) => {
      await qc.cancelQueries({ queryKey: availKeys.recurring(email) });
      const previous = qc.getQueryData(availKeys.recurring(email));
      qc.setQueryData(availKeys.recurring(email), (old = []) => [
        ...old,
        { ...slotData, id: `optimistic-${Date.now()}` },
      ]);
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(availKeys.recurring(email), ctx.previous);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: availKeys.recurring(email) });
    },
  });
}