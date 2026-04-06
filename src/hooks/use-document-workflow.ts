"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { frappe } from "@/lib/frappe-client";
import { queryKeys } from "@/hooks/query-keys";

interface WorkflowTransition {
  action: string;
  next_state: string;
  allow: string;
}

/**
 * Check if a workflow is active for a given doctype.
 * Cached for 10 minutes — workflows rarely change mid-session.
 */
export function useActiveWorkflow(doctype: string) {
  const query = useQuery({
    queryKey: queryKeys.workflow.active(doctype),
    queryFn: async () => {
      const rows = await frappe.getList<{ name: string }>("Workflow", {
        filters: [
          ["document_type", "=", doctype],
          ["is_active", "=", 1],
        ],
        fields: ["name"],
        limitPageLength: 1,
      });
      return rows.length > 0 ? rows[0].name : null;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    enabled: !!doctype,
  });

  return {
    hasWorkflow: !!query.data,
    workflowName: query.data ?? null,
    isLoading: query.isLoading,
  };
}

/**
 * Fetch available workflow transitions for a document in its current state.
 * Returns the actions the current user can perform based on roles.
 */
export function useWorkflowTransitions(
  doctype: string,
  docname: string,
  workflowState: string | undefined,
) {
  const query = useQuery({
    queryKey: queryKeys.workflow.transitions(doctype, docname),
    queryFn: async () => {
      const result = await frappe.call<WorkflowTransition[]>(
        "frappe.model.workflow.get_transitions",
        {
          doc: JSON.stringify({
            doctype,
            name: docname,
            workflow_state: workflowState,
          }),
        },
      );
      // ERPNext returns the transitions array either directly or nested in message
      const transitions = Array.isArray(result) ? result : [];
      return transitions.map((t) => ({
        action: t.action,
        nextState: t.next_state,
      }));
    },
    enabled: !!doctype && !!docname && !!workflowState,
    staleTime: 30 * 1000, // 30 seconds
  });

  return {
    transitions: query.data ?? [],
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}

/**
 * Apply a workflow transition. Configurable invalidation keys per caller.
 */
export function useApplyWorkflow(invalidateKeys?: string[][]) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      doctype,
      docname,
      action,
    }: {
      doctype: string;
      docname: string;
      action: string;
    }) => {
      return frappe.call<Record<string, unknown>>(
        "frappe.model.workflow.apply_workflow",
        {
          doc: JSON.stringify({ doctype, name: docname }),
          action,
        },
      );
    },
    onSuccess: () => {
      // Always invalidate workflow transitions
      qc.invalidateQueries({ queryKey: ["workflow"] });
      // Invalidate caller-specified keys
      if (invalidateKeys) {
        for (const key of invalidateKeys) {
          qc.invalidateQueries({ queryKey: key });
        }
      }
    },
  });
}
