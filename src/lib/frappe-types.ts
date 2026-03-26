export interface FrappeListResponse<T> {
  data: T[];
}

export interface FrappeDocResponse<T> {
  data: T;
}

export interface FrappeCallResponse<T = unknown> {
  message: T;
}

export class FrappeAPIError extends Error {
  status: number;
  excType?: string;
  serverMessages?: string[];

  constructor(message: string, status: number, excType?: string, serverMessages?: string[]) {
    super(message);
    this.name = "FrappeAPIError";
    this.status = status;
    this.excType = excType;
    this.serverMessages = serverMessages;
  }
}
