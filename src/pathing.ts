import { Node, Map } from "auto-traffic-control";
import { Queue } from "./queue";
import { Direction, range, unitMove, getNodeAt, nodeListStr } from "./util";

export const filterNeighbourInDirection =
  (inDirection: Direction, origin: Node) => (node: Node) => {
    const newCoords = unitMove[inDirection];
    return !(
      origin.getLongitude() + newCoords[0] === node.getLongitude() &&
      origin.getLatitude() + newCoords[1] === node.getLatitude()
    );
  };

/**
 * The neighbours are a 3 by 3 box surrounding the current node.
 *
 * @param node Node we are getting the neighbours of
 * @param map Map to look for nodes in
 * @returns A list of all nodes surrounding the current node.
 */
export function getNeighbours(node: Node, map: Map): Node[] {
  // Origin is at the middle of the map so subtract 1 divide by 2 gives
  // us the range of either side of the origin
  const widthRange = range(
    Math.min((map.getWidth() - 1) / 2, node.getLongitude() + 1),
    Math.max(-1 * ((map.getWidth() - 1) / 2), node.getLongitude() - 1)
  );
  const heightRange = range(
    Math.min((map.getHeight() - 1) / 2, node.getLatitude() + 1),
    Math.max(-1 * ((map.getHeight() - 1) / 2), node.getLatitude() - 1)
  );
  const neighbours: Node[] = [];
  heightRange.forEach((y) => {
    widthRange.forEach((x) => {
      if (x !== node.getLongitude() || y !== node.getLatitude()) {
        const neighbour = getNodeAt(map, x, y);
        if (!neighbour.getRestricted()) {
          neighbours.push(neighbour);
        }
      }
    });
  });
  // console.log("Neighbours " + neighbours);
  return neighbours;
}

/**
 * Breadth-first search that maintains the path in the queue.
 * @param goal Starting node.
 * @param map Ending node to chart a path to.
 * @returns An array representing a path from start to goal.
 */
export function bfs(
  start: Node,
  goal: Node,
  getNeighbours: (node: Node) => Node[]
): Node[] {
  if (start.toString() === goal.toString()) {
    console.warn("Start is goal.");
    return [];
  }
  console.log("Goal is " + goal);
  const visited = new Set<Node>();
  const queue = new Queue<Node[]>();
  queue.enqueue([start]);
  visited.add(start);
  while (queue.length > 0) {
    const path = queue.dequeue();
    const node = path.at(-1);
    if (!node) {
      break;
    }
    const neighbours = getNeighbours(node);
    for (let neighbour of neighbours) {
      const currentPath = [...path, neighbour];
      if (neighbour.toString() === goal.toString()) {
        return currentPath;
      }

      if (!visited.has(neighbour)) {
        visited.add(neighbour);
        queue.enqueue(currentPath);
      }
    }
  }
  console.error("No path to goal found.");
  return [start];
}
