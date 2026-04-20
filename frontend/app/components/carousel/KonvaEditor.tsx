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

  return (
    <KText
      x={(overlay.x / 100) * stageW}
      y={(overlay.y / 100) * stageH}
      offsetX={pxW / 2}
      offsetY={fs / 2}
      text={overlay.text}
      fontSize={fs}
      fontStyle={overlay.fontWeight >= 700 ? 'bold' : 'normal'}
      fontFamily={overlay.fontFamily || 'Plus Jakarta Sans, system-ui, -apple-system, sans-serif'}
      fill={overlay.color}
      width={pxW}
      align="center"
      shadowColor="rgba(0,0,0,0.7)"
      shadowBlur={8}
      shadowOffsetY={2}
      draggable
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

  // Attach transformer to selected node
  useEffect(() => {
    const tr = trRef.current;
    const stage = stageRef.current;
    if (!tr || !stage) return;

    if (!selectedId) {
      tr.nodes([]);
      return;
    }

    // Find node by name
    const name = `sticker_${selectedId}`;
    const name2 = `text_${selectedId}`;
    const node = stage.findOne(`.${name}`) || stage.findOne(`.${name2}`);
    if (node) {
      tr.nodes([node]);
    } else {
      tr.nodes([]);
    }
  }, [selectedId, stickers.length, textOverlays.length]);

  const handleMouseEnterNode = useCallback(() => setCursor('grab'), []);
  const handleMouseLeaveNode = useCallback(() => setCursor('default'), []);
  const handleDragStartNode = useCallback(() => setCursor('grabbing'), []);
  const handleDragEndNode = useCallback(() => setCursor('grab'), []);

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
        onUpdateTextOverlay(id, { maxWidth: newW, x: pctX, y: pctY });
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
        {stickers.map(s => (
          <StickerNode key={s.id} sticker={s} stageW={width} stageH={height}
            isSelected={selectedId === s.id}
            onSelect={() => onSelect(s.id)}
            onMouseEnter={handleMouseEnterNode}
            onMouseLeave={handleMouseLeaveNode}
            onDragStart={handleDragStartNode}
            onDragEnd={handleDragEndNode} />
        ))}
        {textOverlays.map(t => (
          <TextNode key={t.id} overlay={t} stageW={width} stageH={height}
            onSelect={() => onSelect(t.id)}
            onMouseEnter={handleMouseEnterNode}
            onMouseLeave={handleMouseLeaveNode}
            onDragStart={handleDragStartNode}
            onDragEnd={handleDragEndNode} />
        ))}
        <Transformer
          ref={trRef}
          rotateEnabled
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
