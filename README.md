# TrendPulse Dashboard

TrendPulse Dashboard is a real-time, customizable web application that empowers users to track evolving topics of interest. Leveraging the Perplexity Sonar API suite, users can define topic streams, receive recency-filtered updates, view concise AI-generated summaries with citations, and interactively ask follow-up questions—all within a dynamic dashboard interface featuring a modern, Perplexity-inspired UI.

## Core Features

### Topic Stream Management
- Create and manage personalized topic streams for any subject or query
- Customize update frequency (hourly, daily, weekly)
- Configure detail level (brief, detailed, comprehensive) - *backend dynamically adjusts `max_tokens` for Perplexity API based on this selection.*
- Select from multiple Perplexity models (e.g., `sonar`, `sonar-pro`, `sonar-reasoning`, `sonar-reasoning-pro`, `sonar-deep-research`)
- Set recency filters for time-sensitive information
- **Topic Selection Sources**:
  - Google Trends integration for real-time trending topics
  - Social media hashtag tracking (Twitter/X, Instagram)
  - Custom keyword monitoring
  - Category-based topic suggestions
  - Trending news topics by region
  - Industry-specific trend monitoring

### Real-time Updates
- Automated background updates based on configured frequency
- AI-powered summarization with transparent source citations
- Support for multiple Sonar models, including `sonar` (fast, cost-effective) and `sonar-pro` (deeper, more citations), with `sonar-deep-research` for highly detailed topic streams.
- History of updates per topic stream
- Optional notifications for new updates
- Implemented `<think>` tag masking in Markdown rendering, allowing AI "thoughts" to be initially hidden and expandable by the user.

### Interactive Features
- Deep-dive Q&A functionality for each topic stream
  - User-selectable AI models for tailoring chat responses (e.g., `sonar`, `sonar-pro`, `sonar-reasoning`, `sonar-reasoning-pro`, `sonar-deep-research`) - *backend uses extended timeouts for `sonar-deep-research`.*
- Follow-up questions with context-aware responses
- Source citation and verification
- Markdown-formatted content with syntax highlighting
- Dark mode support

### View Modes
- **Dashboard View**: Traditional widget-based layout for topic streams. Features include title truncation for long queries with full query on hover, and refined card styling for clarity.
- **Newspaper View** (In Progress):
  - Significant groundwork laid for grid-based layout inspired by traditional newspaper design, including card styling and responsive grid considerations.
  - Headline-style summaries with featured images (planned)

### Pulse Discovery (New & Existing Users)
- **Thematic Naming**: This feature is called "Pulse Discovery", aligning with "TrendPulse" and "Streams".
- **New User Onboarding**:
  - **Initial Modal**: A "Pulse Discovery" modal is displayed upon a new user's first login.
  - **Goal**: To help new users quickly populate their dashboard with relevant topic streams.
  - **Modal Content**: Includes a prominent search bar, sections for "Trending Now" (e.g., Google Trends, hot hashtags), and "Popular Categories". Each item provides a one-click "Create Stream" option.
- **Existing User Access**:
  - **Dedicated Section**: Accessible via a "Pulse Discovery" button/tab in the main dashboard navigation.
  - **Goal**: Enable ongoing discovery of new trends and Sonar-optimized topics.
- **Core Functionality & Content**:
  - **Sonar-Powered Suggestions**: A curated list of topics that Perplexity Sonar can effectively monitor, leveraging its unique strengths for recency and summarization.
  - **Multi-Source Trend Aggregation**: Integration with Google Trends, social media hashtag tracking (e.g., Twitter/X), and trending news APIs.
  - **Interactive Topic Selection**: Users can search, browse categories, or select from displayed trends/suggestions.
  - **One-Click Stream Creation**: Selected pulses can directly pre-fill the topic stream creation form.
  - **Filtering & Sorting**: Options to filter trends by source, region, category, and sort by popularity or recency.
