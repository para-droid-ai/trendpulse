# TrendPulse Dashboard Frontend

This is the frontend application for TrendPulse, a platform for displaying and managing topic-based information feeds using the Perplexity API.

## Features

- User authentication (login/register)
- Create and manage topic streams
- View summaries with sources
- Deep dive for asking follow-up questions
- Responsive design using TailwindCSS

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Backend server running (default: http://localhost:8000)

### Installation

1. Install dependencies:

```bash
npm install
# or 
yarn install
```

2. Start the development server:

```bash
npm start
# or
yarn start
```

The application will be available at http://localhost:3000.

### Environment Variables

You can customize the API URL by setting the `REACT_APP_API_URL` environment variable.

## Application Structure

- `/components` - Reusable UI components
- `/context` - React context providers
- `/pages` - Main application pages
- `/services` - API services for backend communication
- `/styles` - CSS and Tailwind configuration

## Backend Communication

The frontend communicates with the backend API for:

1. User authentication
2. Topic stream management
3. Retrieving summaries
4. Deep dive follow-up questions

## Technologies Used

- React
- React Router
- TailwindCSS
- Axios for API requests
- Date-fns for date formatting

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

``` 