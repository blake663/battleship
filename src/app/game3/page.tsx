"use client"
import { CSSProperties, useMemo, useRef, useState } from "react";
import { DndContext, useDraggable, useDroppable, type DragStartEvent, type DragEndEvent, type UniqueIdentifier, DragOverlay, useDndContext } from "@dnd-kit/core";

type DragShipItem = { name: string; size: number; color: string, horizontal: boolean };
type DragShipData = { type: "SHIP"; item: DragShipItem };
type CellData = { row: number; col: number };

const isObject = (val: unknown): val is Record<string, unknown> => typeof val === "object" && val !== null;

const isDragShipItem = (val: unknown): val is DragShipItem =>
  isObject(val) && typeof val.name === "string" && typeof val.size === "number" && typeof val.color === "string" && typeof val.horizontal === "boolean";

function isDragShipData(data: unknown): data is DragShipData {
  return isObject(data) && data.type === "SHIP" && isDragShipItem(data.item);
}

function isCellData(data: unknown): data is CellData {
  return isObject(data) && typeof data.row === "number" && typeof data.col === "number";
}

type Ship = {
  name: string;
  size: number;
  position: [number, number] | [];
  color: string;
  horizontal: boolean;
}

const defaultShips: Ship[] = [
  {
    name: "Carrier",
    size: 5,
    position: [],
    color: "#1E40AF",
    horizontal: true,
  },
  {
    name: "Battleship",
    size: 4,
    position: [],
    color: "#3B82F6",
    horizontal: true,
  },
  {
    name: "Cruiser",
    size: 3,
    position: [],
    color: "#60A5FA",
    horizontal: true,
  },
  {
    name: "Submarine",
    size: 3,
    position: [],
    color: "#93C5FD",
    horizontal: true,
  },
  {
    name: "Destroyer",
    size: 2,
    position: [],
    color: "#C0D6F0",
    horizontal: true,
  }
];

const gridSize = 44;


// import {createSnapModifier} from '@dnd-kit/modifiers';

// const snapToGridModifier = createSnapModifier(gridSize);

