import { useEffect, useRef, useState } from "react";
import { Modal, ScrollView, Text, View } from "react-native";
import Button from "../button/button";
import type { SpeakerPhotoCropperProps } from "./speakerPhotoCropper";

const SIZE = 512;
type Offset = { x: number; y: number };

export default function SpeakerPhotoCropper({ photo, onCancel, onConfirm }: SpeakerPhotoCropperProps) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const image = useRef<HTMLImageElement | null>(null);
  const drag = useRef<{ id: number; x: number; y: number; offset: Offset } | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState<Offset>({ x: 0, y: 0 });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const clampOffset = (next: Offset, nextZoom = zoom) => {
    const source = image.current;
    if (!source) return { x: 0, y: 0 };
    const scale = Math.max(SIZE / source.naturalWidth, SIZE / source.naturalHeight) * nextZoom;
    const maxX = Math.max(0, (source.naturalWidth * scale - SIZE) / 2);
    const maxY = Math.max(0, (source.naturalHeight * scale - SIZE) / 2);
    return { x: Math.min(maxX, Math.max(-maxX, next.x)), y: Math.min(maxY, Math.max(-maxY, next.y)) };
  };

  useEffect(() => {
    let active = true;
    const source = new window.Image();
    source.onload = () => {
      if (!active) return;
      image.current = source;
      setLoaded(true);
    };
    source.onerror = () => {
      if (active) setError("Não foi possível abrir a foto. Selecione outro arquivo.");
    };
    source.src = photo.uri;
    return () => {
      active = false;
      image.current = null;
    };
  }, [photo.uri]);

  useEffect(() => {
    const source = image.current;
    const context = canvas.current?.getContext("2d");
    if (!loaded || !source || !context) return;
    const scale = Math.max(SIZE / source.naturalWidth, SIZE / source.naturalHeight) * zoom;
    const width = source.naturalWidth * scale;
    const height = source.naturalHeight * scale;
    context.clearRect(0, 0, SIZE, SIZE);
    context.drawImage(source, (SIZE - width) / 2 + offset.x, (SIZE - height) / 2 + offset.y, width, height);
  }, [loaded, zoom, offset]);

  const changeZoom = (next: number) => {
    const value = Math.min(4, Math.max(1, next));
    setZoom(value);
    setOffset(current => clampOffset(current, value));
  };

  const confirm = async () => {
    if (!loaded || busy || !canvas.current) return;
    setBusy(true);
    setError("");
    try {
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.current!.toBlob(value => value ? resolve(value) : reject(new Error()), "image/png");
      });
      const file = new File([blob], "foto-apresentacao.png", { type: "image/png" });
      // O resultado tem tamanho limitado a 512×512 e mantém transparência.
      onConfirm({ ...photo, uri: canvas.current.toDataURL("image/png"), width: SIZE, height: SIZE, mimeType: file.type, fileName: file.name, fileSize: file.size, file });
    } catch {
      setError("Não foi possível recortar a foto. Tente novamente.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal transparent animationType="fade" onRequestClose={() => { if (!busy) onCancel(); }}>
      <View className="flex-1 items-center justify-center bg-black/60 px-4 py-4 sm:px-6 sm:py-8">
        <View className="w-full max-w-lg rounded-lg bg-blue-900 p-4 sm:p-6" style={{ maxHeight: "100%" }}>
          <Text accessibilityRole="header" className="text-white text-xl font-poppinsSemiBold mb-3">Ajustar foto</Text>
          <ScrollView style={{ minHeight: 0 }} contentContainerStyle={{ paddingRight: 4 }}>
          <Text className="text-gray-400 text-sm font-inter mb-4">Arraste a foto para enquadrar e ajuste o zoom.</Text>
            <div style={{ width: "min(100%, 288px, 38vh)", aspectRatio: "1", margin: "0 auto", position: "relative", flexShrink: 0 }}>
              <canvas
                ref={canvas}
                width={SIZE}
                height={SIZE}
                aria-label="Prévia do recorte da foto. Arraste para enquadrar."
                role="img"
                style={{ display: "block", width: "100%", height: "100%", borderRadius: "50%", border: "1px solid #536080", touchAction: "none", cursor: busy ? "default" : "grab", background: "#171717" }}
                onPointerDown={event => {
                  if (!loaded || busy) return;
                  event.currentTarget.setPointerCapture(event.pointerId);
                  drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, offset };
                }}
                onPointerMove={event => {
                  const current = drag.current;
                  if (!current || current.id !== event.pointerId || busy) return;
                  const rect = event.currentTarget.getBoundingClientRect();
                  setOffset(clampOffset({ x: current.offset.x + (event.clientX - current.x) * SIZE / rect.width, y: current.offset.y + (event.clientY - current.y) * SIZE / rect.height }));
                }}
                onPointerUp={() => { drag.current = null; }}
                onPointerCancel={() => { drag.current = null; }}
                onLostPointerCapture={() => { drag.current = null; }}
                tabIndex={0}
                onKeyDown={event => {
                  const shifts: Record<string, Offset> = { ArrowLeft: { x: -16, y: 0 }, ArrowRight: { x: 16, y: 0 }, ArrowUp: { x: 0, y: -16 }, ArrowDown: { x: 0, y: 16 } };
                  if (!loaded || busy || !shifts[event.key]) return;
                  event.preventDefault();
                  const shift = shifts[event.key];
                  setOffset(current => clampOffset({ x: current.x + shift.x, y: current.y + shift.y }));
                }}
              />
            </div>
          {!loaded && !error && <Text className="text-gray-400 text-sm font-inter mt-3">Carregando foto...</Text>}
          <label htmlFor="speaker-photo-zoom" style={{ color: "#E0E0E0", fontSize: 14, marginTop: 16, marginBottom: 8 }}>Zoom: {Math.round(zoom * 100)}%</label>
          <View className="flex-row items-center gap-3">
            <button type="button" aria-label="Diminuir zoom" disabled={!loaded || busy || zoom <= 1} onClick={() => changeZoom(zoom - 0.25)} style={zoomButtonStyle}>−</button>
            <input id="speaker-photo-zoom" aria-label="Zoom da foto" type="range" min={1} max={4} step={0.05} value={zoom} disabled={!loaded || busy} onChange={event => changeZoom(Number(event.target.value))} style={{ flex: 1, minWidth: 0, accentColor: "#1400FF" }} />
            <button type="button" aria-label="Aumentar zoom" disabled={!loaded || busy || zoom >= 4} onClick={() => changeZoom(zoom + 0.25)} style={zoomButtonStyle}>+</button>
          </View>
          <Text className="text-gray-400 text-xs font-inter mt-3">Também é possível mover a foto com as setas do teclado. O recorte será enviado somente ao salvar a atividade.</Text>
          {!!error && <Text accessibilityRole="alert" className="text-danger font-inter mt-3">{error}</Text>}
          </ScrollView>
          <View className="flex-row flex-wrap gap-3 mt-5 pt-4 border-t border-border">
            <Button title="Cancelar" accessibilityRole="button" accessibilityLabel="Cancelar recorte" bgColor="bg-gray-700" className="flex-1 min-w-[104px]" disabled={busy} onPress={onCancel} />
            <Button title="Usar foto" accessibilityRole="button" className="flex-1 min-w-[104px]" loading={busy} disabled={!loaded || busy} onPress={confirm} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const zoomButtonStyle = { width: 44, height: 44, borderRadius: 8, border: "1px solid #536080", background: "#29303F", color: "#FFFFFF", fontSize: 22, cursor: "pointer", flexShrink: 0 };
