import { Point } from "auto-traffic-control";

/**
 *
 * @param stop Last value (inclusive) of the array
 * @param start Starting value of the array.
 * @returns An array from start to stop (inclusive)
 */
export function range(stop: number, start: number) {
  const size = Math.abs(start - stop) + 1;
  return [...Array(size).keys()].map((i) => i + start);
}

export enum Direction {
  NORTH = "N",
  EAST = "E",
  SOUTH = "S",
  WEST = "W",
  NORTH_EAST = "NE",
  NORTH_WEST = "NW",
  SOUTH_EAST = "SE",
  SOUTH_WEST = "SW",
}

export const unitMove = {
  [Direction.EAST]: [1, 0],
  [Direction.WEST]: [-1, 0],
  [Direction.NORTH]: [0, 1],
  [Direction.SOUTH]: [0, -1],
  [Direction.NORTH_EAST]: [1, 1],
  [Direction.SOUTH_EAST]: [1, -1],
  [Direction.NORTH_WEST]: [-1, 1],
  [Direction.SOUTH_WEST]: [-1, -1],
};

export function direction(from: Point, to: Point): Direction {
  const x = from.getX() - to.getX();
  const y = from.getY() - to.getY();

  if (x == 0) {
    if (y <= 0) {
      return Direction.SOUTH;
    }
    if (y > 0) {
      return Direction.NORTH;
    }
  }
  if (x < 0) {
    if (y == 0) {
      return Direction.WEST;
    }
    if (y < 0) {
      return Direction.SOUTH_WEST;
    }
    if (y > 0) {
      return Direction.NORTH_WEST;
    }
  }
  if (x > 0) {
    if (y == 0) {
      return Direction.EAST;
    }
    if (y < 0) {
      return Direction.SOUTH_EAST;
    }
    if (y > 0) {
      return Direction.NORTH_EAST;
    }
  }
  // Default to get nice typing
  return Direction.EAST;
}
