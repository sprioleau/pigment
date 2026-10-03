"use client";

import { Brush, Check, Home, Images, Plus, X } from "lucide-react";
import GameIcon from "./game-icon";
import Image from "next/image";
import { useEffect, useRef, useState, type ChangeEvent, type PointerEvent } from "react";
import PaintBoard from "./paint-board";
import PuzzleWorkshop from "./puzzle-workshop";
import WelcomeScreen from "./welcome-screen";
import {
  EMPTY_LIBRARY,
  MAGIC_PALETTE,
  PICTURES,
  readLibrary,
  writeLibrary,
  type Library,
  type Picture,
  type SavedDrawing,
} from "@/lib/pictures";
import { loadArtwork, paintPixels, prepareArtwork } from "@/lib/paint-engine";

type Screen = "home" | "pictures" | "paint" | "gallery" | "import" | "workshop";
type Session = { id: string; picture: Picture; fills: Record<number, number> };

function PicturePreview({
  picture,
  thumbnail,
}: {
  picture: Picture;
  thumbnail?: string;
}) {
  const [preview, setPreview] = useState(thumbnail ?? picture.preview);
  useEffect(() => {
    if (thumbnail) return;
    let isCancelled = false;
    prepareArtwork(picture.image, picture.seeds, picture.defaultNumber)
      .then((data) => {
        const fills: Record<number, number> = {};
        for (const region of data.regions)
          fills[region.id] = picture.assignments?.[region.id] ?? region.number;
        const canvas = document.createElement("canvas");
        canvas.width = data.width;
        canvas.height = data.height;
        canvas
          .getContext("2d")
          ?.putImageData(
            new ImageData(
              paintPixels(data, fills, picture.palette),
              data.width,
              data.height,
            ),
            0,
            0,
          );
        if (!isCancelled) setPreview(canvas.toDataURL());
      })
      .catch(() => {});
    return () => {
      isCancelled = true;
    };
  }, [picture, thumbnail]);
  return (
    <Image
      src={preview}
      alt=""
      width={320}
      height={320}
      unoptimized
      className="picture-preview"
    />
  );
}

