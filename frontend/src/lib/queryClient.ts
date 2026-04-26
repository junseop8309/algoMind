import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 10,
      retry: (failureCount, error: any) => {
        if (error?.status === 401 || error?.status === 404) return false
        return failureCount < 2
      },
    },
    mutations: {
      retry: false,
    },
  },
})