- **Visual & Functional Design**:
  - **Layout**: Card-based or dynamic grid layout for displaying trends and suggestions.
  - **Visual Cues**: Icons representing trend sources (Google, Twitter, Sonar, etc.).
  - **Interactivity**: Hover effects, clear calls-to-action (e.g., "Create Stream from this Pulse", "Add to Watchlist").
  - **Watchlist**: Ability for users to save interesting pulses for later stream creation.

## Sonar Models Used in TrendPulse

TrendPulse leverages a suite of Perplexity Sonar API models to provide diverse functionalities:

- **Topic Stream Summaries**:
  - **`sonar`**: Used for generating concise, cost-effective summaries with real-time web search and citations. Ideal for frequent updates.
  - **`sonar-pro`**: Available for users seeking more in-depth summaries with a higher number of citations, leveraging its advanced information retrieval architecture.
  - **`sonar-deep-research`**: For comprehensive and highly detailed summaries, utilizing extended token limits and processing time.

- **Deep Dive / Chat (Follow-up Q&A)**:
  - Users can select from the following models to tailor the chat experience:
    - **`sonar`**: For quick follow-up questions that may benefit from fast, fresh web searches based on the initial summary's context.
    - **`sonar-pro`**: For more complex follow-up questions requiring deeper information retrieval and more extensive source citations from the web.
    - **`sonar-reasoning`** (Default): Excellent for multi-step reasoning, where the AI needs to "think" through a question based on the summary and potentially new search data. Provides Chain-of-Thought (CoT) responses.
    - **`sonar-reasoning-pro`**: A premier reasoning model for highly complex follow-ups, offering enhanced CoT and more citations.
    - **`sonar-deep-research`**: Leverages its capability for **exhaustive web research across hundreds of sources**, a longer context window, and extended processing time. Ideal for in-depth exploration of topics, detailed analysis, and comprehensive answers that require synthesizing vast amounts of online information. *Backend uses an extended timeout for this model.*
  - This flexibility allows users to choose the best model for their specific follow-up query needs, balancing speed, depth, reasoning capability, and cost.

- **Pulse Discovery (Sonar-Powered Suggestions)**:
  - The backend utilizes models like **`sonar`** or **`sonar-reasoning`** to analyze aggregated trends and suggest topics that Perplexity Sonar can effectively monitor and summarize, highlighting its strengths in recency and contextual understanding.

## Technical Architecture

### Frontend
- React-based single-page application
- TailwindCSS for responsive, utility-first styling
- React Router for navigation
- Context API for state management
- Markdown rendering with syntax highlighting
- Responsive design for all device sizes

### Backend
- FastAPI Python backend
- SQLite database with SQLAlchemy ORM
- JWT-based authentication
- Background task scheduling
- Perplexity API integration
- CORS middleware for cross-origin requests

### Data Models
- User authentication and management
- Topic streams with customizable settings
- Summaries with source citations
- Update history tracking

## API Integration

### Perplexity API Features
- Real-time web search capabilities
- Recency-filtered results
- Source citation and verification
- Multiple model options for different use cases
- Context-aware follow-up questions

### Endpoints
- User authentication (login/register)
- Topic stream CRUD operations
- Summary generation and retrieval
- Deep-dive Q&A functionality
- Background update scheduling

## Development Setup

### Prerequisites
- Python 3.9+ (for backend)
- Node.js 18+ and npm (for frontend)
- Perplexity API key (see API Keys section below)

### Backend Setup
Navigate to the backend directory:
```bash
cd src/backend
```
Create and activate a virtual environment:
```bash
# For Windows (Powershell/CMD)
python -m venv venv
.\venv\Scripts\activate

# For macOS/Linux (bash/zsh)
# python3 -m venv venv
# source venv/bin/activate
```
Install dependencies:
```bash
pip install -r requirements.txt
```
Set your Perplexity API key as an environment variable. For example, in Powershell:
```powershell
$env:PERPLEXITY_API_KEY="your_api_key_here"
```
Or create a `.env` file in the `src/backend` directory with the line:
`PERPLEXITY_API_KEY=your_api_key_here`

Run the backend server:
```bash
python app.py
```

