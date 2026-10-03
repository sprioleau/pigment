"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import {
  analyzeRegions,
  getRegionLabelPosition,
  paintPixels,
  prepareArtwork,
  regionAt,
  segmentPixels,
  type Segmentation,
} from "@/lib/paint-engine";
import type { Picture } from "@/lib/pictures";
import styles from "./puzzle-workshop.module.css";

type Props = {
  pictures: Picture[];
  onSave: (picture: Picture) => boolean;
  onBack: () => void;
};
type Tool = "assign" | "label" | "draw" | "erase";
type Point = { x: number; y: number };
type Gesture = { tool: Tool; id: number; point: Point };

export default function PuzzleWorkshop({ pictures, onSave, onBack }: Props) {
  const [selectedId, setSelectedId] = useState(pictures[0]?.id ?? "");
  const selected =
    pictures.find((picture) => picture.id === selectedId) ?? pictures[0];
  return (
    <section className={styles.workshop}>
      <header className="screen-header">
        <button className="game-button small" onClick={onBack}>
          ← Home
        </button>
        <div>
          <span className="eyebrow">A GROWN-UP LITTLE HELPER</span>
          <h1>Puzzle Workshop</h1>
        </div>
        <span />
      </header>
      <p className={styles.intro}>
        Fine-tune a picture’s colors, numbers, and outlines. Saved changes
        become playable in this browser.
      </p>
      <label className={styles.pictureSelect}>
        Picture to edit
        <select
          value={selectedId}
          onChange={(event) => setSelectedId(event.target.value)}
        >
          {pictures.map((picture) => (
            <option value={picture.id} key={picture.id}>
              {picture.title}
            </option>
          ))}
        </select>
      </label>
      {selected && (
        <WorkshopEditor key={selected.id} source={selected} onSave={onSave} />
      )}
    </section>
  );
}

