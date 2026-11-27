export type Id = string;

/** A point in plan coordinates, in metres. +x is right, +y is down, origin top-left of the plot. */
export interface Vec2 {
  x: number;
  y: number;
}

export type Month = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

/** "MM-DD", e.g. "05-15". */
export type MonthDay = string;

export type Level3 = 'low' | 'medium' | 'high';
