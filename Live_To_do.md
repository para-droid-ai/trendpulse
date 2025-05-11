# TrendPulse Development Todo List

## Priority 1: Core Backend Setup
- [x] Set up FastAPI backend structure
  - [x] Basic server configuration
  - [x] Database connection
  - [x] Environment variables setup (.env file exists, verify loading)
- [x] Implement Perplexity API integration
  - [x] Create API client class
  - [x] Implement basic chat completions endpoint
  - [x] Add error handling and rate limiting
- [x] Create basic database models
  - [x] User model
  - [x] TopicStream model
  - [x] Summary model
- [x] Verify environment variable loading
- [x] Fix API authentication issues in backend tests
- [x] Complete test suite execution

## Priority 2: Basic Frontend Setup
- [x] Set up React frontend structure
  - [x] Basic app configuration
  - [x] Routing setup
  - [x] Style and theme configuration
- [x] Create core components
  - [x] Dashboard layout
  - [x] TopicStream listing component
  - [x] TopicStream form (updated to include sonar-deep-research, removed query length limit)
  - [x] TopicStream Widget (extensive UI updates for grid/list views, title truncation, summary display)
  - [x] Deep Dive Dialog
- [x] Implement Markdown Rendering
  - [x] Add markdown parser library (react-markdown)
  - [x] Create MarkdownRenderer component (updated to use MaskedSection for <think> tags)
  - [x] Add styling for markdown elements
  - [x] Handle code blocks and syntax highlighting
  - [x] Implement source citation formatting
  - [x] Add markdown preview in topic creation form
  - [x] Create MaskedSection.jsx for <think> tag handling
- [x] Add responsive design for mobile
  - [x] Adapt layout for small screens
  - [x] Implement mobile navigation
  - [x] Optimize form inputs for mobile
- [x] UI Improvements from Prototype
  - [x] Implement grid/list view toggle (significant styling for grid view cards and layout in Dashboard.jsx and TopicStreamWidget.jsx)
  - [x] Add improved card design with hover effects (extensive card styling matching Perplexity/AI Studio, including borders, fonts, spacing)
  - [x] Create enhanced empty state UI
  - [x] Implement better loading states
  - [x] Add improved modals for topic creation and deep dive

## Priority 3: MVP Features
- [x] User Authentication
  - [x] Login/Register functionality
  - [x] JWT token handling
  - [x] Protected routes
- [ ] Topic Stream Management
  - [x] Create new topic stream
  - [x] View topic streams
  - [x] Delete topic stream
  - [x] Update topic stream settings
  - [x] Configure markdown formatting preferences
  - [ ] **Pulse Discovery Feature** (Formerly Topic Selection Integration)
    - [ ] **New User Onboarding Modal**
      - [ ] Design and implement initial login modal for Pulse Discovery
      - [ ] Integrate search bar within modal
      - [ ] Display sections for "Trending Now" (Google Trends, Social Hashtags) and "Popular Categories"
      - [ ] Implement one-click "Create Stream" from modal items (pre-fills stream creation form)
      - [ ] Ensure modal is shown only on first login or if no streams exist
    - [ ] **Dedicated Pulse Discovery Section (Existing Users)**
      - [ ] Add "Pulse Discovery" button/tab to main dashboard navigation
      - [ ] Design and implement the Pulse Discovery page/view
      - [ ] Implement card-based or dynamic grid layout for trends/suggestions
      - [ ] Add visual cues (icons) for trend sources (Google, Twitter, News, Sonar)
    - [ ] **Core Backend & API Integration**
      - [ ] Google Trends API Integration (Update existing tasks if needed)
        - [ ] Set up Google Trends API client
        - [ ] Implement real-time trend fetching & caching
      - [ ] Social Media Integration (Update existing tasks if needed)
        - [ ] Twitter/X API integration for hashtags
        - [ ] Potentially other social media trend sources
      - [ ] News API Integration for trending news topics
    - [ ] **Sonar-Powered Suggestions (Backend & Frontend)**
      - [ ] Backend: Develop logic to analyze aggregated trends and identify topics highly suitable for Sonar (recency, summarization potential)
      - [ ] Backend: Create an endpoint to serve these Sonar-specific suggestions
      - [ ] Frontend: Display a dedicated "Sonar Suggestions" section in Pulse Discovery
    - [ ] **General Pulse Discovery UI/UX**
      - [ ] Implement interactive topic search with suggestions (within Pulse Discovery section)
      - [ ] Implement category browsing and filtering
      - [ ] Implement filtering by source, region, and sorting by popularity/recency
      - [ ] Implement "Create Stream from Pulse" functionality
      - [ ] Implement "Add to Watchlist" feature for saving pulses
      - [ ] Design and implement Watchlist management interface
    - [ ] **Topic Analytics (Retain relevant parts from previous plan)**
      - [ ] Display trend momentum indicators (e.g., rising, falling)
      - [ ] Suggest related topics/pulses
      - [ ] Show basic popularity metrics for trends

