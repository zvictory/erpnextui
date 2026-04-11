export {
  BUILTIN_CAPABILITIES,
  getBuiltinCapability,
  listBuiltinCapabilities,
  listAllCapabilities,
  type BuiltinCapabilityId,
  type CapabilityDef,
  type CapabilityId,
  type MergedCapability,
  type ScopeDim,
} from "./capabilities";

export { isSuperuser } from "./superuser";

export { PermissionDeniedError, PermissionResolutionError } from "./errors";

export { SCOPE_WILDCARD } from "./constants";

export {
  resolveAuthContext,
  invalidateAuthContext,
  invalidateAllAuthContexts,
  hasWildcardScope,
  allowedScopeValues,
  type AuthContext,
} from "./resolve-context";

export {
  checkGrant,
  getCapabilityScopeDim,
  logDenial,
  logDryrunDenial,
  type GrantDecision,
  type ScopeCheck,
} from "./check-grant";

export {
  withPermissions,
  getPermissionMode,
  type GuardedHandler,
  type GuardedOptions,
  type PermissionMode,
} from "./with-permissions";

export { requireGrant, toActionError, type RequireGrantOptions } from "./require-grant";

export { requireGrantApi } from "./api-guard";
