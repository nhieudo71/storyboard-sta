
import { GoogleGenAI, Type } from "@google/genai";
import { WorkflowStep, WorkflowOutput } from "../types";

const SYSTEM_INSTRUCTION = `BẠN LÀ MỘT HỆ THỐNG AI CHUYÊN TẠO NỘI DUNG YOUTUBE FACELESS TÀI CHÍNH CÁ NHÂN CHO NGƯỜI ĐI LÀM.
NGUYÊN TẮC BẮT BUỘC:
- Faceless 100%, không nhân vật, không kể chuyện cá nhân.
- Giọng điệu: trầm – chậm – phân tích – nội tâm.
- Phù hợp người đi làm xem ban đêm.
- Không giáo điều, không dạy đời.
- Không tạo bảng, chỉ text thuần.
- Mọi đầu ra phải đồng bộ về thời lượng & logic.`;

export const generateStep = async (
  step: WorkflowStep,
  inputs: { scriptPrompt: string; title: string },
  currentOutput: WorkflowOutput
): Promise<string> => {
  // Determine apiKey safely for browser environments where 'process' might not exist.
  // Prioritize window.APP_GEMINI_API_KEY which is injected via index.html on Vercel.
  const apiKey: string | undefined = 
    (typeof window !== 'undefined' && (window as any).APP_GEMINI_API_KEY)
      ? (window as any).APP_GEMINI_API_KEY
      : (typeof process !== 'undefined' && process.env && process.env.API_KEY) 
          ? process.env.API_KEY 
          : undefined;
  
  if (!apiKey || apiKey === "%.%APP_GEMINI_API_KEY%.%") { // Also check if Vercel failed to inject the variable
    // If API_KEY is not found (either process is undefined or API_KEY itself is not set),
    // throw an explicit error that can be caught by the App's try-catch.
    // This prevents 'new GoogleGenAI' from potentially crashing synchronously with 'undefined' key,
    // and provides a clear message to the user.
    throw new Error("API Key (APP_GEMINI_API_KEY) is missing or not accessible. Please ensure it is configured correctly in your Vercel project environment variables.");
  }

  // Instantiate Gemini API client right before making the API call.
  const ai = new GoogleGenAI({ apiKey });

  // Complex Text Tasks use gemini-3-pro-preview
  const model = "gemini-3-pro-preview";
  const config = {
    systemInstruction: SYSTEM_INSTRUCTION,
    thinkingConfig: { thinkingBudget: 32768 },
    temperature: 0.7,
  };

  let prompt = "";

  switch (step) {
    case WorkflowStep.SCRIPT:
      prompt = `
        [PHẦN 1] TẠO KỊCH BẢN GỐC (SCRIPT)
        Dựa trên tiêu đề: "${inputs.title}"
        Và prompt yêu cầu của người dùng: "${inputs.scriptPrompt}"
        
        YÊU CẦU:
        - Viết kịch bản đầy đủ word-by-word.
        - Thời lượng mục tiêu: ~6–7 phút (~900–1.100 từ).
        - Chia đoạn rõ ràng theo nhịp nói.
        - Giọng văn trầm, sâu sắc, dành cho người đi làm.
      `;
      break;

    case WorkflowStep.TTS:
      prompt = `
        [PHẦN 2] CHUYỂN SCRIPT → VOICE AI (VBEE READY)
        Dựa trên kịch bản:
        ${currentOutput.script}

        YÊU CẦU:
        Bạn là chuyên gia TTS trên Vbee.
        - Chuyển toàn bộ kịch bản thành văn bản đọc liền mạch.
        - Thêm nhịp ngắt nội tâm bằng cú pháp: <break time=0.5s/>, <break time=1s/>, <break time=1.5s/>.
        - KHÔNG dùng dấu ngoặc kép trong thẻ break.
        - Chỉ xuất ra đoạn văn bản TTS-ready.
      `;
      break;

    case WorkflowStep.STORYBOARD:
      prompt = `
        [PHẦN 3] TẠO STORYBOARD DẠNG TEXT
        Dựa trên kịch bản:
        ${currentOutput.script}

        YÊU CẦU:
        Bạn là chuyên gia sáng tạo nội dung YouTube top 1%.
        - Tạo storyboard dạng text.
        - Mỗi cảnh tương ứng đúng thời lượng kịch bản.
        - Mô tả hình ảnh faceless, đời thường, ánh sáng tối.
        - Không tạo bảng. Không thêm nội dung mới.
      `;
      break;

    case WorkflowStep.VIDEO_PROMPTS:
      prompt = `
        [PHẦN 4] PROMPT TẠO VIDEO (TEXT-TO-VIDEO)
        Dựa trên storyboard:
        ${currentOutput.storyboard}

        YÊU CẦU:
        Bạn là chuyên gia viết prompt tạo video.
        - Mỗi prompt tương ứng 1 scene storyboard.
        - Viết bằng tiếng Anh.
        - Dạng mô tả cảnh quay điện ảnh (cinematic description).
        - Không tạo ảnh/video. Không gộp cảnh.
        - Phong cách: cinematic, minimal, faceless, dark tone.
      `;
      break;

    case WorkflowStep.THUMBNAILS:
      prompt = `
        [PHẦN 5] A/B TEST THUMBNAIL – 3 CONCEPT
        CHỦ ĐỀ: ${inputs.title}

        YÊU CẦU:
        Tạo 3 concept thumbnail faceless (1. Hoang mang, 2. Nghi ngờ bản thân, 3. Áp lực âm thầm).
        Mỗi concept gồm:
        1. Mô tả hình ảnh chi tiết.
        2. Text thumbnail (1 câu ngắn, in hoa).
        3. Prompt tạo hình ảnh (English, cinematic style).
        Cùng phong cách: faceless – tối – nghiêm túc.
      `;
      break;

    case WorkflowStep.HOOKS:
      prompt = `
        [PHẦN 6] HOOK 5 GIÂY (RETENTION)
        CHỦ ĐỀ: ${inputs.title}

        YÊU CẦU:
        Tạo 5 phiên bản HOOK 5 GIÂY khác nhau.
        - 1–2 câu ngắn.
        - Dạng câu hỏi hoặc mâu thuẫn.
        - Đánh thẳng tâm lý người đi làm.
        - Phù hợp xem ban đêm.
        Chỉ liệt kê nội dung hook.
      `;
      break;

    case WorkflowStep.SEO:
      prompt = `
        [PHẦN 7] TIÊU ĐỀ & MÔ TẢ CHUẨN SEO YOUTUBE
        Tiêu đề chính: ${inputs.title}
        Nội dung video: ${currentOutput.script?.substring(0, 500)}...

        YÊU CẦU:
        Bạn là chuyên gia SEO YouTube.
        - Tạo 3 tiêu đề A/B test (CTR cao – trung tính – phân tích).
        - Viết mô tả video chuẩn SEO (150–250 từ).
        - Viết hashtag.
        - Viết danh sách từ khóa (text, cách nhau bằng dấu phẩy).
      `;
      break;

    default:
      throw new Error("Invalid Workflow Step");
  }

  // Use ai.models.generateContent to get text response from model
  const result = await ai.models.generateContent({
    model: model,
    contents: prompt,
    config: config,
  });

  return result.text || "";
};