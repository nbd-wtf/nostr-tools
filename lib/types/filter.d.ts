import { Event } from './core.ts';
export type Filter = {
    ids?: string[];
    kinds?: number[];
    authors?: string[];
    since?: number;
    until?: number;
    limit?: number;
    search?: string;
    [key: `#${string}`]: string[] | undefined;
};
export declare function matchFilter(filter: Filter, event: Event): boolean;
export declare function matchFilters(filters: Filter[], event: Event): boolean;
export declare function mergeFilters(...filters: Filter[]): Filter;
/**
 * Calculate the intrinsic limit of a filter.
 * This function returns a positive integer, or `Infinity` if there is no intrinsic limit.
 */
export declare function getFilterLimit(filter: Filter): number;
