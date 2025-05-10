Here is a detailed breakdown of all the Perplexity API models mentioned in the provided sources, formatted for easy copy-pasting into a single document:

***

### **Perplexity API Models Breakdown**

#### **1. sonar**

*   **Model Name:** sonar
*   **Model Type:** Search Model / Non-reasoning
*   **Use Case:** Best suited for **quick factual queries, topic summaries, product comparisons, and current events** where simple information retrieval and synthesis is needed without complex reasoning.
    *   *Not ideal for:* Multi-step analyses, exhaustive research on broad topics, or projects requiring detailed instructions or comprehensive reports across multiple sources.
    *   *Real-World Examples:* Summarizing books, TV shows, and movies; looking up definitions or quick facts; browsing news, sports, health, and finance content.
*   **Key Features:**
    *   Lightweight, cost-effective search model with grounding.
    *   **Real-time web search-based answers with citations**.
    *   Optimized for speed and cost.
*   **Context Length:** 128k
*   **Max Output Tokens:** Not specified (unlike sonar-pro).
*   **Pricing:**
    *   Input Tokens (Per Million): $1
    *   Output Tokens (Per Million): $1
    *   Price per 1,000 Requests (Variable based on `search_context_size`):
        *   High: $12
        *   Medium: $8
        *   Low: $5
*   **Notes:** Designed to retrieve and synthesize information efficiently. Requires access to the Sonar API suite.

#### **2. sonar-pro**

*   **Model Name:** sonar-pro
*   **Model Type:** Search Model / Non-reasoning
*   **Use Case:** Advanced search model with grounding, supporting **complex queries and follow-ups**. Suitable for multi-step Q&A tasks requiring deeper content understanding.
    *   *Use case Examples:* Conducting academic literature reviews; researching competitors and industry trends; generating restaurant catalogs with reviews.
*   **Key Features:**
    *   Advanced search offering with grounding.
    *   **In-depth answers with 2x more citations than Sonar**.
    *   Uses advanced information retrieval architecture.
    *   Optimized for multi-step tasks.
*   **Context Length:** **200k**
*   **Max Output Tokens:** **8k**
*   **Pricing:**
    *   Input Tokens (Per Million): $3
    *   Output Tokens (Per Million): **$15**
    *   Price per 1,000 Requests (Variable based on `search_context_size`):
        *   High: $14
        *   Medium: $10
        *   Low: $6
*   **Notes:** Designed to retrieve and synthesize information efficiently. Requires access to the Sonar API suite.

#### **3. sonar-deep-research**

*   **Model Name:** sonar-deep-research
*   **Model Type:** Research Model / Deep Research / Reasoning
*   **Use Case:** Ideal for **comprehensive topic reports, in-depth analysis with exhaustive web research**, and projects requiring synthesis of multiple information sources into cohesive reports like market analyses or literature reviews. Perfect for conducting exhaustive research into topics and generating reports with highly detailed analyses/insights.
    *   *Avoid using for:* Quick queries, simple lookups, or time-sensitive tasks, as these models may take 30+ minutes to process and are excessive when depth isn’t required. Not recommended for quick queries or time-sensitive tasks.
    *   *Real-World Examples:* Writing white papers for industry thought leadership; crafting highly detailed go-to-market (GTM) plans; creating educational content for universities or training programs.
*   **Key Features:**
    *   Expert-level research model.
    *   **Exhaustive research across hundreds of sources**.
    *   Expert-level subject analysis.
    *   Detailed report generation.
*   **Context Length:** 128k
*   **Max Output Tokens:** Not specified.
*   **Pricing:**
    *   Input Tokens (Per Million): $2
    *   Reasoning Tokens (Per Million): $3
    *   Output Tokens (Per Million): $8
    *   Price per 1,000 Requests: $5
*   **Notes:** Conducts in-depth analysis and generates detailed reports. Not suitable for frequent, fast updates. Requires access to the Sonar API suite.

#### **4. sonar-reasoning**

