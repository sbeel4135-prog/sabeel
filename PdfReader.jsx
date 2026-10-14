import React, { useState, useEffect, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { askGeminiLecture } from '../services/geminiService';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export default function PdfReader() {
    const [pdfDoc, setPdfDoc] = useState(null);
    const [pageNum, setPageNum] = useState(1);
    const [numPages, setNumPages] = useState(0);
    const [extractedText, setExtractedText] = useState('');
    const [loading, setLoading] = useState(false);
    const [outputMessage, setOutputMessage] = useState('');
    
    const canvasRef = useRef(null);
    const renderTaskRef = useRef(null);

    // رفع وتحميل ملف الـ PDF
    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (file && file.type === 'application/pdf') {
            const arrayBuffer = await file.arrayBuffer();
            const loadedPdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            setPdfDoc(loadedPdf);
            setNumPages(loadedPdf.numPages);
            setPageNum(1);
            renderPage(1, loadedPdf);
        }
    };

    // رندر الصفحة مع إلغاء المهام السابقة لمنع التشنج
    const renderPage = async (num, doc = pdfDoc) => {
        if (!doc) return;
        if (renderTaskRef.current) {
            renderTaskRef.current.cancel();
        }

        const page = await doc.getPage(num);
        const viewport = page.getViewport({ scale: 1.2 });
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderContext = { canvasContext: context, viewport };
        const renderTask = page.render(renderContext);
        renderTaskRef.current = renderTask;

        try {
            await renderTask.promise;
            // استخراج النص الحقيقي للصفحة
            const textContent = await page.getTextContent();
            const text = textContent.items.map(item => item.str).join(' ');
            setExtractedText(text);
        } catch (err) {
            if (err.name !== 'RenderingCancelledException') {
                console.error("Render error:", err);
            }
        }
    };

    // التلخيص الفعلي بالاعتماد حصراً على النص المستخرج
    const handleSummarize = async () => {
        if (!extractedText) {
            setOutputMessage("لا يوجد نص مستخرج من هذه الصفحة.");
            return;
        }
        setLoading(true);
        setOutputMessage("جاري تلخيص الصفحة بناءً على المحتوى الفعلي...");
        try {
            const prompt = `قم بتلخيص النص المستخرج من الصفحة الحالية باختصار ودقة علمية عالية مع الالتزام التام بهذا النص فقط:

${extractedText}`;
            const summary = await askGeminiLecture(prompt);
            setOutputMessage(summary);
        } catch (err) {
            setOutputMessage("حدث خطأ أثناء الاتصال أو نفاد الكوتا. يرجى التحقق من مفتاح الـ API.");
        } finally {
            setLoading(false);
        }
    };

    // اختبار سريع من محتوى الصفحة الفعلي
    const handleQuickQuiz = async () => {
        if (!extractedText) {
            setOutputMessage("لا يوجد نص كافٍ لتوليد اختبار.");
            return;
        }
        setLoading(true);
        setOutputMessage("جاري توليد سؤال اختبار من محتوى الصفحة...");
        try {
            const prompt = `بناءً على النص التالي فقط، أنشئ سؤال اختيار من متعدد مع خياراته وإجابته الصحيحة:

${extractedText}`;
            const quiz = await askGeminiLecture(prompt);
            setOutputMessage(quiz);
        } catch (err) {
            setOutputMessage("تعذر توليد الاختبار بسبب خطأ في الطلب.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="pdf-reader-container" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', height: '80vh' }}>
            <div className="canvas-pane" style={{ overflow: 'auto', background: '#eee', padding: '10px', textAlign: 'center' }}>
                <input type="file" accept=".pdf" onChange={handleFileChange} style={{ marginBottom: '10px' }} />
                <div>
                    <button onClick={() => { if(pageNum > 1) { setPageNum(pageNum - 1); renderPage(pageNum - 1); }}} disabled={pageNum <= 1}>الصفحة السابقة</button>
                    <span style={{ margin: '0 15px' }}>صفحة {pageNum} من {numPages}</span>
                    <button onClick={() => { if(pageNum < numPages) { setPageNum(pageNum + 1); renderPage(pageNum + 1); }}} disabled={pageNum >= numPages}>الصفحة التالية</button>
                </div>
                <canvas ref={canvasRef} style={{ marginTop: '10px', boxShadow: '0 0 10px rgba(0,0,0,0.1)' }} />
            </div>
            <div className="tools-pane" style={{ background: '#fff', padding: '15px', borderRadius: '8px', border: '1px solid #ddd' }}>
                <h3>أدوات التلخيص الذكي</h3>
                <button className="btn" onClick={handleSummarize} disabled={loading} style={{ margin: '10px 0', width: '100%' }}>تلخيص الصفحة الحالية</button>
                <button className="btn" onClick={handleQuickQuiz} disabled={loading} style={{ margin: '10px 0', width: '100%' }}>اختبار سريع من الصفحة</button>
                <div style={{ marginTop: '15px', padding: '10px', background: '#f9f9f9', borderRadius: '5px', minHeight: '150px', whiteSpace: 'pre-wrap' }}>
                    {outputMessage}
                </div>
            </div>
        </div>
    );
}
