import React, { useState, useRef, useEffect } from 'react';

export default function AudioRecorder() {
    const [recording, setRecording] = useState(false);
    const [audioUrl, setAudioUrl] = useState(null);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);

    // منع الخروج أو إغلاق المتصفح أثناء التسجيل الفعلي
    useEffect(() => {
        const handleBeforeUnload = (e) => {
            if (recording) {
                e.preventDefault();
                e.returnValue = '';
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [recording]);

    const startRecording = async () => {
        audioChunksRef.current = [];
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                const url = URL.createObjectURL(audioBlob);
                setAudioUrl(url);
            };

            mediaRecorder.start();
            setRecording(true);
        } catch (err) {
            alert("تعذر الوصول إلى الميكروفون. يرجى التحقق من الأذونات.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current) {
            mediaRecorderRef.current.stop();
            setRecording(false);
        }
    };

    return (
        <div style={{ padding: '20px', background: '#fff', borderRadius: '8px', border: '1px solid #ddd' }}>
            <h3>تسجيل المحاضرات الصوتية</h3>
            {recording && <p style={{ color: 'red', fontWeight: 'bold' }}>⚠️ تنبيه: جاري التسجيل الآن. إغلاق المتصفح سيؤدي إلى فقدان التسجيل.</p>}
            
            {!recording ? (
                <button onClick={startRecording} className="btn" style={{ background: '#10B981', color: '#fff', padding: '10px 20px', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>بدء التسجيل</button>
            ) : (
                <button onClick={stopRecording} className="btn" style={{ background: '#EF4444', color: '#fff', padding: '10px 20px', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>إيقاف التسجيل</button>
            )}

            {audioUrl && (
                <div style={{ marginTop: '15px' }}>
                    <p>التسجيل المحفوظ:</p>
                    <audio controls src={audioUrl} style={{ width: '100%', marginTop: '5px' }} />
                </div>
            )}
        </div>
    );
}
