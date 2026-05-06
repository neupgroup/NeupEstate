/**
 * neupid-grpc.ts
 *
 * Singleton gRPC client for the NeupID AuthService.
 * This module is server-only — never import it in client components.
 *
 * The client is lazily initialised and cached so that Next.js hot-reloads
 * in development don't create a new channel on every request.
 */

import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import path from 'path';

const PROTO_PATH = path.resolve(process.cwd(), 'src/proto/auth.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const authProto = (grpc.loadPackageDefinition(packageDefinition) as any).auth;

// In development Next.js may hot-reload modules, so we cache the client on
// the global object to avoid creating a new channel on every reload.
const globalForGrpc = globalThis as unknown as {
  __neupidAuthClient?: InstanceType<typeof authProto.AuthService>;
};

function createAuthClient() {
  const host = process.env.NEUPID_GRPC_HOST ?? 'localhost:50051';
  return new authProto.AuthService(host, grpc.credentials.createInsecure());
}

export const authClient: InstanceType<typeof authProto.AuthService> =
  globalForGrpc.__neupidAuthClient ?? (globalForGrpc.__neupidAuthClient = createAuthClient());