### Frontend Setup
Navigate to the frontend directory:
```bash
cd src/frontend
```
Install dependencies:
```bash
npm install
```
Run the frontend development server:
```bash
npm start
```

### Environment Variables (Backend - typically in `.env` file in `src/backend`)
- `PERPLEXITY_API_KEY`: Your Perplexity API key.
- `SECRET_KEY`: A strong secret key for JWT token generation (e.g., generate one using `openssl rand -hex 32`).
- `DATABASE_URL`: SQLite database URL (default: `sqlite:///./trendpulse.db`).

## Project Structure

## Usage

1. **Sign up and log in** to your TrendPulse Dashboard account.
2. Click **"Add New Topic Stream"** to define a subject or query you want to track.
3. Configure **update frequency** (hourly, daily, weekly), **detail level** (brief, detailed, comprehensive), and **model** (e.g., `sonar`, `sonar-pro`, `sonar-deep-research`).
4. View your dashboard: each topic stream appears as a widget with the latest AI-generated summary and source citations.
5. Click a widget to expand it, view the full summary, and **ask follow-up questions** in a chat interface.
6. Receive **automated updates** as scheduled, with the dashboard refreshing summaries and sources.
7. Optionally, **enable notifications** for new updates on high-priority topics.

## Perplexity API Usage

- **Endpoint:** `POST /chat/completions`
- **Parameters:**
  - `model`: `sonar` or `sonar-pro` (user-selected per stream)
  - `messages`:  
    - System: Summarizes recent developments for the user's query, focusing on new information within the recency filter, and cites sources.
    - User: The user's topic or follow-up question.
  - `search_recency_filter`: Set based on update frequency (e.g., 'day', 'week')
  - `web_search_options.search_context_size`: `medium` or `high` (based on detail level)
  - `max_tokens`: Based on detail level
  - `temperature`: 0.1
  - `top_p`: 0.8
  - `top_k`: 0
- **Response:**
  - `summary`: AI-generated summary of recent developments
  - `citations`: List of source URLs
  - `timestamp`: Time of update

## Contributing

- Follow the file structure and keep backend/frontend code modular.
- Document new components and API endpoints clearly.
- Update `docs/api_schema.xml` and `docs/data_model.xml` with any changes to API usage or data models.
- Write clear commit messages and open pull requests for review.

---

```mermaid
flowchart TB
  subgraph Root
    A[Live_To_do.md]
    B[README.md]
    C[.cursor/]
    D[.venv/]
    E[docs/]
    F[src/]
  end

  subgraph docs
    G[context.md]
    H[sonar_API.md]
    I[sonar_models.md]
    J[data_model.xml]
    K[file_structure.xml]
    L[api_schema.xml]
    M[testing/]
  end

  subgraph src
    N[__init__.py]
    O[backend/]
    P[frontend/]
  end

  subgraph backend
    O1[app.py]
    O2[models.py]
    O3[database.py]
    O4[perplexity_api.py]
    O5[scheduler.py]
    O6[run_server.py]
    O7[requirements.txt]
    O8[create_test_user.py]
    O9[reset_db.py]
    O10[test_*.py…]
    O11[utils/]
  end

  subgraph utils
    U1[perplexity_api.py]
    U2[scheduler.js]
  end

  subgraph frontend
    P1[package.json]
    P2[package-lock.json]
    P3[tailwind.config.js]
    P4[App.jsx]
    P5[pages/]
    P6[src/]
    P7[components/]
    P8[services/]
    P9[context/]
    P10[public/]
    P11[build/]
  end

  subgraph pages
    L1[Dashboard.jsx]
    L2[Register.jsx]
    L3[Login.jsx]
  end

  subgraph src_front
    S1[index.js]
    S2[index.css]
    S3[markdown.css]
    S4[pages/]
    S5[components/]
    S6[services/]
    S7[context/]
  end

  Root --> docs
  Root --> src
  src --> backend
  src --> frontend
  frontend --> pages
  frontend --> src_front
  backend --> utils