export default function PigmentGame() {
  const [screen, setScreen] = useState<Screen>("home");
  const [library, setLibrary] = useState<Library>(EMPTY_LIBRARY);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [difficulty, setDifficulty] = useState("all");
  const [notice, setNotice] = useState("");
  const [importTitle, setImportTitle] = useState("");
  const [draft, setDraft] = useState<Picture | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState("");
  const mainRef = useRef<HTMLElement>(null);
  const tiltedButton = useRef<HTMLButtonElement | null>(null);
  const importRequest = useRef(0);
  const pictures = [
    ...PICTURES.map(
      (picture) =>
        library.custom.find((custom) => custom.id === picture.id) ?? picture,
    ),
    ...library.custom.filter(
      (picture) => !PICTURES.some((original) => original.id === picture.id),
    ),
  ];

  useEffect(() => {
    const heading = mainRef.current?.querySelector("h1");
    if (heading) {
      heading.tabIndex = -1;
      heading.focus({ preventScroll: true });
    }
  }, [screen, draft?.id]);

  function openImporter(): void {
    importRequest.current++;
    setDraft(null);
    setImportTitle("");
    setImportError("");
    setIsImporting(false);
    setScreen("import");
  }

  function leaveImporter(): void {
    importRequest.current++;
    setIsImporting(false);
    setScreen("home");
  }

  useEffect(() => {
    Promise.resolve().then(() => {
      try {
        setLibrary(readLibrary());
      } catch (reason) {
        setNotice(
          reason instanceof Error
            ? reason.message
            : "Browser storage isn't available. Downloads still work.",
        );
      }
      setHasLoaded(true);
    });
  }, []);

  function persist(next: Library): boolean {
    try {
      writeLibrary(next);
      setLibrary(next);
      return true;
    } catch {
      setNotice(
        "Couldn't save: browser storage is full or unavailable. Download your picture to keep it.",
      );
      return false;
    }
  }

  function startPicture(picture: Picture, saved?: SavedDrawing): void {
    setSession({
      id: saved?.id ?? crypto.randomUUID(),
      picture,
      fills: saved?.fills ?? {},
    });
    setNotice("");
    setScreen("paint");
  }

  function saveDrawing(
    fills: Record<number, number>,
    thumbnail: string,
    total: number,
  ): boolean {
    if (!session) return false;
    const drawing: SavedDrawing = {
      id: session.id,
      picture: session.picture,
      fills,
      thumbnail,
      total,
      updatedAt: Date.now(),
    };
    const drawings = [
      drawing,
      ...library.drawings.filter((item) => item.id !== session.id),
    ];
    return persist({ ...library, drawings });
  }

  async function importFile(
    event: ChangeEvent<HTMLInputElement>,
  ): Promise<void> {
    const file = event.target.files?.[0];
    if (!file) return;
    const request = ++importRequest.current;
    setImportError("");
    setIsImporting(true);
    if (
      !/image\/(png|jpeg|webp)/.test(file.type) ||
      file.size > 12 * 1024 * 1024
    ) {
      setImportError("Choose a PNG, JPEG, or WebP under 12 MB.");
      setIsImporting(false);
      return;
    }
    const url = URL.createObjectURL(file);
    try {
      const image = await loadArtwork(url);
      const scale = Math.min(1, 720 / Math.max(image.width, image.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(image.width * scale);
      canvas.height = Math.round(image.height * scale);
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Couldn't prepare your picture.");
      context.fillStyle = "white";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const src = canvas.toDataURL("image/png");
      const data = await prepareArtwork(src, [], 1);
      if (request !== importRequest.current) return;
      if (!data.regions.length)
        throw new Error(
          "No closed areas found. Try a clean black-and-white drawing with closed outlines.",
        );
      if (data.regions.length > 200)
        throw new Error(
          "This picture has too many tiny areas. Try a simpler drawing with thick outlines.",
        );
      const title =
        importTitle.trim() ||
        file.name
          .replace(/\.[^.]+$/, "")
          .replace(/[-_]/g, " ")
          .slice(0, 40);
      setImportTitle(title);
      setDraft({
        id: crypto.randomUUID(),
        title,
        image: src,
        preview: src,
        palette: [...MAGIC_PALETTE],
        names: [
          "Mint cream",
          "Rose pink",
          "Lavender",
          "Sunshine",
          "Mint",
          "Sky blue",
        ],
        seeds: [],
        defaultNumber: 1,
        difficulty: "easy",
        assignments: {},
      });
    } catch (reason) {
      if (request === importRequest.current)
        setImportError(
          reason instanceof Error ? reason.message : "Couldn't open that file.",
        );
    } finally {
      URL.revokeObjectURL(url);
      if (request === importRequest.current) setIsImporting(false);
      event.target.value = "";
    }
  }

  function finishImport(): void {
    if (!draft) return;
    const picture = {
      ...draft,
      title: importTitle.trim() || "My magical picture",
    };
    if (!persist({ ...library, custom: [...library.custom, picture] })) return;
    setDraft(null);
    startPicture(picture);
  }

  function saveWorkshopPicture(picture: Picture): boolean {
    return persist({
      ...library,
      custom: [
        ...library.custom.filter((item) => item.id !== picture.id),
        picture,
      ],
    });
  }

  function resetButtonTilt(): void {
    const button = tiltedButton.current;
    if (!button) return;
    button.style.setProperty("--tilt-x", "0deg");
    button.style.setProperty("--tilt-y", "0deg");
    button.removeAttribute("data-pointer-tilt");
    tiltedButton.current = null;
  }

  function handleButtonPointerMove(event: PointerEvent<HTMLElement>): void {
    if (event.pointerType !== "mouse" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      resetButtonTilt();
      return;
    }
    const button = event.target instanceof Element ? event.target.closest("button") : null;
    if (!(button instanceof HTMLButtonElement) || button.disabled || button.closest("[data-three-menu]")) {
      resetButtonTilt();
      return;
    }
    if (button !== tiltedButton.current) resetButtonTilt();
    const bounds = button.getBoundingClientRect();
    const x = Math.max(-1, Math.min(1, ((event.clientX - bounds.left) / bounds.width - .5) * 2));
    const y = Math.max(-1, Math.min(1, ((event.clientY - bounds.top) / bounds.height - .5) * 2));
    button.style.setProperty("--tilt-x", `${-y * 2}deg`);
    button.style.setProperty("--tilt-y", `${x * 2}deg`);
    button.setAttribute("data-pointer-tilt", "true");
    tiltedButton.current = button;
  }

  return (
    <main ref={mainRef} className={`game-world screen-${screen}`} onPointerMove={handleButtonPointerMove} onPointerLeave={resetButtonTilt}>
      <div className="world-sparkles" aria-hidden="true">
        <span>✦</span>
        <span>✧</span>
        <span>✦</span>
        <span>✧</span>
        <span>✦</span>
      </div>
      <div className="story-frame">
        <div className="frame-corner top-left" aria-hidden="true">
          ❧
        </div>
        <div className="frame-corner top-right" aria-hidden="true">
          ❧
        </div>
        <div className="frame-corner bottom-left" aria-hidden="true">
          ❧
        </div>
        <div className="frame-corner bottom-right" aria-hidden="true">
          ❧
        </div>
        {notice && (
          <p className="notice" role="alert">
            {notice}
            <button onClick={() => setNotice("")} aria-label="Dismiss message">
              <GameIcon icon={X} />
            </button>
          </p>
        )}
        {screen === "home" && (
          <WelcomeScreen
            isReady={hasLoaded}
            onStart={() => setScreen("pictures")}
            onGallery={() => setScreen("gallery")}
            onImport={openImporter}
            onWorkshop={() => setScreen("workshop")}
          />
        )}
        {screen === "pictures" && (
          <section className="selection-screen">
            <header className="screen-header">
              <button
                className="game-button small"
                onClick={() => setScreen("home")}
              >
                <GameIcon icon={Home} /> Home
              </button>
              <div>
                <span className="eyebrow">OPEN YOUR PAINTBOX</span>
                <h1>What shall we color?</h1>
              </div>
              <button
                className="game-button small gold"
                onClick={() => setScreen("gallery")}
              >
                <GameIcon icon={Images} /> My gallery
              </button>
            </header>
            <div className="difficulty-tabs" aria-label="Picture difficulty">
              {[
                ["all", "All wonders"],
                ["easy", "Easy peasy"],
                ["more", "A little adventure"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  aria-pressed={difficulty === value}
                  className={difficulty === value ? "is-active" : ""}
                  onClick={() => setDifficulty(value)}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="picture-grid">
              {pictures
                .filter(
                  (picture) =>
                    difficulty === "all" || picture.difficulty === difficulty,
                )
                .map((picture) => (
                  <button
                    key={picture.id}
                    className="picture-card"
                    aria-label={`Paint ${picture.title}`}
                    onClick={() => startPicture(picture)}
                  >
                    <div className="picture-mat">
                      <PicturePreview picture={picture} />
                    </div>
                    <span className="picture-title">{picture.title}</span>
                    <span className="picture-level">
                      {picture.difficulty === "easy"
                        ? "✦ Easy peasy"
                        : "✦ A little adventure"}
                    </span>
                  </button>
                ))}
              <button className="picture-card add-card" onClick={openImporter}>
                <GameIcon icon={Plus} />
                <span className="picture-title">Bring your own magic</span>
                <span className="picture-level">Add a new picture</span>
              </button>
            </div>
            <p className="screen-note">
              Choose a picture. Pick a color. See what happens!
            </p>
          </section>
        )}
        {screen === "workshop" && (
          <PuzzleWorkshop
            pictures={pictures}
            onSave={saveWorkshopPicture}
            onBack={() => setScreen("home")}
          />
        )}
        {screen === "paint" && session && (
          <PaintBoard
            key={session.id}
            picture={session.picture}
            initialFills={session.fills}
            onSave={saveDrawing}
            onBack={() => setScreen("pictures")}
            onAgain={() => startPicture(session.picture)}
          />
        )}
        {screen === "gallery" && (
          <section className="gallery-screen">
            <header className="screen-header">
              <button
                className="game-button small"
                onClick={() => setScreen("home")}
              >
                <GameIcon icon={Home} /> Home
              </button>
              <div>
                <span className="eyebrow">MADE BY YOU, WITH MAGIC</span>
                <h1>My little gallery</h1>
              </div>
              <button
                className="game-button small gold"
                onClick={() => setScreen("pictures")}
              >
                <GameIcon icon={Brush} /> Paint something new
              </button>
            </header>
            <p className="gallery-description">
              Every picture belongs here. Even the ones still growing.
            </p>
            {library.drawings.length ? (
              <div className="picture-grid">
                {library.drawings.map((drawing) => (
                  <button
                    key={drawing.id}
                    className="picture-card gallery-card"
                    aria-label={`Continue ${drawing.picture.title}`}
                    onClick={() => startPicture(drawing.picture, drawing)}
                  >
                    <div className="picture-mat">
                      <PicturePreview
                        picture={drawing.picture}
                        thumbnail={drawing.thumbnail}
                      />
                    </div>
                    <span className="picture-title">
                      {drawing.picture.title}
                    </span>
                    <span className="picture-level">
                      {Object.keys(drawing.fills).length >= drawing.total
                        ? "✦ A finished little wonder"
                        : `${Object.keys(drawing.fills).length} of ${drawing.total} areas · Keep painting`}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="empty-gallery">
                <span aria-hidden="true">♡</span>
                <h2>A lovely place for your art</h2>
                <p>
                  Paint your first picture and tap Save.
                  <br />
                  Your little wonders will be waiting here.
                </p>
                <button
                  className="game-button gold"
                  onClick={() => setScreen("pictures")}
                >
                  <GameIcon icon={Brush} /> Let&apos;s make something
                </button>
              </div>
            )}
            <p className="screen-note">
              Saved in this browser. Download your favorites to keep them
              forever.
            </p>
          </section>
        )}
        {screen === "import" && (
          <section className="import-screen">
            {!draft ? (
              <>
                <header className="screen-header">
                  <button className="game-button small" onClick={leaveImporter}>
                    <GameIcon icon={Home} /> Home
                  </button>
                  <div>
                    <span className="eyebrow">A GROWN-UP LITTLE HELPER</span>
                    <h1>Bring your own magic</h1>
                  </div>
                  <span />
                </header>
                <div className="import-card">
                  <span className="import-symbol" aria-hidden="true">
                    ✧
                  </span>
                  <h2>A new picture for the paintbox</h2>
                  <p>
                    Choose clean black-and-white line art with closed outlines
                    and no printed numbers. Then give its areas their colors.
                  </p>
                  <label className="field-label" htmlFor="picture-title">
                    Picture name
                  </label>
                  <input
                    id="picture-title"
                    value={importTitle}
                    onChange={(event) => setImportTitle(event.target.value)}
                    maxLength={40}
                    placeholder="My magical picture"
                  />
                  <label className="upload-label" htmlFor="picture-file">
                    <GameIcon icon={Plus} />{isImporting ? "Preparing your picture…" : "Choose a picture file"}
                  </label>
                  <input
                    className="file-input"
                    id="picture-file"
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    disabled={isImporting}
                    onChange={importFile}
                  />
                  <p className="file-help">
                    PNG, JPEG, or WebP · up to 12 MB
                    <br />
                    Your picture stays in this browser.
                  </p>
                  {importError && (
                    <p role="alert" className="import-error">
                      {importError}
                    </p>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="import-config">
                  <label htmlFor="draft-title">Picture name</label>
                  <input
                    id="draft-title"
                    maxLength={40}
                    value={importTitle}
                    onChange={(event) => setImportTitle(event.target.value)}
                  />
                  <button
                    className="game-button small gold"
                    onClick={finishImport}
                  >
                    <GameIcon icon={Check} /> Add to paintbox & play
                  </button>
                </div>
                <p className="setup-note">
                  All areas start at number 1. Choose a bucket, then tap areas
                  to assign another color.
                </p>
                <PaintBoard
                  key={draft.id}
                  picture={{ ...draft, title: importTitle || draft.title }}
                  initialFills={{}}
                  isEditing
                  onAssign={(id, number) =>
                    setDraft((previous) =>
                      previous
                        ? {
                            ...previous,
                            assignments: {
                              ...previous.assignments,
                              [id]: number,
                            },
                          }
                        : null,
                    )
                  }
                  onSave={() => false}
                  onBack={() => setDraft(null)}
                  onAgain={() => {}}
                />
              </>
            )}
          </section>
        )}
      </div>
      <footer className="world-footer">
        Pigment <span aria-hidden="true">✦</span> a little more colorful, every
        day
      </footer>
    </main>
  );
}
