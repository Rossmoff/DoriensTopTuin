import type { Plant } from '../domain/types';
import data from './plants.json';

/** The curated builtin plant list (approximate data, see plants.json). */
export const BUILTIN_PLANTS: Plant[] = (data as unknown as { plants: Plant[] }).plants;
