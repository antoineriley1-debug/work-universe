// api/email-actions.js — Work Universe Email AI Actions
// Handles: Summarize, Escalate, Infer, Intent, Reply, Commit

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

async function verifyAuth(authHeader) {
 if (!authHeader?.startsWith("Bearer ")) return null;
 const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
 headers: {
 apikey: SUPABASE_ANON_KEY,
 Authorization: authHeader
 }
 });
 return res.ok ? res.json() : null;
}

async function callAnthropic(messages, maxTokens = 1500) {
 const res = await fetch("https://api.anthropic.com/v1/messages", {
 method: "POST",
 headers: {
 "x-api-key": ANTHROPIC_API_KEY,
 "anthropic-version": "2023-06-01",
 "content-type": "application/json"
 },
 body: JSON.stringify({
 model: "claude-opus-4-20250514",
 max_tokens: Math.min(maxTokens, 2000),
 messages
 })
 });
 return res.json();
}

async function summarize(emailContent) {
 const messages = [{
 role: "user",
 content: `Summarize this email concisely, extracting 3-5 key points:\n\n${emailContent}`
 }];
 return callAnthropic(messages, 800);
}

async function escalate(emailContent) {
 const messages = [{
 role: "user",
 content: `This email needs escalation to leadership. Provide:
1. Severity level (CRITICAL, HIGH, MEDIUM)
2. Who should see this (role)
3. Action required (one sentence)
4. Deadline (if any)

Email:\n${emailContent}`
 }];
 return callAnthropic(messages, 600);
}

async function infer(emailContent) {
 const messages = [{
 role: "user",
 content: `Based on this email, what needs to happen next? List:
1. Immediate actions (next 24h)
2. Follow-up actions (next 7d)
3. Long-term implications
4. Risks if not addressed

Email:\n${emailContent}`
 }];
 return callAnthropic(messages, 900);
}

async function intent(emailContent) {
 const messages = [{
 role: "user",
 content: `What is the sender REALLY asking for in this email? Provide:
1. Surface-level request
2. Underlying intent (what they actually need)
3. Assumptions they're making
4. Potential hidden concerns

Email:\n${emailContent}`
 }];
 return callAnthropic(messages, 700);
}

async function reply(emailContent, senderName = null) {
 const contextText = senderName ? `from ${senderName}` : "";
 const messages = [{
 role: "user",
 content: `Draft a professional response to this email ${contextText}. Be concise, actionable, and address the sender's needs.

Email:\n${emailContent}`
 }];
 return callAnthropic(messages, 600);
}

async function commit(emailContent) {
 const messages = [{
 role: "user",
 content: `Create actionable items from this email. For each action:
1. Title (clear, specific)
2. Description  
3. Owner/responsible party
4. Due date (if specified or inferred)
5. Related hospital/project (if identifiable)

Email:\n${emailContent}`
 }];
 return callAnthropic(messages, 900);
}

module.exports = async (req, res) => {
 if (req.method !== "POST") {
 return res.status(405).json({ error: "POST only" });
 }

 try {
 const auth = req.headers.authorization;
 const user = await verifyAuth(auth);
 if (!user) {
 return res.status(401).json({ error: "Unauthorized" });
 }

 const { action, emailContent, senderName } = req.body;
 if (!action || !emailContent) {
 return res.status(400).json({ error: "action and emailContent required" });
 }

 let result;
 switch (action) {
 case "summarize":
 result = await summarize(emailContent);
 break;
 case "escalate":
 result = await escalate(emailContent);
 break;
 case "infer":
 result = await infer(emailContent);
 break;
 case "intent":
 result = await intent(emailContent);
 break;
 case "reply":
 result = await reply(emailContent, senderName);
 break;
 case "commit":
 result = await commit(emailContent);
 break;
 default:
 return res.status(400).json({ error: "Unknown action" });
 }

 return res.status(200).json(result);
 } catch (e) {
 console.error(e);
 return res.status(500).json({ error: String(e.message || e) });
 }
};
