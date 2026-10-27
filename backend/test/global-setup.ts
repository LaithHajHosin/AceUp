import { MongoMemoryServer } from 'mongodb-memory-server';

let mongod: MongoMemoryServer | null = null;

export async function setup() {
  mongod = await MongoMemoryServer.create({ instance: { port: 27017 } });
  process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/preppressure_test';
  process.env.JWT_SECRET = 'test-jwt-secret-preppressure-v3';
}

export async function teardown() {
  if (mongod) {
    await mongod.stop();
    mongod = null;
  }
}