- [ ] Backend Services
  - [ ] Google Trends Service (Verify alignment with Pulse Discovery)
  - [ ] Social Media Service (Verify alignment with Pulse Discovery)
  - [ ] News API Service (New or adapt existing)
  - [ ] **Sonar Suggestion Service (Backend)**
    - [ ] Algorithm for identifying Sonar-optimized topics from aggregated trends
    - [ ] Endpoint for serving suggestions
  - [ ] Topic Analytics Service (Verify alignment with Pulse Discovery)

- [ ] Frontend Components
  - [ ] Pulse Discovery Modal (New User)
  - [ ] Pulse Discovery Page/View (Existing User)
  - [ ] Trend/Suggestion Card Component
  - [ ] Watchlist Component
  - [ ] Filtering and Sorting controls for Pulse Discovery
  - [ ] Topic Analytics display components (momentum, related, popularity)

- [ ] Data Models
  - [ ] Watchlist (User-specific list of saved pulses)
  - [ ] SonarSuggestion (Potentially for caching/managing Sonar-generated suggestions)
  - [ ] Trend Data (Verify and adapt existing)
  - [ ] Topic Analytics (Verify and adapt existing)

- [x] Deep Dive Feature
  - [x] Expand topic view
  - [x] Follow-up question interface
  - [x] Conversation history
  - [x] Markdown support in chat interface
  - [x] Syntax highlighting for code blocks
  - [x] Save chat history in local storage
  - [x] Add option to save responses to stream
  - [x] **AI Model Selection for Deep Dive/Chat**
    - [x] **Frontend (DeepDiveChat.jsx / similar Component)**:
      - [x] Design and implement UI dropdown/selector for choosing AI model (e.g., `sonar`, `sonar-pro`, `sonar-reasoning`, `sonar-reasoning-pro`, `sonar-deep-research`).
      - [x] Ensure selected model is passed in the API request to the backend.
      - [x] Update frontend state to manage and reflect the currently selected model for the active chat session.
      - [x] Clearly display the active model within the chat interface.
      - [x] Provide brief descriptions or tooltips for each model choice to guide user selection.
    - [x] **Backend (`app.py` - `/deep-dive/` endpoint & Perplexity API Client)**:
      - [x] Modify `DeepDiveRequest` Pydantic model to include an optional `model_selection: str` field.
      - [x] Update the `/deep-dive/` endpoint logic to use the `model_selection` from the request. If not provided, default to `sonar-reasoning`.
      - [x] Validate the `model_selection` against an approved list of models for chat.
      - [x] Ensure the `PerplexityAPI` client (`perplexity_api.py`) can dynamically set the model and timeout (longer for `sonar-deep-research`) for the `/chat/completions` call.
      - [x] Adjust any existing context handling or prompt engineering if specific models require slight variations for optimal chat performance. (Dynamic `max_tokens` in `app.py` for topic streams also updated, benefiting `sonar-deep-research`)
    - [x] **Testing & Documentation**:
      - [x] Thoroughly test Deep Dive chat functionality with each of the selectable AI models. (User confirmed working)
      - [x] Verify correct model usage in Perplexity API calls via logging or testing headers. (User confirmed working)
      - [ ] Update internal and external API documentation for the `/deep-dive/` endpoint to reflect the new `model_selection` parameter and its allowed values.

