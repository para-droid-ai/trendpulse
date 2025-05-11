# TrendPulse Development Todo List

## Priority 1: Core Backend Setup
- ✅ Set up FastAPI backend structure
  - ✅ Basic server configuration
  - ✅ Database connection
  - ✅ Environment variables setup (.env file exists, verify loading)
- ✅ Implement Perplexity API integration
  - ✅ Create API client class
  - ✅ Implement basic chat completions endpoint
  - ✅ Add error handling and rate limiting
- ✅ Create basic database models
  - ✅ User model
  - ✅ TopicStream model
  - ✅ Summary model
- ✅ Verify environment variable loading
- ✅ Fix API authentication issues in backend tests
- ✅ Complete test suite execution

## Priority 2: Basic Frontend Setup
- ✅ Set up React frontend structure
  - ✅ Basic app configuration
  - ✅ Routing setup
  - ✅ Style and theme configuration
- ✅ Create core components
  - ✅ Dashboard layout
  - ✅ TopicStream listing component
  - ✅ TopicStream form (updated to include sonar-deep-research, removed query length limit)
  - ✅ TopicStream Widget (extensive UI updates for grid/list views, title truncation, summary display)
  - ✅ Deep Dive Dialog
- ✅ Implement Markdown Rendering
  - ✅ Add markdown parser library (react-markdown)
  - ✅ Create MarkdownRenderer component (updated to use MaskedSection for <think> tags)
  - ✅ Add styling for markdown elements
  - ✅ Handle code blocks and syntax highlighting
  - ✅ Implement source citation formatting
  - ✅ Add markdown preview in topic creation form
  - ✅ Create MaskedSection.jsx for <think> tag handling
- ✅ Add responsive design for mobile
  - ✅ Adapt layout for small screens
  - ✅ Implement mobile navigation
  - ✅ Optimize form inputs for mobile
  - ✅ Create feed view for mobile with chronological summaries
  - ✅ Optimize mobile layout width and title truncation
- ✅ UI Improvements from Prototype
  - ✅ Implement grid/list view toggle (significant styling for grid view cards and layout in Dashboard.jsx and TopicStreamWidget.jsx)
  - ✅ Add improved card design with hover effects (extensive card styling matching Perplexity/AI Studio, including borders, fonts, spacing)
  - ✅ Create enhanced empty state UI
  - ✅ Implement better loading states
  - ✅ Add improved modals for topic creation and deep dive
  - ✅ Make headers sticky/fixed on scroll for better navigation
  - ✅ Add proper handling of <think> tags in mobile feed view

## Priority 3: MVP Features
- ✅ User Authentication
  - ✅ Login/Register functionality
  - ✅ JWT token handling
  - ✅ Protected routes
- [ ] Topic Stream Management
  - ✅ Create new topic stream
  - ✅ View topic streams
  - ✅ Delete topic stream
  - ✅ Update topic stream settings
  - ✅ Configure markdown formatting preferences
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

- ✅ Deep Dive Feature
  - ✅ Expand topic view
  - ✅ Follow-up question interface
  - ✅ Conversation history
  - ✅ Markdown support in chat interface
  - ✅ Syntax highlighting for code blocks
  - ✅ Save chat history in local storage
  - ✅ Add option to save responses to stream
  - ✅ **AI Model Selection for Deep Dive/Chat**
    - ✅ **Frontend (DeepDiveChat.jsx / similar Component)**:
      - ✅ Design and implement UI dropdown/selector for choosing AI model (e.g., `sonar`, `sonar-pro`, `sonar-reasoning`, `sonar-reasoning-pro`, `sonar-deep-research`).
      - ✅ Ensure selected model is passed in the API request to the backend.
      - ✅ Update frontend state to manage and reflect the currently selected model for the active chat session.
      - ✅ Clearly display the active model within the chat interface.
      - ✅ Provide brief descriptions or tooltips for each model choice to guide user selection.
    - ✅ **Backend (`app.py` - `/deep-dive/` endpoint & Perplexity API Client)**:
      - ✅ Modify `DeepDiveRequest` Pydantic model to include an optional `model_selection: str` field.
      - ✅ Update the `/deep-dive/` endpoint logic to use the `model_selection` from the request. If not provided, default to `sonar-reasoning`.
      - ✅ Validate the `model_selection` against an approved list of models for chat.
      - ✅ Ensure the `PerplexityAPI` client (`perplexity_api.py`) can dynamically set the model and timeout (longer for `sonar-deep-research`) for the `/chat/completions` call.
      - ✅ Adjust any existing context handling or prompt engineering if specific models require slight variations for optimal chat performance. (Dynamic `max_tokens` in `app.py` for topic streams also updated, benefiting `sonar-deep-research`)
    - ✅ **Testing & Documentation**:
      - ✅ Thoroughly test Deep Dive chat functionality with each of the selectable AI models. (User confirmed working)
      - ✅ Verify correct model usage in Perplexity API calls via logging or testing headers. (User confirmed working)
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
- ✅ Advanced Features
  - ✅ Add sonar-pro model support (also sonar-reasoning-pro and sonar-deep-research added to forms and chat)
  - [ ] Implement notifications
  - ✅ Add multiple detail levels (Backend `max_tokens` dynamically adjusted for these)
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
- ✅ Enhancing Topic Stream Management features (Query length, model options, UI styling, truncation)
- ✅ UI Enhancements (Grid view, card styling, font consistency, masked sections - ongoing with Newspaper View)
- ✅ Mobile Feed View Implementation (Chronological feed of all summaries, proper width constraints)
- ✅ Navigation Improvements (Sticky headers, mobile UI optimizations)
- ✅ Backend API updates (Dynamic tokens for Perplexity, dynamic timeouts)

## Recent Accomplishments (May 11, 2025)
- ✅ Implemented mobile feed view for summaries in chronological order
- ✅ Fixed the display of <think> tags by using existing MaskedSection component
- ✅ Optimized mobile view width constraints and card sizes
- ✅ Added title truncation with tooltips for better readability
- ✅ Made headers sticky on scroll across all view modes
- ✅ Created project documentation for hackathon teammate search
- ✅ Updated README with demo GIF and context handling information

## Notes
- Keep implementation simple and focused on MVP features
- Prioritize stability and reliability over advanced features
- Document all API integrations and configurations
- Regular testing of Perplexity API integration
- Ensure consistent markdown formatting across all text displays
- Test markdown rendering with various content types (code, tables, lists, etc.)

## Explain Concept to User
- ✅ FastAPI: what it is and how it's used here
- [ ] Perplexity API: Integration and capabilities in our application
- [ ] SQLAlchemy: Database ORM and how we use it for data models
- [ ] JWT Authentication: How user authentication works
- [ ] React + TailwindCSS: Frontend framework and styling approach
- [ ] Scheduler Architecture: How automated updates work in the background
- [ ] API Testing: Understanding backend test structure and purpose
- [ ] Markdown Rendering: Implementation in the frontend
- [ ] State Management: How data flows between components

## Priority 2: Topic Stream Management
- ✅ Configure markdown formatting for API responses
  - ✅ Update system prompts to request markdown formatting
  - ✅ Implement markdown response parsing
