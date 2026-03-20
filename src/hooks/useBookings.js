/**
 * useBookings — React Query hooks with optimistic updates for booking operations.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

// ─── Query keys ────────────────────────────────────────────────────────────
export const bookingKeys = {
  all: ["bookings"],
  mine: (email) => ["bookings", "mine", email],
  theirs: (email) => ["bookings", "theirs", email],
  active: (email) => ["bookings", "active", email],
};

// ─── Fetchers ───────────────────────────────────────────────────────────────
export function useMyBookings(email) {
  return useQuery({
    queryKey: bookingKeys.mine(email),
    queryFn: () => base44.entities.Booking.filter({ renter_email: email }),
    enabled: !!email,
    staleTime: 30_000,
  });
}

export function useTheirBookings(email) {
  return useQuery({
    queryKey: bookingKeys.theirs(email),
    queryFn: () => base44.entities.Booking.filter({ owner_email: email }),
    enabled: !!email,
    staleTime: 30_000,
  });
}

export function useActiveBooking(email) {
  return useQuery({
    queryKey: bookingKeys.active(email),
    queryFn: async () => {
      const bookings = await base44.entities.Booking.filter({ renter_email: email, status: "active" });
      return bookings.find(b => new Date(b.end_time) > new Date()) ?? null;
    },
    enabled: !!email,
    staleTime: 15_000,
  });
}

// ─── Mutations ──────────────────────────────────────────────────────────────

/** Create a booking with optimistic update */
export function useCreateBooking(userEmail) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (bookingData) => base44.entities.Booking.create(bookingData),
    onMutate: async (newBooking) => {
      await qc.cancelQueries({ queryKey: bookingKeys.mine(userEmail) });
      const previous = qc.getQueryData(bookingKeys.mine(userEmail));
      const optimistic = { ...newBooking, id: `optimistic-${Date.now()}`, status: "active" };
      qc.setQueryData(bookingKeys.mine(userEmail), (old = []) => [optimistic, ...old]);
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(bookingKeys.mine(userEmail), ctx.previous);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: bookingKeys.mine(userEmail) });
      qc.invalidateQueries({ queryKey: bookingKeys.active(userEmail) });
    },
  });
}

/** End / cancel a booking with optimistic status update */
export function useEndBooking(userEmail) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => base44.entities.Booking.update(id, data),
    onMutate: async ({ id, data }) => {
      await qc.cancelQueries({ queryKey: bookingKeys.active(userEmail) });
      const prevActive = qc.getQueryData(bookingKeys.active(userEmail));
      // Optimistically remove from active
      qc.setQueryData(bookingKeys.active(userEmail), null);
      // Optimistically update in my-bookings list
      qc.setQueryData(bookingKeys.mine(userEmail), (old = []) =>
        old.map(b => b.id === id ? { ...b, ...data } : b)
      );
      return { prevActive };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prevActive !== undefined)
        qc.setQueryData(bookingKeys.active(userEmail), ctx.prevActive);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: bookingKeys.all });
    },
  });
}