## Priority 4: Newspaper View Implementation
- [ ] Frontend Components
  - [ ] Create NewspaperLayout component
    - [ ] Implement responsive grid system
    - [ ] Add column management system
    - [ ] Create article card components
  - [ ] Develop ArticleCard component
    - [ ] Design headline-style layout
    - [ ] Add featured image support
    - [ ] Implement summary truncation
    - [ ] Add source citation display
  - [ ] Build CategoryHeader component
    - [ ] Create category navigation
    - [ ] Add category-based filtering
    - [ ] Implement sorting options

- [ ] State Management
  - [ ] Add view mode toggle in context
  - [ ] Create newspaper view state handlers
  - [ ] Implement layout persistence
  - [ ] Add column configuration storage

- [ ] Styling and Layout
  - [ ] Design newspaper-style typography
  - [ ] Create print stylesheet
  - [ ] Implement responsive breakpoints
  - [ ] Add grid system utilities
  - [ ] Create article size variants

- [ ] Features
  - [ ] Implement view mode switching
  - [ ] Add column customization
  - [ ] Create print layout
  - [ ] Add article size controls
  - [ ] Implement category filtering
  - [ ] Add sorting options

- [ ] Testing
  - [ ] Write component tests
  - [ ] Test responsive behavior
  - [ ] Verify print functionality
  - [ ] Test state management
  - [ ] Validate accessibility

## Priority 4: Testing & Documentation
- [ ] Backend Testing
  - [ ] API endpoint tests
  - [ ] Database operation tests
  - [ ] Perplexity API integration tests
- [ ] Frontend Testing
  - [ ] Component tests
  - [ ] Integration tests
  - [ ] User flow tests
- [ ] Test Documentation
  - [ ] Complete the Topic Stream Operations test plan in docs/testing
  - [ ] Create API Integration test plan
  - [ ] Create User Authentication test plan
  - [ ] Create Deep Dive Feature test plan
  - [ ] Update test status as testing progresses
- [ ] Documentation
  - [ ] API documentation
  - [ ] Setup instructions
  - [ ] User guide

## Future Enhancements (Post-MVP)
- [x] Advanced Features
  - [x] Add sonar-pro model support (also sonar-reasoning-pro and sonar-deep-research added to forms and chat)
  - [ ] Implement notifications
  - [x] Add multiple detail levels (Backend `max_tokens` dynamically adjusted for these)
  - [ ] Real-time updates
- [ ] Performance Optimization
  - [ ] Caching implementation
  - [ ] Rate limiting
  - [ ] Response optimization
- [ ] UI/UX Improvements
  - [ ] Advanced filtering
  - [ ] Custom dashboard layouts
  - [ ] Theme customization

## Current Focus
Current focus is on completing Priority 3 items and refining Newspaper View (Priority 4).
- [ ] Implementing user authentication (Note: Parts are checked, but overall feature might still be in progress)
- [x] Enhancing Topic Stream Management features (Query length, model options, UI styling, truncation)
- [x] UI Enhancements (Grid view, card styling, font consistency, masked sections - ongoing with Newspaper View)
- [x] Backend API updates (Dynamic tokens for Perplexity, dynamic timeouts)

## Notes
- Keep implementation simple and focused on MVP features
- Prioritize stability and reliability over advanced features
- Document all API integrations and configurations
- Regular testing of Perplexity API integration
- Ensure consistent markdown formatting across all text displays
- Test markdown rendering with various content types (code, tables, lists, etc.)

## Explain Concept to User
- [x] FastAPI: what it is and how it's used here
- [ ] Perplexity API: Integration and capabilities in our application
- [ ] SQLAlchemy: Database ORM and how we use it for data models
- [ ] JWT Authentication: How user authentication works
- [ ] React + TailwindCSS: Frontend framework and styling approach
- [ ] Scheduler Architecture: How automated updates work in the background
- [ ] API Testing: Understanding backend test structure and purpose
- [ ] Markdown Rendering: Implementation in the frontend
- [ ] State Management: How data flows between components

## Priority 2: Topic Stream Management
- [x] Configure markdown formatting for API responses
  - [x] Update system prompts to request markdown formatting
  - [x] Implement markdown response parsing
