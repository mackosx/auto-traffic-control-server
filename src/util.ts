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
