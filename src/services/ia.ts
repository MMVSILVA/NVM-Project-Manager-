import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export const generateProjectDescription = async (projectName: string) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Gere uma descrição profissional e inspiradora para um projeto educacional chamado "${projectName}". A descrição deve ser curta e direta, focada em SaaS educacional.`,
    });
    return response.text || "Descrição não gerada.";
  } catch (error) {
    console.error("Erro ao gerar descrição:", error);
    return "Erro ao gerar descrição com IA.";
  }
};

export const generateTasks = async (projectName: string) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Gere uma lista de 5 tarefas essenciais para iniciar o projeto educacional "${projectName}". Retorne apenas as tarefas em formato JSON.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING, description: "Título da tarefa" },
            },
            required: ["title"],
          },
        },
      },
    });
    
    const jsonStr = response.text.trim();
    return JSON.parse(jsonStr) as { title: string }[];
  } catch (error) {
    console.error("Erro ao gerar tarefas:", error);
    return [];
  }
};

export const generateSchedule = async (projectName: string, startDate: string) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Sugira um cronograma básico para o projeto "${projectName}" começando em ${startDate}. Retorne um resumo curto.`,
    });
    return response.text || "Cronograma não gerado.";
  } catch (error) {
    console.error("Erro ao gerar cronograma:", error);
    return "Erro ao gerar cronograma com IA.";
  }
};
