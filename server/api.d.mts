import type { IncomingMessage, ServerResponse } from "node:http";

export declare function handleApi(
  nodeRequest: IncomingMessage,
  nodeResponse: ServerResponse
): Promise<boolean>;
