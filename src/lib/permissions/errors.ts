export class PermissionDeniedError extends Error {
  readonly capability: string;
  readonly scopeDim: string | null;
  readonly scopeValue: string | null;

  constructor(opts: {
    capability: string;
    scopeDim?: string | null;
    scopeValue?: string | null;
    message?: string;
  }) {
    super(
      opts.message ??
        `Permission denied: ${opts.capability}${
          opts.scopeDim ? ` (${opts.scopeDim}=${opts.scopeValue ?? "?"})` : ""
        }`,
    );
    this.name = "PermissionDeniedError";
    this.capability = opts.capability;
    this.scopeDim = opts.scopeDim ?? null;
    this.scopeValue = opts.scopeValue ?? null;
  }
}

export class PermissionResolutionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PermissionResolutionError";
  }
}
