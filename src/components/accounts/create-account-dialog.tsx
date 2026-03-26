"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { frappe } from "@/lib/frappe-client";
import { useExpenseGroups } from "@/hooks/use-expense-groups";
import { queryKeys } from "@/hooks/query-keys";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface CreateAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  company: string;
}

export function CreateAccountDialog({ open, onOpenChange, company }: CreateAccountDialogProps) {
  const queryClient = useQueryClient();
  const { data: expenseGroups = [] } = useExpenseGroups(company);

  const [accountName, setAccountName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [parentAccount, setParentAccount] = useState("");
  const [accountType, setAccountType] = useState("Expense Account");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState("");

  const resetForm = () => {
    setAccountName("");
    setAccountNumber("");
    setParentAccount("");
    setAccountType("Expense Account");
    setError("");
  };

  const handleCreate = async () => {
    if (!accountName.trim()) {
      setError("Account name is required");
      return;
    }

    setIsCreating(true);
    setError("");

    try {
      const payload: Record<string, unknown> = {
        doctype: "Account",
        account_name: accountName.trim(),
        parent_account: parentAccount,
        company,
        root_type: "Expense",
        report_type: "Profit and Loss",
        account_type: accountType,
        is_group: 0,
      };

      if (accountNumber.trim()) {
        payload.account_number = accountNumber.trim();
      }

      await frappe.createDoc("Account", payload);

      await queryClient.invalidateQueries({
        queryKey: queryKeys.accounts.expense(company),
      });

      toast.success(`Account "${accountName.trim()}" created successfully`);
      resetForm();
      onOpenChange(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create account";
      setError(message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      resetForm();
    }
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Expense Account</DialogTitle>
          <DialogDescription>
            Add a new expense account to your chart of accounts.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="accountName">Account Name *</Label>
            <Input
              id="accountName"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              placeholder="e.g. Office Supplies"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="accountNumber">Account Number</Label>
            <Input
              id="accountNumber"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              placeholder="Optional"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="parentGroup">Parent Group</Label>
            <select
              id="parentGroup"
              value={parentAccount}
              onChange={(e) => setParentAccount(e.target.value)}
              className={cn(
                "h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs",
                "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none",
                !parentAccount && "text-muted-foreground",
              )}
            >
              <option value="">Select parent group</option>
              {expenseGroups.map((group) => (
                <option key={group} value={group}>
                  {group}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="accountType">Account Type</Label>
            <select
              id="accountType"
              value={accountType}
              onChange={(e) => setAccountType(e.target.value)}
              className={cn(
                "h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs",
                "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none",
              )}
            >
              <option value="Expense Account">Expense Account</option>
              <option value="Cost of Goods Sold">Cost of Goods Sold</option>
            </select>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isCreating}
          >
            Cancel
          </Button>
          <Button type="button" onClick={handleCreate} disabled={isCreating}>
            {isCreating ? "Creating..." : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
