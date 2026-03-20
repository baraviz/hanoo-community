import { QueryClient } from '@tanstack/react-query';


export const queryClientInstance = new QueryClient({
	defaultOptions: {
		queries: {
			refetchOnWindowFocus: false,
			retry: 1,
			staleTime: 30_000,       // 30s before background refetch
			gcTime: 5 * 60_000,      // 5min cache retention
			refetchOnReconnect: true, // re-fetch when coming back online (mobile bg/fg)
		},
		mutations: {
			retry: 0, // optimistic mutations should not retry blindly
		},
	},
});