export default function Game() {
  const [shipPieces, setShipPieces] = useState(defaultShips);
  const [activeDrag, setActiveDrag] = useState<{ name: string; size: number; color: string, horizontal: boolean } | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const [selectedShip, setSelectedShip] = useState<string | null>(null);

  const ITEM_TYPES = { SHIP: "SHIP" } as const;

  function canPlaceShipAt(name: string, size: number, startRow: number, startCol: number, horizontal: boolean) {
    if (startRow < 0 || startRow >= 10 || startCol < 0 || startCol >= 10) return false;
    if (horizontal && startCol + size > 10) return false;
    if (!horizontal && startRow + size > 10) return false;

    for (let i = 0; i < size; i++) {
      const r = startRow + (horizontal ? 0 : i);
      const c = startCol + (horizontal ? i : 0);
      // Ensure not overlapping with any existing ship (excluding this ship if already placed)
      const overlapping = shipPieces.some((ship) => {
        if (ship.name === name || ship.position.length === 0) return false;
        if (ship.horizontal) {
          return r === ship.position[0] && c >= ship.position[1] && c < ship.position[1] + ship.size;
        } else {
          return c === ship.position[1] && r >= ship.position[0] && r < ship.position[0] + ship.size;
        }
      });
      if (overlapping) return false;
    }
    return true;
  }

  function placeShip(name: string, size: number, startRow: number, startCol: number, horizontal: boolean) {
    if (!canPlaceShipAt(name, size, startRow, startCol, horizontal)) return false;
    setShipPieces((prev) => prev.map((s) => (s.name === name ? { ...s, position: [startRow, startCol] } : s)));
    return true;
  }

  function snapToGrid(args: any) {
    const {transform, draggingNodeRect} = args;
    
    // snap when inside board
    if (boardRef.current && draggingNodeRect) {
      const boardRect = boardRef.current.getBoundingClientRect();
      const nearestRow = Math.round((draggingNodeRect.top - boardRect?.top + transform.y) / gridSize);
      const nearestCol = Math.round((draggingNodeRect.left - boardRect?.left + transform.x) / gridSize);

      if (nearestRow >= 0 && nearestRow < 10 && nearestCol >= 0 && nearestCol < 10) {
        return {
          ...transform,
          y: nearestRow * gridSize - (draggingNodeRect.top - boardRect?.top),
          x: nearestCol * gridSize - (draggingNodeRect.left - boardRect?.left),
        };
      }
    }
    return transform;
  }

  function rotateShip(ship: {name: string; size: number; color: string; position: [number, number] | [], horizontal: boolean}) {
    if (ship.position.length === 0) return;

    // find center of ship
    const offset = Math.floor((ship.size - 1) / 2);
    const pivotRow = ship.position[0] + (ship.horizontal ? 0 : offset);
    const pivotCol = ship.position[1] + (ship.horizontal ? offset : 0);

    // use bfs to find nearest valid position
    const queue = [[pivotRow, pivotCol, offset]];
    // use both middle cells for even length ships for more intuitive rotation
    if (ship.size % 2 === 0) {
      queue.push([pivotRow + (ship.horizontal ? 0 : 1), pivotCol + (ship.horizontal ? 1 : 0), offset + 1]);
    }
    const visited = new Set<string>();
    visited.add(`${pivotRow},${pivotCol},${offset}`);
    while (queue.length > 0) {
      const [row, col, offset] = queue.shift()!;
      const topRow = row - (ship.horizontal ? offset : 0);
      const leftCol = col - (ship.horizontal ? 0 : offset);
      if (canPlaceShipAt(ship.name, ship.size, topRow, leftCol, !ship.horizontal)) {
        setShipPieces((prev) => prev.map((s) => (s.name === ship.name ? { ...s, horizontal: !s.horizontal, position: [topRow, leftCol] } : s)));
        return;
      }
      const neighbors = [
        [row - 1, col, offset],
        [row + 1, col, offset],
        [row, col - 1, offset],
        [row, col + 1, offset],
      ];
      for (const [r, c, o] of neighbors) {
        if (r >= 0 && r < 10 && c >= 0 && c < 10 && !visited.has(`${r},${c},${o}`)) {
          queue.push([r, c, o]);
          visited.add(`${r},${c},${o}`);
        }
      }
    }
  }
    
  function ShipDraggable({ ship }: { ship: { name: string; size: number; color: string; position: [number, number] | [], horizontal: boolean } }) {
    const id = useMemo<UniqueIdentifier>(() => `ship-${ship.name}`, [ship.name]);
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
      id,
      data: { type: ITEM_TYPES.SHIP, item: { name: ship.name, size: ship.size, color: ship.color, horizontal: ship.horizontal } },
    });
    const { over } = useDndContext();
    const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;
    const isSelected = ship.name === selectedShip;

    const position: CSSProperties = ship.position.length ? {position: "absolute", top: `${ship.position[0] * gridSize}px`, left: `${ship.position[1] * gridSize}px`} : {};
    const invalid = ship.name === activeDrag?.name && isCellData(over?.data?.current) ? !canPlaceShipAt(ship.name, ship.size, over?.data?.current?.row, over?.data?.current?.col, ship.horizontal) : false;

    // console.log({invalid})
    return (
      <div ref={setNodeRef} {...attributes} {...listeners} className="select-none cursor-move" style={{...style, ...position}}>
        {/* <p className="text-sm font-medium">{ship.name}</p> */}
        <div className={"flex gap-1 flex-nowrap" + (ship.horizontal ? "" : " flex-col")}>
          {Array.from({ length: ship.size }).map((_, i) => (
            <div key={i}>
              <div
                className={"w-10 h-10 border border-gray-500" + (isSelected ? " ring-2 ring-green-500" : "")}
                style={{ backgroundColor: invalid ? "red" : ship.color}}
              ></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  function BoardCell({ row, col }: { row: number; col: number }) {
    const id = useMemo<UniqueIdentifier>(() => `cell-${row}-${col}`, [row, col]);
    const { setNodeRef } = useDroppable({ id, data: { row, col } });

    return (
      <div ref={setNodeRef}>
        <div className={`w-10 h-10 border border-gray-400`}></div>
      </div>
    );
  }

  return (
    <DndContext
      onDragStart={(event: DragStartEvent) => {
        const data = event.active.data.current;
        if (isDragShipData(data)) {
          console.log("drag start", {data});
          setActiveDrag(data.item);
        }
      }}
      onDragEnd={(event: DragEndEvent) => {
        const data = event.active.data.current;
        const overData = event.over?.data.current;
        setActiveDrag(null);
        console.log({data, overData});
        if (!isDragShipData(data) || !isCellData(overData)) return;
        const { item } = data;
        const { row, col } = overData;
        console.log({item, row, col});
        if (canPlaceShipAt(item.name, item.size, row, col, item.horizontal)) {
          console.log("Placing ship", item.name, "at", row, col);
          placeShip(item.name, item.size, row, col, item.horizontal);
        }
        setSelectedShip(item.name);
      }}
      onDragCancel={() => setActiveDrag(null)}
      id={"ship-dnd-context"} // prevents hydration error
      modifiers={[snapToGrid]}
    >
      <div>
        <h1>Game</h1>
        <div id="board" ref={boardRef} className="space-y-1 w-fit relative">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="flex gap-1">
              {Array.from({ length: 10 }).map((_, j) => (
                <BoardCell key={`${i}-${j}`} row={i} col={j} />
              ))}
            </div>
          ))}
          <div id="placed-ships">
            {shipPieces.map((ship) => (
              ship.position.length > 0 && (
                <ShipDraggable ship={ship} key={ship.name}/>
              )
            ))}
          </div>
        </div>
        <div id="unplaced-ship-container">
          {shipPieces.map((ship) => (
            ship.position.length === 0 && (
              <div key={ship.name} className="my-2">
                <ShipDraggable ship={ship} />
              </div>
            )
          ))}
        </div>
        <DragOverlay>
          {activeDrag && (
            <ShipDraggable ship={{...activeDrag, position: []}} />
          )}
        </DragOverlay>
        <button onClick={() => rotateShip(shipPieces.find((s) => s.name === selectedShip)!)}>Rotate</button>
        <button>Ready</button>
      </div>
    </DndContext>
    )
}