*   **Model Name:** sonar-reasoning
*   **Model Type:** Reasoning Model
*   **Use Case:** Designed for **quick reasoning-based tasks or general problem-solving with real-time search**. Excellent for complex analyses requiring step-by-step thinking, tasks needing strict adherence to instructions, information synthesis across sources, and logical problem-solving that demands informed recommendations.
    *   *Not recommended for:* Simple factual queries, basic information retrieval, exhaustive research projects (use Research models instead), or when speed takes priority over reasoning quality. Not suitable for frequent, fast updates.
    *   *Real-World Examples:* Exploring investment strategies based on market events; evaluating product feasibility studies; writing quick business case analyses.
*   **Key Features:**
    *   Excels at complex, multi-step tasks.
    *   **Chain-of-Thought (CoT) reasoning**.
    *   Fast, real-time reasoning model.
    *   Real-time web search with citations.
*   **Context Length:** 128k
*   **Max Output Tokens:** Not specified.
*   **Pricing:**
    *   Input Tokens (Per Million): $1
    *   Output Tokens (Per Million): $5
    *   Price per 1,000 Requests (Variable based on `search_context_size`):
        *   High: $12
        *   Medium: $8
        *   Low: $5
*   **Notes:** Reasoning models specifically output Chain of Thought (CoT) responses. Requires access to the Sonar API suite.

#### **5. sonar-reasoning-pro**

*   **Model Name:** sonar-reasoning-pro
*   **Model Type:** Reasoning Model
*   **Use Case:** Premier reasoning model best suited for dealing with **complex topics that require advanced multi-step reasoning**.
    *   *Use case Examples:* Performing competitive analyses for new products; understanding and exploring complex scientific topics; making detailed travel plans.
*   **Key Features:**
    *   Excels at complex, multi-step tasks.
    *   Premier reasoning offering powered by DeepSeek R1.
    *   **Enhanced Chain-of-thought (CoT) reasoning**.
    *   **2x more citations on average than Sonar Reasoning**.
    *   Uses advanced information retrieval architecture.
*   **Context Length:** 128k
*   **Max Output Tokens:** Not specified.
*   **Pricing:**
    *   Input Tokens (Per Million): $2
    *   Output Tokens (Per Million): $8
    *   Price per 1,000 Requests (Variable based on `search_context_size`):
        *   High: $14
        *   Medium: $10
        *   Low: $6
*   **Notes:** Reasoning models specifically output Chain of Thought (CoT) responses. Designed to output a `<think>` section containing reasoning tokens, immediately followed by a valid JSON object. The `response_format` parameter does not remove these reasoning tokens. Recommended to use a custom parser to extract the valid JSON portion. Requires access to the Sonar API suite.

#### **6. r1-1776**

*   **Model Name:** r1-1776
*   **Model Type:** Offline Model / Offline Chat Model
*   **Use Case:** Perfect for **creative content generation, tasks not requiring up-to-date web information**, scenarios favoring traditional LLM techniques, and maintaining conversation context without search interference. Provides **private, factual-based answering without live web search**.
    *   *Unsuitable for:* Queries needing current web information, tasks benefiting from search-augmented generation, or research projects requiring integration of multiple external sources.
    *   *Real-World Examples:* Historical research with unbiased perspectives; legal document reviews; analyzing structured, factual content.
*   **Key Features:**
    *   A version of DeepSeek R1 post-trained for uncensored, unbiased, and factual information.
    *   **Does not use the search subsystem**.
    *   No real-time search access.
    *   Provides factual, unbiased answers.
*   **Context Length:** 128k
*   **Max Output Tokens:** Not specified.
*   **Pricing:**
    *   Input Tokens (Per Million): $2
    *   Output Tokens (Per Million): $8
    *   Price per 1,000 Requests: Not specified (as it's offline, this metric likely doesn't apply in the same way as search models).
*   **Notes:** Does not use the search subsystem. Total cost per request is the sum of input and output tokens. Costs scale proportionally based on tokens used.

***