function WorkshopEditor({
  source,
  onSave,
}: {
  source: Picture;
  onSave: Props["onSave"];
}) {
  const [picture, setPicture] = useState(source);
  const [segmentation, setSegmentation] = useState<Segmentation | null>(null);
  const [tool, setTool] = useState<Tool>("assign");
  const [selectedNumber, setSelectedNumber] = useState(1);
  const [selectedRegion, setSelectedRegion] = useState<number | null>(null);
  const [brushSize, setBrushSize] = useState(5);
  const [isPreview, setIsPreview] = useState(true);
  const [isBusy, setIsBusy] = useState(true);
  const [history, setHistory] = useState<Picture[]>([]);
  const [message, setMessage] = useState("Preparing this picture…");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const artworkRef = useRef<HTMLCanvasElement | null>(null);
  const gestureRef = useRef<Gesture | null>(null);
  const loadRequestRef = useRef(0);
  const diagnostics = segmentation ? analyzeRegions(segmentation) : null;
  const region = segmentation?.regions.find(
    (item) => item.id === selectedRegion,
  );
  const label =
    segmentation && region
      ? getRegionLabelPosition(segmentation, region, picture.labelPositions)
      : null;

  useEffect(() => {
    let isCancelled = false;
    const requestState = loadRequestRef;
    prepareArtwork(source.image, source.seeds, source.defaultNumber)
      .then((data) => {
        if (isCancelled) return;
        const canvas = document.createElement("canvas");
        canvas.width = data.width;
        canvas.height = data.height;
        canvas
          .getContext("2d")
          ?.putImageData(
            new ImageData(
              new Uint8ClampedArray(data.pixels),
              data.width,
              data.height,
            ),
            0,
            0,
          );
        artworkRef.current = canvas;
        setSegmentation(data);
        setIsBusy(false);
        setMessage("Choose a tool, then tap or drag on the picture.");
      })
      .catch((reason) => {
        if (!isCancelled) {
          setIsBusy(false);
          setMessage(
            reason instanceof Error
              ? reason.message
              : "Couldn’t open this picture.",
          );
        }
      });
    return () => {
      isCancelled = true;
      requestState.current++;
    };
  }, [source]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !segmentation) return;
    canvas.width = segmentation.width;
    canvas.height = segmentation.height;
    const context = canvas.getContext("2d");
    if (!context) return;
    const fills = isPreview
      ? Object.fromEntries(
          segmentation.regions.map((item) => [
            item.id,
            picture.assignments?.[item.id] ?? item.number,
          ]),
        )
      : {};
    context.putImageData(
      new ImageData(
        paintPixels(segmentation, fills, picture.palette),
        segmentation.width,
        segmentation.height,
      ),
      0,
      0,
    );
    if (tool !== "draw" && tool !== "erase") {
      context.font = "600 15px Arial";
      context.textAlign = "center";
      context.textBaseline = "middle";
      for (const item of segmentation.regions) {
        const position = getRegionLabelPosition(
          segmentation,
          item,
          picture.labelPositions,
        );
        const number = picture.assignments?.[item.id] ?? item.number;
        if (item.id === selectedRegion) {
          context.fillStyle = "#f9d56b";
          context.beginPath();
          context.arc(position.x, position.y, 13, 0, Math.PI * 2);
          context.fill();
        }
        context.strokeStyle = "white";
        context.lineWidth = 4;
        context.strokeText(String(number), position.x, position.y);
        context.fillStyle = "#392449";
        context.fillText(String(number), position.x, position.y);
      }
    }
  }, [segmentation, picture, isPreview, selectedRegion, tool]);

  function remember(): void {
    setHistory((items) => [...items.slice(-29), picture]);
  }

  function updatePicture(next: Picture): void {
    remember();
    setPicture(next);
    setMessage("Updated. Save changes when your puzzle is ready.");
  }

  function changeTool(next: Tool): void {
    setTool(next);
    if (next === "draw" || next === "erase") setIsPreview(false);
    setMessage(
      next === "assign"
        ? "Choose a color, then tap an area to assign its number."
        : next === "label"
          ? "Tap or drag a number within its own area. Or use the position fields below."
          : next === "draw"
            ? "Draw black boundaries to close gaps or split an area. Release to analyze."
            : "Erase boundaries with the white brush. Release to analyze.",
    );
  }

  function assignRegion(id: number, number: number): void {
    if (!segmentation?.regions.some((item) => item.id === id)) return;
    updatePicture({
      ...picture,
      assignments: { ...picture.assignments, [id]: number },
    });
    setSelectedRegion(id);
    setMessage(`Area ${id + 1} now uses color ${number}.`);
  }

  function moveLabel(id: number, point: Point, shouldRemember = false): void {
    if (!segmentation) return;
    const x = Math.max(
      0,
      Math.min(segmentation.width - 1, Math.round(point.x)),
    );
    const y = Math.max(
      0,
      Math.min(segmentation.height - 1, Math.round(point.y)),
    );
    if (segmentation.ids[y * segmentation.width + x] !== id) {
      setMessage("Keep the number inside its own outlined area.");
      return;
    }
    if (shouldRemember) remember();
    setPicture((previous) => ({
      ...previous,
      labelPositions: {
        ...previous.labelPositions,
        [id]: { x: x / segmentation.width, y: y / segmentation.height },
      },
    }));
    setMessage(`Number for area ${id + 1} moved. Save changes to keep it.`);
  }

  function pointerPoint(event: PointerEvent<HTMLCanvasElement>): Point {
    const canvas = event.currentTarget;
    const bounds = canvas.getBoundingClientRect();
    return {
      x: Math.max(
        0,
        Math.min(
          canvas.width - 1,
          ((event.clientX - bounds.left) / bounds.width) * canvas.width,
        ),
      ),
      y: Math.max(
        0,
        Math.min(
          canvas.height - 1,
          ((event.clientY - bounds.top) / bounds.height) * canvas.height,
        ),
      ),
    };
  }

  function drawStroke(start: Point, end: Point, strokeTool: Tool): void {
    const artwork = artworkRef.current;
    const context = artwork?.getContext("2d");
    if (!artwork || !context) return;
    context.strokeStyle = strokeTool === "erase" ? "white" : "black";
    context.fillStyle = context.strokeStyle;
    context.lineWidth = brushSize;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.beginPath();
    context.moveTo(start.x, start.y);
    context.lineTo(end.x, end.y);
    context.stroke();
    context.beginPath();
    context.arc(end.x, end.y, brushSize / 2, 0, Math.PI * 2);
    context.fill();
    canvasRef.current?.getContext("2d")?.drawImage(artwork, 0, 0);
  }

  function pointerDown(event: PointerEvent<HTMLCanvasElement>): void {
    if (isBusy || !segmentation || event.button !== 0) return;
    const point = pointerPoint(event);
    const id = regionAt(
      segmentation.ids,
      segmentation.width,
      segmentation.height,
      Math.floor(point.x),
      Math.floor(point.y),
    );
    if (tool === "assign") {
      if (id >= 0) assignRegion(id, selectedNumber);
      else setMessage("Tap inside an enclosed area.");
      return;
    }
    if (tool === "label" && id < 0) {
      setMessage("Tap a number or its enclosed area.");
      return;
    }
    remember();
    gestureRef.current = { tool, id, point };
    event.currentTarget.setPointerCapture(event.pointerId);
    if (tool === "label") {
      setSelectedRegion(id);
      moveLabel(id, point);
    } else drawStroke(point, point, tool);
  }

  function pointerMove(event: PointerEvent<HTMLCanvasElement>): void {
    const gesture = gestureRef.current;
    if (!gesture) return;
    const point = pointerPoint(event);
    if (gesture.tool === "label") moveLabel(gesture.id, point);
    else drawStroke(gesture.point, point, gesture.tool);
    gesture.point = point;
  }

  function analyzeArtwork(shouldReplaceArtwork = true): void {
    const artwork = artworkRef.current;
    const context = artwork?.getContext("2d");
    if (!artwork || !context || !segmentation) return;
    const data = segmentPixels(
      context.getImageData(0, 0, artwork.width, artwork.height).data,
      artwork.width,
      artwork.height,
      [],
      picture.defaultNumber,
    );
    if (!shouldReplaceArtwork) {
      const analysis = analyzeRegions(data);
      setMessage(
        `Analysis: ${analysis.regionCount} paintable areas, ${analysis.tinyRegionCount} tiny excluded areas, and ${analysis.edgeConnectedRegionCount} edge-connected areas (including the surrounding background).`,
      );
      return;
    }
    const assignments: Record<number, number> = {};
    for (const item of data.regions) {
      const previousId = segmentation.ids[item.y * segmentation.width + item.x];
      const previousRegion = segmentation.regions.find(
        (old) => old.id === previousId,
      );
      assignments[item.id] =
        picture.assignments?.[previousId] ??
        previousRegion?.number ??
        picture.defaultNumber;
    }
    const image = artwork.toDataURL("image/png");
    setPicture({
      ...picture,
      image,
      preview: image,
      seeds: [],
      assignments,
      labelPositions: {},
    });
    setSegmentation(data);
    setSelectedRegion(null);
    setMessage(
      data.regions.length
        ? `Analysis found ${data.regions.length} paintable areas. Check colors and number positions before saving.`
        : "No enclosed paintable areas found. Close gaps with Draw boundaries, then analyze again.",
    );
  }

  function pointerUp(): void {
    const gesture = gestureRef.current;
    gestureRef.current = null;
    if (gesture && gesture.tool !== "label") analyzeArtwork();
  }

  async function undo(): Promise<void> {
    const previous = history.at(-1);
    if (!previous || isBusy) return;
    setIsBusy(true);
    const request = ++loadRequestRef.current;
    try {
      const data = await prepareArtwork(
        previous.image,
        previous.seeds,
        previous.defaultNumber,
      );
      if (request !== loadRequestRef.current) return;
      const canvas = document.createElement("canvas");
      canvas.width = data.width;
      canvas.height = data.height;
      canvas
        .getContext("2d")
        ?.putImageData(
          new ImageData(
            new Uint8ClampedArray(data.pixels),
            data.width,
            data.height,
          ),
          0,
          0,
        );
      artworkRef.current = canvas;
      setPicture(previous);
      setSegmentation(data);
      setHistory((items) => items.slice(0, -1));
      setSelectedRegion(null);
      setMessage("Last workshop change undone.");
    } catch {
      setMessage(
        "Couldn’t undo this change. Your current picture is still here.",
      );
    } finally {
      if (request === loadRequestRef.current) setIsBusy(false);
    }
  }

  function savePicture(): void {
    if (!segmentation?.regions.length || isBusy) return;
    const assignments = Object.fromEntries(
      segmentation.regions.map((item) => [
        item.id,
        picture.assignments?.[item.id] ?? item.number,
      ]),
    );
    if (
      onSave({
        ...picture,
        title: picture.title.trim() || "My magical puzzle",
        names: picture.names.map(
          (name, index) => name.trim() || `Color ${index + 1}`,
        ),
        assignments,
      })
    )
      setMessage(
        "Saved! Your edited puzzle is ready in Start painting. Existing gallery drawings keep their earlier version.",
      );
    else
      setMessage(
        "Couldn’t save in this browser. Free some browser storage and try again; your edits are still here.",
      );
  }

  return (
    <div className={styles.editor}>
      <div className={styles.topbar}>
        <label>
          Picture name
          <input
            value={picture.title}
            maxLength={40}
            onChange={(event) =>
              setPicture({ ...picture, title: event.target.value })
            }
          />
        </label>
        <button
          className="game-button small gold"
          disabled={isBusy || !segmentation?.regions.length}
          onClick={savePicture}
        >
          Save puzzle changes
        </button>
      </div>
      <div className={styles.tools} aria-label="Workshop tools">
        {(
          [
            ["assign", "Assign colors"],
            ["label", "Move numbers"],
            ["draw", "Draw boundaries"],
            ["erase", "Erase boundaries"],
          ] as [Tool, string][]
        ).map(([value, text]) => (
          <button
            className="game-button small"
            key={value}
            aria-pressed={tool === value}
            disabled={isBusy}
            onClick={() => changeTool(value)}
          >
            {text}
          </button>
        ))}
        <button
          className="game-button small"
          disabled={isBusy || !history.length}
          onClick={undo}
        >
          Undo workshop change
        </button>
        <button
          className="game-button small"
          disabled={isBusy || !segmentation}
          onClick={() => analyzeArtwork(false)}
        >
          Analyze regions
        </button>
      </div>
      <div className={styles.options}>
        <label>
          <input
            type="checkbox"
            checked={isPreview}
            onChange={(event) => setIsPreview(event.target.checked)}
          />{" "}
          Colored preview
        </label>
        <label>
          Brush size
          <input
            type="range"
            min="2"
            max="24"
            value={brushSize}
            onChange={(event) => setBrushSize(Number(event.target.value))}
          />{" "}
          {brushSize}px
        </label>
        <label>
          Difficulty
          <select
            value={picture.difficulty}
            onChange={(event) =>
              updatePicture({
                ...picture,
                difficulty: event.target.value as Picture["difficulty"],
              })
            }
          >
            <option value="easy">Easy peasy</option>
            <option value="more">A little adventure</option>
          </select>
        </label>
      </div>
      <div className={styles.workspace}>
        <aside className={styles.palette} aria-label="Workshop palette">
          <h2>Palette</h2>
          {picture.palette.map((color, index) => (
            <div className={styles.swatch} key={index}>
              <button
                style={{ background: color }}
                aria-label={`Select workshop color ${index + 1}: ${picture.names[index]}`}
                aria-pressed={selectedNumber === index + 1}
                onClick={() => setSelectedNumber(index + 1)}
              >
                {index + 1}
              </button>
              <label>
                Color {index + 1}
                <input
                  type="color"
                  value={color}
                  aria-label={`Color ${index + 1} swatch`}
                  onChange={(event) =>
                    updatePicture({
                      ...picture,
                      palette: picture.palette.map((item, itemIndex) =>
                        itemIndex === index ? event.target.value : item,
                      ),
                    })
                  }
                />
              </label>
              <input
                aria-label={`Color ${index + 1} name`}
                value={picture.names[index]}
                maxLength={30}
                onChange={(event) =>
                  setPicture({
                    ...picture,
                    names: picture.names.map((item, itemIndex) =>
                      itemIndex === index
                        ? event.target.value || `Color ${index + 1}`
                        : item,
                    ),
                  })
                }
              />
            </div>
          ))}
        </aside>
        <div>
          <div className={styles.paper}>
            <canvas
              ref={canvasRef}
              aria-label="Puzzle editing canvas. Use region buttons and position fields below for keyboard editing."
              onPointerDown={pointerDown}
              onPointerMove={pointerMove}
              onPointerUp={pointerUp}
              onPointerCancel={pointerUp}
              style={{ cursor: tool === "label" ? "move" : "crosshair" }}
            />
          </div>
          <p className={styles.status} role="status">
            {message}
          </p>
          {diagnostics && (
            <section className={styles.analysis} aria-label="Region analysis">
              <h2>Region analysis</h2>
              <p>
                {diagnostics.regionCount} paintable areas · Smallest:{" "}
                {diagnostics.smallestRegionArea} pixels · Largest:{" "}
                {diagnostics.largestRegionArea} pixels
              </p>
              <p>
                {diagnostics.tinyRegionCount} tiny enclosed areas excluded ·{" "}
                {diagnostics.edgeConnectedRegionCount} edge-connected areas
                (including the surrounding background)
              </p>
              <p>
                Only enclosed areas are paintable. White areas touching the
                image edge and very tiny enclosed marks are excluded. Draw
                across an open gap to make a new region; erase a boundary to
                join regions.
              </p>
              <p>
                After outline changes, colors transfer from the old area under
                each new number; number positions reset automatically. Check the
                preview before saving.
              </p>
            </section>
          )}
          {region && segmentation && label && (
            <div className={styles.inspector}>
              <h2>Area {region.id + 1}</h2>
              <label>
                Assigned color
                <select
                  value={picture.assignments?.[region.id] ?? region.number}
                  onChange={(event) =>
                    assignRegion(region.id, Number(event.target.value))
                  }
                >
                  {picture.names.map((name, index) => (
                    <option key={index} value={index + 1}>
                      {index + 1} · {name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Number X (%)
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={Number(
                    ((label.x / segmentation.width) * 100).toFixed(1),
                  )}
                  onChange={(event) =>
                    moveLabel(
                      region.id,
                      {
                        x:
                          (Number(event.target.value) / 100) *
                          segmentation.width,
                        y: label.y,
                      },
                      true,
                    )
                  }
                />
              </label>
              <label>
                Number Y (%)
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={Number(
                    ((label.y / segmentation.height) * 100).toFixed(1),
                  )}
                  onChange={(event) =>
                    moveLabel(
                      region.id,
                      {
                        x: label.x,
                        y:
                          (Number(event.target.value) / 100) *
                          segmentation.height,
                      },
                      true,
                    )
                  }
                />
              </label>
            </div>
          )}
          {segmentation && (
            <details className={styles.regions}>
              <summary>Edit areas with buttons</summary>
              <p>
                Select an area to edit its assigned color and number position
                above.
              </p>
              <div>
                {segmentation.regions.map((item) => (
                  <button
                    key={item.id}
                    className="region-button"
                    aria-pressed={selectedRegion === item.id}
                    onClick={() => setSelectedRegion(item.id)}
                  >
                    Edit area {item.id + 1} ·{" "}
                    {picture.assignments?.[item.id] ?? item.number}
                  </button>
                ))}
              </div>
            </details>
          )}
        </div>
      </div>
      <p className={styles.localNote}>
        This workshop saves a local override of the selected picture. Changes
        are stored in this browser, not published to other devices. Choose
        another picture to leave this draft; save first to keep your edits.
      </p>
    </div>
  );
}
