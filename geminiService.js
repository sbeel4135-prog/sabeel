import { GoogleGenerativeAI } from "@google/generative-ai";

// استرجاع المفتاح المخزن محلياً أو استخدام المفتاح الافتراضي
const getApiKey = () => localStorage.getItem('gemini_api_key') || import.meta.env.VITE_GEMINI_API_KEY || '';

export async function askGeminiLecture(promptText, fileContent = null) {
    const apiKey = getApiKey();
    if (!apiKey) {
        throw new Error("API_KEY_MISSING");
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // إعداد مهلة زمنية بحد أقصى 35 ثانية لمنع تعليق الواجهة
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 35000);

    try {
        let contents = [promptText];
        if (fileContent) {
            contents.push(fileContent);
        }

        // تنفيذ الطلب الفعلي مع إشارة الإلغاء
        const result = await Promise.race([
            model.generateContent({ contents }),
            new Promise((_, reject) => 
                controller.signal.addEventListener('abort', () => reject(new Error("TIMEOUT")))
            )
        ]);

        clearTimeout(timeoutId);
        const response = await result.response;
        return response.text();

    } catch (error) {
        clearTimeout(timeoutId);
        if (error.message === "TIMEOUT" || error.name === 'AbortError') {
            throw new Error("TIMEOUT_EXCEEDED");
        }
        // التحقق من خطأ نفاد الكوتا (429 Resource Exhausted)
        if (error.status === 429 || (error.message && error.message.includes('429'))) {
            throw new Error("QUOTA_EXCEEDED");
        }
        throw error;
    }
}
