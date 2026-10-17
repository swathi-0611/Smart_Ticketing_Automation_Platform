# Smart_Ticketing_Automation_Platform


### **Smart Ticketing Automation Platform** | *Node.js, Express.js, MongoDB, React.js, Tailwind CSS, Google Gemini API, Inngest*
[Live Production Demo](https://smart-ticketing-automation-platform.vercel.app/) | [Source Code (GitHub)](https://github.com/swathi-0611/Smart_Ticketing_Automation_Platform)

* **Architected Event-Driven Background Workflows:** Implemented asynchronous background queue processing using **Inngest** and **Google Gemini LLM**, automating real-time ticket categorization, priority tagging, and structured metadata extraction.
* **Engineered Workload-Balanced Routing Engine:** Designed an advanced **MongoDB aggregation pipeline** utilizing multi-stage lookup (`$lookup`) and array filtering (`$filter`) to compute active moderator queue metrics and intelligently route tickets to agents with the lowest current workload.
* **Built AI Support Copilot Capabilities:** Extended generative AI prompt pipelines to return structured JSON payloads containing pre-drafted customer resolution replies and resolution-time estimates (`estimatedResolutionHours`), accelerating support turnaround.
* **Delivered Enterprise Access & Modern Interface:** Built end-to-end full-stack capabilities including JWT authentication with Role-Based Access Control (RBAC across User, Moderator, Admin roles) and a responsive Markdown-supported React dashboard.
