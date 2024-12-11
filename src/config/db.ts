import * as postgres from 'postgres';

const connectionString: string = process.env.DB_CONNECTION_STRING ?? ""
export const client = postgres(connectionString)