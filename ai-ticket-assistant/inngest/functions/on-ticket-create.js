import { inngest } from "./client.js";
import { Ticket } from "../models/ticket.model.js";
import { User } from "../models/user.model.js";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export const processTicket = inngest.createFunction(
  { id: "process-ticket" },
  { event: "ticket.created" },
  async ({ event, step }) => {
    const { ticketId } = event.data;

    // STEP 1: Fetch ticket from database
    const ticket = await step.run("fetch-ticket", async () => {
      return await Ticket.findById(ticketId);
    });

    if (!ticket) return;

    // STEP 2: Call Gemini API with Expanded Structured JSON Prompt
    const aiAnalysis = await step.run("analyze-with-ai", async () => {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      const prompt = `
        Analyze the following support ticket and return ONLY a valid JSON object without markdown formatting:
        {
          "priority": "low" | "medium" | "high" | "urgent",
          "category": "technical" | "billing" | "account" | "general",
          "requiredSkills": ["skill1", "skill2"],
          "summary": "1-sentence summary of the issue",
          "suggestedReply": "A polite, draft response acknowledging the issue and giving initial troubleshooting steps",
          "estimatedResolutionHours": 12
        }

        Ticket Title: ${ticket.title}
        Ticket Description: ${ticket.description}
      `;

      const response = await model.generateContent(prompt);
      const text = response.response.text();
      // Clean up markdown block quotes if Gemini wraps JSON in ```json ... ```
      const cleanedText = text
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();
      return JSON.parse(cleanedText);
    });

    // STEP 3: Workload-Balanced Moderator Routing using Aggregation
    const assignedModeratorId = await step.run("assign-moderator", async () => {
      const matchedModerators = await User.aggregate([
        // Filter users by role and skill match
        {
          $match: {
            role: "moderator",
            skills: { $in: aiAnalysis.requiredSkills },
          },
        },
        // Join with the tickets collection to inspect current assignments
        {
          $lookup: {
            from: "tickets",
            localField: "_id",
            foreignField: "assignedTo",
            as: "assignedTickets",
          },
        },
        // Calculate the number of currently 'open' tickets per moderator
        {
          $addFields: {
            activeTicketsCount: {
              $size: {
                $filter: {
                  input: "$assignedTickets",
                  as: "t",
                  cond: { $eq: ["$$t.status", "open"] },
                },
              },
            },
          },
        },
        // Sort ascending: least busy moderator first
        { $sort: { activeTicketsCount: 1 } },
        { $limit: 1 },
      ]);

      if (matchedModerators.length > 0) {
        return matchedModerators[0]._id;
      }

      // Fallback: If no skilled moderator found, assign to an admin
      const admin = await User.findOne({ role: "admin" });
      return admin ? admin._id : null;
    });

    // STEP 4: Update Ticket with AI fields and Assigned Moderator
    await step.run("update-ticket", async () => {
      await Ticket.findByIdAndUpdate(ticketId, {
        priority: aiAnalysis.priority,
        category: aiAnalysis.category,
        requiredSkills: aiAnalysis.requiredSkills,
        summary: aiAnalysis.summary,
        suggestedReply: aiAnalysis.suggestedReply,
        estimatedResolutionHours: aiAnalysis.estimatedResolutionHours,
        assignedTo: assignedModeratorId,
      });
    });

    return { success: true, ticketId, assignedTo: assignedModeratorId };
  },
);
