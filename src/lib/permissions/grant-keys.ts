import { SCOPE_WILDCARD } from "./constants";

export type GrantKey = string;

export type GrantTuple = {
  capabilityId: string;
  scopeDim: string;
  scopeValue: string;
};

export const keyOf = (g: GrantTuple): GrantKey =>
  `${g.capabilityId}::${g.scopeDim}::${g.scopeValue}`;

export const navKey = (navCapability: string): GrantKey =>
  keyOf({ capabilityId: navCapability, scopeDim: "*", scopeValue: "*" });

export const wildcardKey = (capabilityId: string, scopeDim: string): GrantKey =>
  keyOf({ capabilityId, scopeDim, scopeValue: SCOPE_WILDCARD });
