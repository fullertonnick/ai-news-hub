'use client';
import { useRef, useEffect, useCallback, useState } from 'react';
import { Stage, Layer, Image as KImage, Text as KText, Transformer } from 'react-konva';
import type { StickerOverlay } from '../../types';
import type { TextOverlay } from '../../stores/useCarouselStore';

// ─── Image loader hook ──────────────────────────────────────────────────────
function useKonvaImage(src: string): HTMLImageElement | null {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  useEffect(() => {
    if (!src) { setImg(null); return; }
    const image = new window.Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => setImg(image);
    image.onerror = () => setImg(null);
    image.src = src;
    return () => { image.onload = null; image.onerror = null; };
  }, [src]);
  return img;
}

// ─── Single sticker ─────────────────────────────────────────────────────────
function StickerNode({ sticker, stageW, stageH, isSelected, onSelect, onMouseEnter, onMouseLeave, onDragStart, onDragEnd }: {
  sticker: StickerOverlay; stageW: number; stageH: number;
  isSelected: boolean; onSelect: () => void;
  onMouseEnter?: () => void; onMouseLeave?: () => void;
  onDragStart?: () => void; onDragEnd?: () => void;
}) {
  const img = useKonvaImage(sticker.src);
  if (!img) return null;

  const pxW = (sticker.width / 100) * stageW;
  const aspect = (img.naturalHeight || 1) / (img.naturalWidth || 1);

  return (
    <KImage
      image={img}
      x={(sticker.x / 100) * stageW}
      y={(sticker.y / 100) * stageH}
      width={pxW}
      height={pxW * aspect}
      offsetX={pxW / 2}
      offsetY={(pxW * aspect) / 2}
      rotation={sticker.rotation}
      opacity={sticker.opacity}
      draggable
      dragBoundFunc={(pos) => ({
        x: Math.max(0, Math.min(stageW, pos.x)),
        y: Math.max(0, Math.min(stageH, pos.y)),
      })}
      onMouseDown={(e: any) => { e.cancelBubble = true; onSelect(); }}
      onTouchStart={(e: any) => { e.cancelBubble = true; onSelect(); }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      name={`sticker_${sticker.id}`}
    />
  );
}

// ─── Single text ────────────────────────────────────────────────────────────
function TextNode({ overlay, stageW, stageH, onSelect, onMouseEnter, onMouseLeave, onDragStart, onDragEnd }: {
  overlay: TextOverlay; stageW: number; stageH: number; onSelect: () => void;
  onMouseEnter?: () => void; onMouseLeave?: () => void;
  onDragStart?: () => void; onDragEnd?: () => void;
}) {
  const pxW = (overlay.maxWidth / 100) * stageW;
  const fs = overlay.fontSize * (stageW / 1080);
  // Estimate total rendered height to match SlideRenderer's translate(-50%,-50%) center anchor.
  // Count explicit newlines PLUS wrapped lines (Konva wraps at pxW like the HTML renderer).
  // Average char width ≈ 0.58 * fontSize for Plus Jakarta Sans at typical weights.
  const avgCharW = fs * 0.58;
  const charsPerLine = Math.max(1, Math.floor(pxW / avgCharW));
  const wrappedLineCount = overlay.text.split('\n').reduce(
    (sum, line) => sum + Math.max(1, Math.ceil((line.length || 1) / charsPerLine)),
    0,
  );
  const estimatedHeight = fs * 1.3 * wrappedLineCount;

  return (
    <KText
      x={(overlay.x / 100) * stageW}
      y={(overlay.y / 100) * stageH}
      offsetX={pxW / 2}
      offsetY={estimatedHeight / 2}
      rotation={overlay.rotation || 0}
      text={overlay.text}
      fontSize={fs}
      lineHeight={1.3}
      fontStyle={overlay.fontWeight >= 600 ? String(overlay.fontWeight) : 'normal'}
      fontFamily={overlay.fontFamily || '"Plus Jakarta Sans", "Inter", -apple-system, BlinkMacSystemFont, sans-serif'}
      fill={overlay.color}
      width={pxW}
      align="center"
      shadowColor="rgba(0,0,0,0.7)"
      shadowBlur={8}
      shadowOffsetY={2}
      draggable
      dragBoundFunc={(pos) => ({
        x: Math.max(0, Math.min(stageW, pos.x)),
        y: Math.max(0, Math.min(stageH, pos.y)),
      })}
      onMouseDown={(e: any) => { e.cancelBubble = true; onSelect(); }}
      onTouchStart={(e: any) => { e.cancelBubble = true; onSelect(); }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      name={`text_${overlay.id}`}
    />
  );
}

// ─── Main ───────────────────────────────────────────────────────────────────
interface Props {
  stickers: StickerOverlay[];
  textOverlays: TextOverlay[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onUpdateSticker: (id: string, updates: Partial<StickerOverlay>) => void;
  onUpdateTextOverlay: (id: string, updates: Partial<TextOverlay>) => void;
  width: number;
  height: number;
}

export default function KonvaEditor({ stickers, textOverlays, selectedId, onSelect, onUpdateSticker, onUpdateTextOverlay, width, height }: Props) {
  const stageRef = useRef<any>(null);
  const trRef = useRef<any>(null);
  const [cursor, setCursor] = useState<string>('default');

  // Merge stickers and text overlays into a single z-sorted list so Konva's paint order
  // matches the CSS z-index used in SlideRenderer (lower index = painted first = beneath).
  type LayerItem =
    | { kind: 'sticker'; data: StickerOverlay }
    | { kind: 'text'; data: TextOverlay };
  const sortedLayers: LayerItem[] = [
    ...stickers.map(s => ({ kind: 'sticker' as const, data: s })),
    ...textOverlays.map(t => ({ kind: 'text' as const, data: t })),
  ].sort((a, b) => (a.data.zIndex ?? 10) - (b.data.zIndex ?? 10));

  // Reset cursor when the slide changes (stickers/overlays swapped out from under us)
  useEffect(() => { setCursor('default'); }, [stickers, textOverlays]);

  // Attach transformer to selected node.
  // Sticker images (especially uploaded PNGs) load async — poll until the node is
  // available, giving up after ~2 seconds to avoid infinite retries on missing nodes.
  useEffect(() => {
    const tr = trRef.current;
    const stage = stageRef.current;
    if (!tr || !stage) return;

    if (!selectedId) {
      tr.nodes([]);
      return;
    }

    let attempts = 0;
    const MAX_ATTEMPTS = 10;

    let timer: ReturnType<typeof setTimeout>;

    const attach = () => {
      const node = stage.findOne(`.sticker_${selectedId}`) || stage.findOne(`.text_${selectedId}`);
      if (node) {
        tr.nodes([node]);
        tr.getLayer()?.batchDraw();
        return;
      }
      if (attempts < MAX_ATTEMPTS) {
        attempts++;
        timer = setTimeout(attach, 200);
      } else {
        tr.nodes([]);
      }
    };

    attach();
    return () => clearTimeout(timer);
  // Include the full arrays so the effect re-runs if an overlay is replaced (same count, different ID)
  }, [selectedId, stickers, textOverlays]);

  const handleMouseEnterNode = useCallback(() => setCursor('grab'), []);
  const handleMouseLeaveNode = useCallback(() => setCursor('default'), []);
  const handleDragStartNode = useCallback(() => setCursor('grabbing'), []);
  // After drag ends, re-evaluate hover state — if mouse is still over a node Konva
  // fires mouseenter again and updates to 'grab'. Default to 'default' as fallback.
  const handleDragEndNode = useCallback(() => setCursor('default'), []);

  // Sync drag end back to store
  const handleDragEnd = useCallback((e: any) => {
    const node = e.target;
    const name: string = node.name() || '';
    const pctX = Math.round((node.x() / width) * 100);
    const pctY = Math.round((node.y() / height) * 100);

    if (name.startsWith('sticker_')) {
      onUpdateSticker(name.replace('sticker_', ''), { x: pctX, y: pctY });
    } else if (name.startsWith('text_')) {
      onUpdateTextOverlay(name.replace('text_', ''), { x: pctX, y: pctY });
    }
  }, [width, height, onUpdateSticker, onUpdateTextOverlay]);

  // Sync transform end back to store
  const handleTransformEnd = useCallback((e: any) => {
    const node = e.target;
    const name: string = node.name() || '';
    const scaleX = node.scaleX();
    node.scaleX(1);
    node.scaleY(1);
    // Force immediate redraw so the scale reset doesn't flash on-screen for one frame
    trRef.current?.getLayer()?.batchDraw();

    const pctX = Math.round((node.x() / width) * 100);
    const pctY = Math.round((node.y() / height) * 100);
    const rot = Math.round(node.rotation());

    if (name.startsWith('sticker_')) {
      const id = name.replace('sticker_', '');
      const s = stickers.find(s => s.id === id);
      if (s) {
        const newW = Math.round(Math.max(3, Math.min(90, s.width * scaleX)));
        onUpdateSticker(id, { width: newW, rotation: rot, x: pctX, y: pctY });
      }
    } else if (name.startsWith('text_')) {
      const id = name.replace('text_', '');
      const t = textOverlays.find(t => t.id === id);
      if (t) {
        const newW = Math.round(Math.max(10, Math.min(100, t.maxWidth * scaleX)));
        // Scale fontSize so resizing handles visually grow/shrink the text, not just the wrap width
        const newFontSize = Math.round(Math.max(8, Math.min(120, t.fontSize * scaleX)));
        onUpdateTextOverlay(id, { maxWidth: newW, fontSize: newFontSize, rotation: rot, x: pctX, y: pctY });
      }
    }
  }, [stickers, textOverlays, width, height, onUpdateSticker, onUpdateTextOverlay]);

  const handleStageClick = useCallback((e: any) => {
    if (e.target === e.target.getStage()) onSelect(null);
  }, [onSelect]);

  return (
    <Stage ref={stageRef} width={width} height={height}
      onClick={handleStageClick} onTap={handleStageClick}
      style={{ position: 'absolute', top: 0, left: 0, zIndex: 20, borderRadius: 12, cursor }}>
      <Layer
        onDragEnd={handleDragEnd}
        onTransformEnd={handleTransformEnd}
      >
        {sortedLayers.map(item =>
          item.kind === 'sticker' ? (
            <StickerNode key={item.data.id} sticker={item.data} stageW={width} stageH={height}
              isSelected={selectedId === item.data.id}
              onSelect={() => onSelect(item.data.id)}
              onMouseEnter={handleMouseEnterNode}
              onMouseLeave={handleMouseLeaveNode}
              onDragStart={handleDragStartNode}
              onDragEnd={handleDragEndNode} />
          ) : (
            <TextNode key={item.data.id} overlay={item.data} stageW={width} stageH={height}
              onSelect={() => onSelect(item.data.id)}
              onMouseEnter={handleMouseEnterNode}
              onMouseLeave={handleMouseLeaveNode}
              onDragStart={handleDragStartNode}
              onDragEnd={handleDragEndNode} />
          )
        )}
        <Transformer
          ref={trRef}
          rotateEnabled
          keepRatio
          enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right']}
          borderStroke="#FF7107"
          anchorStroke="#FF7107"
          anchorFill="#1a1a1a"
          anchorSize={8}
          boundBoxFunc={(_oldBox: any, newBox: any) => {
            if (newBox.width < 20 || newBox.height < 20) return _oldBox;
            return newBox;
          }}
        />
      </Layer>
    </Stage>
  );
}
