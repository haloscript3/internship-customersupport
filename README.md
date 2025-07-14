# AI-Powered Customer Service Chatbot with RAG

This project is an AI-powered chatbot application designed to automate customer service processes and enhance user experience. The chatbot leverages Retrieval-Augmented Generation (RAG) architecture to provide more accurate and up-to-date responses

- If **human agents are busy**, the **AI chatbot** takes over and responds to user queries using context-aware, RAG-based replies.
- If **human agents are available**, the user is **instantly transferred to a live representative**.
- The AI is continuously **updated with previous conversation logs** and support documents, allowing it to provide **accurate and relevant answers** based on prior interactions.


## Project Features
- **AI & RAG:** The chatbot uses Natural Language Processing (NLP) and RAG technology. User queries are first searched in the knowledge base, then the AI generates meaningful and context-aware answers.
- **Customer Service:** Users can interact with the chatbot for payment transactions, account information, complaints, and suggestions.
- **Web Interface:** A modern, user-friendly web interface enables real-time chat.
- **Automated & Human Support:** The chatbot automatically answers frequently asked questions and routes users to a human operator when necessary.

## Technologies Used
- **Backend:** Go (Golang) API services
- **Frontend:** HTML, JavaScript, CSS
- **AI:** RAG-based NLP and response generation


## 💬 Example Scenario

### 🧾 Scenario: User Needs Help with a Late Delivery

**Time**: 18:45  
**User**: Ayşe Yılmaz  
**Query**: "My package still hasn't arrived. How can I check where it is?"

---

### ✅ Step 1: AI Checks Agent Availability

- The system checks if any human support agents are available.  
- Result: **All agents are currently busy.**

---

### 🤖 Step 2: AI Chatbot Responds (RAG-Based)

> **AI Bot:**  
> "Hello Ms. Yılmaz, to track your order, you can visit the *Order Tracking* section with your order number.  
> Additionally, your order status is: *Out for delivery (Today at 4:20 PM)*.  
> Would you like me to assist you further?"

---

### 🧠 Step 3: AI Learns & Logs Interaction

- The AI logs this interaction.
- It updates its context and enhances the knowledge base for future similar queries.

---

### 👩‍💼 Step 4: Human Agent Becomes Available

- Two minutes later, a human agent becomes available.
- The AI initiates a smooth handover.

> **AI Bot:**  
> "A customer support representative is now available. I'm transferring you."

---

### 👤 Step 5: Human Agent Continues the Conversation

> **Human Agent:**  
> "Hello Ms. Yılmaz, this is Elif from customer support. Could you please share your order number so I can assist you further?"

---

### ✅ Outcome

- The user received instant, accurate support while agents were busy.
- When available, a human seamlessly took over the conversation.
- The experience remained smooth, responsive, and satisfying.

---

## License
This project is licensed under the MIT License.
