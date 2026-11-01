# buscaqroo
.
# BuscaQroo

<p align="center">
  <img src="assets/buscaqroo_overview.png"
       alt="BuscaQroo intelligent assistant"
       width="100%">
</p>

<p align="center">
  <strong>Intelligent assistant for public and institutional information in Quintana Roo, Mexico.</strong>
</p>

---

## About BuscaQroo

**BuscaQroo** is a web-based intelligent assistant designed to help citizens find public and institutional information in the state of Quintana Roo, Mexico.

The platform provides a conversational interface that helps users identify the appropriate institution, agency, public service or official resource according to their needs.

Instead of manually searching through multiple government websites, directories and documents, users can describe what they need and receive structured guidance toward the most relevant source.

---

## Main Objective

BuscaQroo aims to simplify access to public information by connecting citizens with:

- Government institutions
- Public services
- Administrative procedures
- Institutional directories
- Official websites
- Citizen assistance resources
- Health and public-service information

The project focuses on making institutional information easier to understand and access through artificial intelligence.

---

## How It Works

```text
User Question
     ↓
Web Interface
     ↓
Backend / API
     ↓
Prompt Processing
     ↓
Institutional Knowledge Base
     ↓
AI Model
     ↓
Structured Response
     ↓
Official Institution / Resource
```

The assistant processes the user's request and uses institutional information to guide the user toward an appropriate service or organization.

---

## Architecture

BuscaQroo follows a modular web architecture:

```text
Frontend
React + Vite
     ↓
API Requests
     ↓
Backend / Firebase Functions
     ↓
Prompt + Retrieval Logic
     ↓
Institutional Data
     ↓
AI Model
     ↓
Response
```

### Main components

```text
buscaqroo/
│
├── frontend/
│   └── Web user interface
│
├── backend/
│   └── Backend services and API logic
│
├── functions/
│   └── Firebase Cloud Functions
│
├── data/
│   └── Institutional information and structured data
│
├── prompts/
│   └── Prompt templates and assistant instructions
│
├── assets/
│   └── README images and visual documentation
│
├── firebase.json
├── .firebaserc
└── README.md
```

---

## Technologies

### Frontend

- React
- Vite
- JavaScript
- HTML
- CSS

### Backend

- Node.js
- Express
- REST API

### Cloud

- Firebase
- Firebase Hosting
- Firebase Functions
- Firestore

### Artificial Intelligence

- Large Language Models
- Prompt Engineering
- Retrieval-Augmented Generation concepts
- Structured institutional context

---

## Main Features

- Conversational citizen assistance
- Institutional information search
- Public-service guidance
- Government agency discovery
- Official resource recommendations
- Structured responses
- Centralized institutional knowledge
- Web-based access

---

## Example Use Case

A citizen may ask:

```text
Where should I go to complete a government procedure?
```

or:

```text
Which institution can help me with this public service?
```

BuscaQroo processes the request and returns information about the most relevant institution or resource.

---

## Project Purpose

Public information is often distributed across many websites, documents and institutions.

BuscaQroo explores how artificial intelligence can help organize this information and make it more accessible through natural-language interaction.

The project seeks to reduce:

```text
Search time
     ↓
Institutional confusion
     ↓
Navigation between multiple websites
     ↓
Difficulty identifying the correct agency
```

while improving access to official information.

---

## Repository Structure

```text
backend/
data/
frontend/
functions/
prompts/
assets/
```

Each directory represents an independent component of the BuscaQroo architecture.

---

## Installation

Clone the repository:

```bash
git clone https://github.com/LuisBarahonaMX/buscaqroo.git
cd buscaqroo
```

Install the dependencies of each project component according to its corresponding `package.json`.

Example:

```bash
cd frontend
npm install
```

Then:

```bash
npm run dev
```

For backend or Firebase Functions:

```bash
cd ../functions
npm install
```

---

## Environment Variables

API credentials and private configuration should never be committed directly to GitHub.

Use environment variables or `.env` files.

Example:

```text
OPENAI_API_KEY=your_api_key
```

Add private environment files to `.gitignore`.

---

## Future Development

Planned improvements include:

- Query history
- Administrative dashboard
- Usage analytics
- Expansion of institutional information
- Improved retrieval mechanisms
- Better source traceability
- Additional public-service domains
- More robust RAG architecture

---

## Applications

BuscaQroo can serve as a foundation for intelligent public-information systems in areas such as:

- Government services
- Public health
- Education
- Mobility
- Administrative procedures
- Citizen support
- Institutional directories

---

## Project Status

```text
[✓] Web interface
[✓] Backend architecture
[✓] Institutional data integration
[✓] Firebase infrastructure
[✓] Conversational assistant

[→] Extended institutional knowledge
[→] Query history
[→] Administrative dashboard
[→] Analytics
[→] Improved retrieval and traceability
```

---

## Author

**Pedro Luis Pérez Barahona**

Data and Organizational Intelligence Engineering  
Universidad del Caribe  
Quintana Roo, Mexico

GitHub:

https://github.com/LuisBarahonaMX

---

## Repository

https://github.com/LuisBarahonaMX/buscaqroo

---

## BuscaQroo

**Making public and institutional information easier to find, understand and use.**