import { useRef, useEffect, useState, useCallback, type MouseEvent, type TouchEvent } from 'react';
import { useTranslation } from 'react-i18next';

interface SignaturePadProps {
    onSign: (signatureDataUrl: string) => void;
    onCancel: () => void;
}

/**
 * Apply DPR-aware sizing + default stroke style to a canvas.
 * Pulled out so we can re-run it on viewport resize without duplication.
 */
function configureCanvas(canvas: HTMLCanvasElement): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    ctx.setTransform(1, 0, 0, 1, 0, 0); // reset before re-scaling
    ctx.scale(dpr, dpr);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
}

export function SignaturePad({ onSign, onCancel }: SignaturePadProps) {
    const { t } = useTranslation(['tenant', 'common']);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [hasDrawn, setHasDrawn] = useState(false);

    // Track whether a pointer-down began inside the modal content — if so,
    // we suppress the matching click-up on the overlay so an off-canvas
    // mouseup doesn't accidentally dismiss the modal mid-signature.
    const downStartedInside = useRef(false);

    const getCoords = useCallback((e: MouseEvent | TouchEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        if ('touches' in e) {
            return {
                x: e.touches[0].clientX - rect.left,
                y: e.touches[0].clientY - rect.top,
            };
        }
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
        };
    }, []);

    // Initial canvas setup + re-config on viewport changes. We preserve
    // whatever has already been drawn by snapshotting to a data URL and
    // re-painting after resize — so rotating a phone mid-signature doesn't
    // wipe the user's strokes.
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        configureCanvas(canvas);

        const handleResize = () => {
            const c = canvasRef.current;
            if (!c) return;
            const snapshot = hasDrawn ? c.toDataURL('image/png') : null;
            configureCanvas(c);
            if (snapshot) {
                const img = new Image();
                img.onload = () => {
                    const ctx = c.getContext('2d');
                    if (!ctx) return;
                    const rect = c.getBoundingClientRect();
                    ctx.drawImage(img, 0, 0, rect.width, rect.height);
                };
                img.src = snapshot;
            }
        };

        window.addEventListener('resize', handleResize);
        window.addEventListener('orientationchange', handleResize);
        return () => {
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('orientationchange', handleResize);
        };
    }, [hasDrawn]);

    // For touch events React attaches passive listeners by default — calling
    // preventDefault on the synthetic event is a no-op. We rely on
    // `touchAction: 'none'` (set on the wrapper below) to suppress scrolling.

    const startDrawing = (e: MouseEvent | TouchEvent) => {
        const ctx = canvasRef.current?.getContext('2d');
        if (!ctx) return;
        const { x, y } = getCoords(e);
        ctx.beginPath();
        ctx.moveTo(x, y);
        setIsDrawing(true);
        setHasDrawn(true);
        downStartedInside.current = true;
    };

    const draw = (e: MouseEvent | TouchEvent) => {
        if (!isDrawing) return;
        const ctx = canvasRef.current?.getContext('2d');
        if (!ctx) return;
        const { x, y } = getCoords(e);
        ctx.lineTo(x, y);
        ctx.stroke();
    };

    const stopDrawing = () => {
        setIsDrawing(false);
    };

    const clearCanvas = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        // clearRect uses the CURRENT transform — clear the full CSS size,
        // not the backing-store size, otherwise we'd only clear part of the
        // canvas on high-DPR screens.
        const rect = canvas.getBoundingClientRect();
        ctx.clearRect(0, 0, rect.width, rect.height);
        setHasDrawn(false);
    };

    const handleSign = () => {
        const canvas = canvasRef.current;
        if (!canvas || !hasDrawn) return;
        const dataUrl = canvas.toDataURL('image/png');
        onSign(dataUrl);
    };

    // Only dismiss when the click both started and ended on the overlay.
    // This stops a stroke that begins on canvas and releases over the
    // overlay from accidentally closing the modal.
    const handleOverlayMouseDown = () => {
        downStartedInside.current = false;
    };

    const handleOverlayClick = () => {
        if (downStartedInside.current) {
            downStartedInside.current = false;
            return;
        }
        onCancel();
    };

    return (
        <div className="modal-overlay" onMouseDown={handleOverlayMouseDown} onClick={handleOverlayClick}>
            <div
                className="modal-content"
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => { downStartedInside.current = true; e.stopPropagation(); }}
                style={{ maxWidth: '500px' }}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h2 style={{ margin: 0, fontSize: 'clamp(1.1rem, 3vw, 1.4rem)' }}>{t('signature.title')}</h2>
                    <button onClick={onCancel} type="button" style={{ background: 'transparent', color: '#333', fontSize: '1.5rem', padding: '4px 8px' }}>x</button>
                </div>

                <p style={{ color: '#666', fontSize: 'clamp(0.85rem, 2.5vw, 0.95rem)', marginBottom: '16px', lineHeight: '1.5' }}>
                    {t('signature.instruction')}
                </p>

                <div style={{
                    border: '2px dashed var(--border-color)',
                    borderRadius: '8px',
                    background: '#fafafa',
                    position: 'relative',
                    marginBottom: '16px',
                    touchAction: 'none'
                }}>
                    <canvas
                        ref={canvasRef}
                        style={{
                            width: '100%',
                            height: '200px',
                            display: 'block',
                            cursor: 'crosshair'
                        }}
                        onMouseDown={startDrawing}
                        onMouseMove={draw}
                        onMouseUp={stopDrawing}
                        onMouseLeave={stopDrawing}
                        onTouchStart={startDrawing}
                        onTouchMove={draw}
                        onTouchEnd={stopDrawing}
                    />
                    {!hasDrawn && (
                        <div style={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            color: '#bbb',
                            fontSize: 'clamp(0.85rem, 2.5vw, 1rem)',
                            pointerEvents: 'none',
                            textAlign: 'center'
                        }}>
                            {t('signature.signHere')}
                        </div>
                    )}
                </div>

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                    <button onClick={clearCanvas} type="button" className="btn-secondary" style={{ fontSize: 'clamp(0.85rem, 2vw, 0.95rem)' }}>
                        {t('signature.clear')}
                    </button>
                    <button onClick={onCancel} type="button" className="btn-secondary" style={{ fontSize: 'clamp(0.85rem, 2vw, 0.95rem)' }}>
                        {t('common:buttons.cancel')}
                    </button>
                    <button onClick={handleSign} type="button" className="btn-primary" disabled={!hasDrawn} style={{ opacity: hasDrawn ? 1 : 0.5, fontSize: 'clamp(0.85rem, 2vw, 0.95rem)' }}>
                        {t('signature.signButton')}
                    </button>
                </div>
            </div>
        </div>
    );
}
