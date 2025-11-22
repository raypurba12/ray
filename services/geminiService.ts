
import { GoogleGenAI } from "@google/genai";
import { User, Skill, Project } from '../types';

// IMPORTANT: This key is managed externally and assumed to be available in the environment.
const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  console.warn("API_KEY for Gemini is not set. AI features will be disabled.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY! });

const generatePortfolioPrompt = (user: User, skills: Skill[], projects: Project[]): string => {
  const skillsText = skills.map(s => `- ${s.name} (Proficiency: ${s.level}/100)`).join('\n');
  const projectsText = projects.map(p => `
    Project: ${p.title}
    Description: ${p.description}
    Technologies: ${p.tags.join(', ')}
  `).join('\n');

  return `
    Analyze the following professional portfolio and provide constructive feedback.
    The feedback should be encouraging and actionable, focusing on strengths and areas for improvement.
    Structure the feedback into three sections: "Overall Impression", "Strengths", and "Suggestions for Improvement".
    Keep the tone professional yet supportive.

    **Portfolio Details:**

    **User Profile:**
    Name: ${user.name}
    Title: ${user.title}
    Bio: ${user.bio}

    **Skills:**
    ${skillsText}

    **Projects:**
    ${projectsText}

    Please provide your analysis now.
  `;
}

export const getPortfolioFeedback = async (user: User, skills: Skill[], projects: Project[]): Promise<string> => {
  if (!API_KEY) {
    return Promise.resolve("AI Feedback is currently unavailable. Please ensure your API key is configured.");
  }
  
  try {
    const prompt = generatePortfolioPrompt(user, skills, projects);
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Error fetching portfolio feedback from Gemini API:", error);
    return "An error occurred while generating AI feedback. Please try again later.";
  }
};
