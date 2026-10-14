import React, { useRef, useState, useEffect } from 'react';

export default function CanvasDrawing() {
    const canvasRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [tool, setTool] = useState('pen'); // 'pen' or 'eraser'
    const ctxRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        canvas.width = canvas.parentElement.clientWidth;
        canvas.height = 500;
        const ctx = canvas.getContext('2d');
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = 3;
        ctxRef.current = ctx;
    }, []);

    const startDrawing = (e) => {
        const { offsetX, offsetY } = e.nativeEvent;
        setIsDrawing(true);
        if (tool === 'pen') {
            ctxRef.current.globalCompositeOperation = 'source-over';
            ctxRef.current.strokeStyle = '#4F46E5';
            ctxRef.current.beginPath();
            ctxRef.current.moveTo(offsetX, offsetY);
        }
    };

    const draw = (e) => {
        if (!isDrawing) return;
        const { offsetX, offsetY } = e.nativeEvent;

        if (tool === 'pen') {
            ctxRef.current.lineTo(offsetX, offsetY);
            ctxRef.current.stroke();
        } else if (tool === 'eraser') {
            // ممحاة جزئية دقيقة (Pixel/Point Eraser) تمسح بقطر محدد حول المؤشر
            ctxRef.current.clearRect(offsetX - 10, offsetY - 10, 20, 20);
        }
    };

    const stopDrawing = () => {
        setIsDrawing(false);
        ctxRef.current.closePath();
    };

    return (
        <div style={{ border: '1px solid #ccc', borderRadius: '8px', padding: '10px', background: '#fff' }}>
            <div style={{ marginBottom: '10px' }}>
                <button onClick={() => setTool('pen')} style={{ background: tool === 'pen' ? '#4F46E5' : '#ddd', color: tool === 'pen' ? '#fff' : '#000', padding: '8px 15px', border: 'none', borderRadius: '4px', cursor: 'pointer', marginLeft: '5px' }}>قلم كتابة</button>
                <button onClick={() => setTool('eraser')} style={{ background: tool === 'eraser' ? '#4F46E5' : '#ddd', color: tool === 'eraser' ? '#fff' : '#000', padding: '8px 15px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>ممحاة جزئية</button>
            </div>
            <canvas
                ref={canvasRef}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                style={{ border: '1px solid #eee', cursor: tool === 'eraser' ? 'crosshair' : 'default', display: 'block', width: '100%' }}
            />
        </div>
    );
}
