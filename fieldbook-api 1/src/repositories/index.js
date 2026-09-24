/**
 * Picks a storage engine based on config.dbMode. The Postgres module is
 * imported dynamically so that running in the default 'memory' mode never
 * even tries to load the `pg` package — which isn't installed unless a real
 * deployment opts into DB_MODE=postgres.
 */
import { config } from '../config.js';
import { createMemoryRepository } from './memoryRepository.js';

export async function createRepository() {
  if (config.dbMode === 'postgres') {
    const { createPostgresRepository } = await import('./postgresRepository.js');
    return createPostgresRepository();
  }
  return createMemoryRepository();
}
