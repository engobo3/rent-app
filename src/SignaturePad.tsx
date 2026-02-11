import { useRef, useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

interface SignaturePadProps {
    onSign: (signatureDataUrl: string) => void;
    onCancel: () => void;
}

export function SignaturePad({ onSign, onCancel }: SignaturePadProps) {
    const { t } = useTranslation(['tenant', 'common']);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [hasDrawn, setHasDrawn] = useState(false);

    const getCoords = useCallback((e: React.MouseEvent | React.TouchEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();

        if ('touches' in e) {
            return {
                x: e.touches[0].clientX - rect.left,
                y: e.touches[0].clientY - rect.top
            };
        }
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    }, []);

    // Set up canvas resolution
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
    }, []);

    const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
        e.preventDefault();
        const ctx = canvasRef.current?.getContext('2d');
        if (!ctx) return;
        const { x, y } = getCoords(e);
        ctx.beginPath();
        ctx.moveTo(x, y);
        setIsDrawing(true);
        setHasDrawn(true);
    };

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
        e.preventDefault();
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
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setHasDrawn(false);
    };

    const handleSign = () => {
        const canvas = canvasRef.current;
        if (!canvas || !hasDrawn) return;
        const dataUrl = canvas.toDataURL('image/png');
        onSign(dataUrl);
    };

    return (
        <div className="modal-overlay" onClick={onCancel}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h2 style={{ margin: 0, fontSize: 'clamp(1.1rem, 3vw, 1.4rem)' }}>{t('signature.title')}</h2>
                    <button onClick={onCancel} style={{ background: 'transparent', color: '#333', fontSize: '1.5rem', padding: '4px 8px' }}>x</button>
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
                    <button
                        onClick={clearCanvas}
                        className="btn-secondary"
                        style={{ fontSize: 'clamp(0.85rem, 2vw, 0.95rem)' }}
                    >
                        {t('signature.clear')}
                    </button>
                    <button
                        onClick={onCancel}
                        className="btn-secondary"
                        style={{ fontSize: 'clamp(0.85rem, 2vw, 0.95rem)' }}
                    >
                        {t('common:buttons.cancel')}
                    </button>
                    <button
                        onClick={handleSign}
                        className="btn-primary"
                        disabled={!hasDrawn}
                        style={{
                            opacity: hasDrawn ? 1 : 0.5,
                            fontSize: 'clamp(0.85rem, 2vw, 0.95rem)'
                        }}
                    >
                        {t('signature.signButton')}
                    </button>
                </div>
            </div>
        </div>
    );
}
