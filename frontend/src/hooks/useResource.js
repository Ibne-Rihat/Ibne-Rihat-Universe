import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { toast } from "sonner";

export function useResource(resource, params = {}) {
  return useQuery({
    queryKey: [resource, params],
    queryFn: async () => {
      const { data } = await api.get(`/${resource}`, { params });
      return data;
    },
  });
}

export function useResourceMutations(resource, label = "Item") {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: [resource] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
    qc.invalidateQueries({ queryKey: ["analytics"] });
  };

  const create = useMutation({
    mutationFn: async (payload) => (await api.post(`/${resource}`, payload)).data,
    onSuccess: () => { invalidate(); toast.success(`${label} created`); },
    onError: (e) => toast.error(e.response?.data?.detail || `Failed to create ${label}`),
  });

  const update = useMutation({
    mutationFn: async ({ id, payload }) => (await api.put(`/${resource}/${id}`, payload)).data,
    onSuccess: () => { invalidate(); toast.success(`${label} updated`); },
    onError: (e) => toast.error(e.response?.data?.detail || `Failed to update ${label}`),
  });

  const remove = useMutation({
    mutationFn: async (id) => (await api.delete(`/${resource}/${id}`)).data,
    onSuccess: () => { invalidate(); toast.success(`${label} deleted`); },
    onError: (e) => toast.error(e.response?.data?.detail || `Failed to delete ${label}`),
  });

  return { create, update, remove };
}

export function useDashboard() {
  return useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => (await api.get("/dashboard")).data,
  });
}

export function useAnalytics() {
  return useQuery({
    queryKey: ["analytics"],
    queryFn: async () => (await api.get("/analytics")).data,
  });
}
