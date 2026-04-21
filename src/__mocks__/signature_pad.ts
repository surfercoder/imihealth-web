type EventHandler = () => void;

class SignaturePad {
  private _isEmpty = true;
  private _listeners = new Map<string, Set<EventHandler>>();
  private _canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement, _options?: Record<string, unknown>) {
    this._canvas = canvas;
    // Simulate click-to-draw for tests
    this._canvas.addEventListener("click", () => {
      this._isEmpty = false;
      this._emit("endStroke");
    });
  }

  isEmpty(): boolean {
    return this._isEmpty;
  }

  toDataURL(type?: string): string {
    return `data:${type || "image/png"};base64,MOCK`;
  }

  clear(): void {
    this._isEmpty = true;
  }

  off(): void {
    this._listeners.clear();
  }

  addEventListener(event: string, handler: EventHandler): void {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, new Set());
    }
    this._listeners.get(event)!.add(handler);
  }

  removeEventListener(event: string, handler: EventHandler): void {
    this._listeners.get(event)?.delete(handler);
  }

  private _emit(event: string): void {
    this._listeners.get(event)?.forEach((handler) => handler());
  }
}

export default SignaturePad;
