import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getWorkOrderAsset,
  saveWorkOrderAsset,
  deleteWorkOrderAsset,
  getAllAssets,
} from "@/actions/work-order-assets";
import { queryKeys } from "@/hooks/query-keys";

export function useWorkOrderAsset(workOrder: string) {
  return useQuery({
    queryKey: queryKeys.workOrderAssets.byWo(workOrder),
    queryFn: () => getWorkOrderAsset(workOrder),
    enabled: !!workOrder,
  });
}

export function useSaveWorkOrderAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { workOrder: string; assetId: number }) =>
      saveWorkOrderAsset(params.workOrder, params.assetId),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.workOrderAssets.byWo(vars.workOrder) });
    },
  });
}

export function useDeleteWorkOrderAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (workOrder: string) => deleteWorkOrderAsset(workOrder),
    onSuccess: (_, workOrder) => {
      qc.invalidateQueries({ queryKey: queryKeys.workOrderAssets.byWo(workOrder) });
    },
  });
}

export function useAssetList(search: string) {
  return useQuery({
    queryKey: queryKeys.workOrderAssets.allAssets(search),
    queryFn: () => getAllAssets(search || undefined),
  });
}
