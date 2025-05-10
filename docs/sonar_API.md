Okay, here is a detailed breakdown of all information related to the Perplexity API from the provided sources, formatted for easy copy-pasting into a single document.

***

### **Perplexity API Details Breakdown**

#### **1. Perplexity API Overview**

The Perplexity API allows developers to integrate Perplexity's AI capabilities into their applications. The core function for generating responses is the **Chat Completions endpoint**.

#### **2. Chat Completions Endpoint**

*   **Request Method & URL:** Accessed via a **POST request** to the `/chat/completions` endpoint. The full URL is `https://api.perplexity.ai/chat/completions`.
*   **Required Headers:** The request requires specific headers:
    *   **Authorization:** Must include a `Bearer <token>`. The `<token>` is your authentication token.
    *   **Content-Type:** Must be `application/json`.
*   **Request Body Parameters:** The request body is a JSON object containing several key parameters:
    *   **`model`** (required string): Specifies the AI model to be used. Examples include `"sonar"` and `"r1-1776"`. The choice depends on desired functionality and cost.
    *   **`messages`** (required object[]): A list representing the conversation history. Each message object requires:
        *   **`role`** (required string enum): The role of the speaker, available options: `"system"`, `"user"`, `"assistant"`.
        *   **`content`** (required string or array): The message text.
        *   **Use in applications:** Crucial for multi-turn conversations, providing system instructions, managing conversation context, and enabling follow-up questions by including the full thread. Can include retrieved information from a knowledge base.
    *   **`max_tokens`** (integer): Controls the **maximum length of the model's response**. Responses exceeding this limit are truncated. Higher values allow longer responses but may increase time/cost. Used in TrendPulse to control summary length based on detail settings.
    *   **`temperature`** (number, default: 0.2): Adjusts the **randomness of the response**. Ranges from 0 to 2. Lower values (e.g., 0.1) produce more focused/deterministic output (good for factual queries), while higher values result in more creative/random output. Kept low in TrendPulse for factual, grounded responses. Required range: 0 <= x < 2.
    *   **`top_p`** (number, default: 0.9): The **nucleus sampling threshold** (0 to 1). Influences diversity by considering tokens with cumulative probability above the threshold. Lower values (e.g., 0.8) lead to more focused output, higher values allow greater diversity. Often used with `temperature`. Kept low in TrendPulse for factual, grounded responses.
    *   **`search_domain_filter`** (any[]): Allows filtering search results to specific domains. Limited to 10 domains for allowlisting or denylisting (using a `-` prefix). Can be used in Collaborative Knowledge Hub for research limited to specific websites, or Real-Time Niche Trend Explorer.
    *   **`return_images`** (boolean, default: false): Determines if search results should include images.
    *   **`return_related_questions`** (boolean, default: false): Determines if the API should return related questions.
    *   **`search_recency_filter`** (string): Filters search results based on time (e.g., `'week'`, `'day'`). **Essential** for the TrendPulse concept to focus on recent updates. Can be used in Collaborative Knowledge Hub for time-sensitive topics.
    *   **`top_k`** (number, default: 0): Limits the model to consider the `k` most likely next tokens. Lower values (e.g., 0) result in more focused output. Higher values allow diversity. A value of 0 disables this filter. Often used with `top_p`. Kept low in TrendPulse for grounded responses.
    *   **`stream`** (boolean, default: false): Determines if the response should be streamed incrementally.
    *   **`presence_penalty`** (number, default: 0): Positive values (0 to 2.0) increase the likelihood of discussing new topics by penalizing tokens already present. Higher values reduce repetition but can lead to off-topic text.
    *   **`frequency_penalty`** (number, default: 1): Decreases likelihood of repetition based on prior frequency (0 to 2.0). Higher values (e.g., 1.5) reduce repetition of words/phrases.
    *   **`response_format`** (object): Enables structured JSON output formatting. Note that for `sonar-reasoning-pro`, this parameter does **not** remove the `<think>` section containing reasoning tokens.
    *   **`web_search_options`** (object): Configures web search usage. Contains:
        *   **`search_context_size`** (enum, default: low): Controls the amount of search context retrieved. Options are `low` (cost savings, less comprehensive), `medium` (balanced), and `high` (comprehensive, higher cost). Set to 'medium' or 'high' in TrendPulse for good summarization, potentially 'high' for deeper dives. Used in KB app to refine new searches.
        *   **`user_location`** (object): Refines search results based on approximate user location. Includes `latitude` (number), `longitude` (number), and `country` (two-letter ISO code).

#### **3. Response**

The API returns a **200 OK response**. The response type is `any`. For reasoning models like `sonar-reasoning-pro`, the output includes a `<think>` section followed by a JSON object.

#### **4. Supported Models**

Perplexity offers a variety of models through its API, categorized by primary function:

*   **Search Models:** Designed for efficient information retrieval and synthesis with grounding.
    *   **`sonar`**
        *   **Model Type:** Non-reasoning.
        *   **Use Case:** Ideal for **quick factual queries, topic summaries, product comparisons, and current events** where simple information retrieval and synthesis is needed without complex reasoning. Not ideal for multi-step analyses, exhaustive research, or comprehensive reports across multiple sources. Used in TrendPulse for quick, cost-effective updates, and Collaborative Knowledge Hub for real-time grounding and fact verification.
        *   **Key Features:** Lightweight, cost-effective search model. **Real-time web search-based answers with citations**. Optimized for speed and cost. Provides citations.
        *   **Context Length:** 128k.
        *   **Max Output Tokens:** Not specified.
        *   **Pricing**:
            *   Input Tokens (Per Million): $1
            *   Output Tokens (Per Million): $1
            *   Price per 1,000 Requests (Variable based on `search_context_size`): High: $12, Medium: $8, Low: $5
    *   **`sonar-pro`**
        *   **Model Type:** Non-reasoning.
        *   **Use Case:** **Advanced search model** with grounding, supporting complex queries and follow-ups. Suitable for multi-step Q&A tasks requiring deeper content understanding. Used in TrendPulse for potentially deeper insights or when more citations are desired. Used in KB app for complex queries needing deeper understanding.
        *   **Key Features:** Advanced search offering with grounding. **In-depth answers with 2x more citations than Sonar**. Uses advanced information retrieval architecture. Optimized for multi-step tasks. Provides citations.
        *   **Context Length:** **200k**.
        *   **Max Output Tokens:** **8k**.
        *   **Pricing**:
            *   Input Tokens (Per Million): $3
            *   Output Tokens (Per Million): **$15**
            *   Price per 1,000 Requests (Variable based on `search_context_size`): High: $14, Medium: $10, Low: $6

*   **Research Models:** Models that conduct in-depth analysis and generate detailed reports.
    *   **`sonar-deep-research`**
        *   **Model Type:** Deep Research / Reasoning.
        *   **Use Case:** **Expert-level research model** for exhaustive searches and comprehensive reports. Ideal for comprehensive topic reports, in-depth analysis with exhaustive web research, and projects requiring synthesis of multiple information sources into cohesive reports like market analyses or literature reviews. **Avoid using for quick queries or time-sensitive tasks** (may take 30+ minutes).
        *   **Key Features:** Conducts in-depth analysis and generates detailed reports. **Exhaustive research across hundreds of sources**. Expert-level subject analysis. Detailed report generation.
        *   **Context Length:** 128k.
        *   **Max Output Tokens:** Not specified.
        *   **Pricing**:
            *   Input Tokens (Per Million): $2
            *   Reasoning Tokens (Per Million): $3
            *   Output Tokens (Per Million): $8
            *   Price per 1,000 Requests: $5

*   **Reasoning Models:** Models that excel at complex, multi-step tasks. Specifically output Chain of Thought (CoT) responses.
    *   **`sonar-reasoning`**
        *   **Model Type:** Reasoning.
        *   **Use Case:** Designed for **quick reasoning-based tasks or general problem-solving with real-time search**. Excellent for complex analyses requiring step-by-step thinking, tasks needing strict adherence to instructions, information synthesis across sources, and logical problem-solving that demands informed recommendations. Not recommended for simple factual queries, basic retrieval, or exhaustive research. Used in KB app for tasks needing step-by-step thinking with search.
        *   **Key Features:** Excels at complex, multi-step tasks. **Chain-of-Thought (CoT) reasoning**. **Fast, real-time reasoning model**. **Real-time web search with citations**. Uses advanced information retrieval architecture. Provides citations.
        *   **Context Length:** 128k.
        *   **Max Output Tokens:** Not specified.
        *   **Pricing**:
            *   Input Tokens (Per Million): $1
            *   Output Tokens (Per Million): $5
            *   Price per 1,000 Requests (Variable based on `search_context_size`): High: $12, Medium: $8, Low: $5
    *   **`sonar-reasoning-pro`**
        *   **Model Type:** Reasoning.
        *   **Use Case:** **Premier reasoning model** best suited for dealing with **complex topics that require advanced multi-step reasoning**. Used in KB app for complex analyses needing step-by-step thinking with search.
        *   **Key Features:** Excels at complex, multi-step tasks. Premier reasoning offering powered by DeepSeek R1. **Enhanced Chain-of-thought (CoT) reasoning**. **2x more citations on average than Sonar Reasoning**. Uses advanced information retrieval architecture. Provides citations.
        *   **Context Length:** 128k.
        *   **Max Output Tokens:** Not specified.
        *   **Pricing**:
            *   Input Tokens (Per Million): $2
            *   Output Tokens (Per Million): $8
            *   Price per 1,000 Requests (Variable based on `search_context_size`): High: $14, Medium: $10, Low: $6
        *   **Notes:** Designed to output a `<think>` section containing reasoning tokens, immediately followed by a valid JSON object. The `response_format` parameter does not remove these reasoning tokens. A custom parser is recommended to extract the JSON portion.

*   **Offline Models:** Chat models that **do not use the search subsystem**.
    *   **`r1-1776`**
        *   **Model Type:** Offline Chat Model.
        *   **Use Case:** Perfect for **creative content generation, tasks not requiring up-to-date web information**, scenarios favoring traditional LLM techniques, and maintaining conversation context without search interference. Provides **private, factual-based answering without live web search**. Unsuitable for queries needing current web information or tasks benefiting from search-augmented generation. Used in KB app for KB-only queries without external search, and Collaborative Knowledge Hub for offline synthesis, outlines, and unbiased explanations based on collected notes.
        *   **Key Features:** A version of DeepSeek R1 post-trained for uncensored, unbiased, and factual information. **Does not use the search subsystem**. No real-time search access. Provides factual, unbiased answers.
        *   **Context Length:** 128k.
        *   **Max Output Tokens:** Not specified.
        *   **Pricing**:
            *   Input Tokens (Per Million): $2
            *   Output Tokens (Per Million): $8
        *   **Notes:** Does not use the search subsystem. Total cost per request is the sum of input and output tokens. Costs scale proportionally based on tokens used.

#### **5. API Usage in Application Concepts**

The sources illustrate how the Perplexity API, particularly the **Chat Completions endpoint**, is central to various application concepts:

*   **TrendPulse Dashboard:** Leverages the API for real-time, grounded AI.
    *   Uses the `/chat/completions` endpoint.
    *   Primarily utilizes **`sonar` or `sonar-pro` models** for search and summarization.
    *   Employs the **`messages` parameter** to maintain conversation history for follow-up questions.
    *   Critically uses the **`search_recency_filter`** to focus on recent developments.
    *   Configures `web_search_options.search_context_size` (`medium` or `high`) to provide sufficient search results for summarization.
    *   Sets parameters like `temperature`, `top_p`, and `top_k` to **low values** to ensure factual, grounded responses based on search results.
    *   Uses `max_tokens` to control summary length.
    *   Processes **source citations** included in Sonar model responses.
*   **Personalized Knowledge Search Engine:** Uses the API for initial searches and incorporating user's KB.
    *   Uses the `/chat/completions` endpoint.
    *   Relies on **search-enabled models** (`sonar`, `sonar-pro`, `sonar-reasoning`, `sonar-reasoning-pro`) for real-time web search and synthesis during initial queries.
    *   Includes retrieved snippets from the user's knowledge base in the **`messages` parameter** content field for subsequent queries.
    *   Can optionally use the **`r1-1776` offline model** for queries that should only use the user's KB without external search.
    *   Acknowledges the **context length limitation** of models (128k or 200k tokens) when including KB text in prompts.
    *   Configures `web_search_options` parameters (`search_context_size`, `search_domain_filter`, `return_images`, `return_related_questions`, `search_recency_filter`) to refine new searches when using search models.
*   **Collaborative Knowledge Hub:** Leverages different models for distinct tasks.
    *   Uses the `/chat/completions` endpoint.
    *   Utilizes the **`sonar` model** for information ingestion needing real-time grounding, fact verification, and dynamic updates with citations. Parameters like `search_domain_filter` or `search_recency_filter` can refine `sonar` calls.
    *   Utilizes the **`r1-1776` model** for offline synthesis of existing notes, generating outlines, providing unbiased explanations, and creative suggestions that **do not require up-to-date web search**.
    *   Uses the **`messages` array** to potentially feed models context that includes contributions from different users.

Authorizations
​
Authorization
stringheaderrequired
Bearer authentication header of the form Bearer <token>, where <token> is your auth token.

Body
application/json
​
model
stringrequired
The name of the model that will complete your prompt. Refer to Supported Models to find all the models offered.

Example:
"sonar"

​
messages
object[]required
A list of messages comprising the conversation so far.


Hide child attributes

​
messages.content

string
required
The contents of the message in this turn of conversation. Can be a string or an array of content parts.

​
messages.role
enum<string>required
The role of the speaker in this conversation.

Available options: system, user, assistant 
Example:
[
  {
    "role": "system",
    "content": "Be precise and concise."
  },
  {
    "role": "user",
    "content": "How many stars are there in our galaxy?"
  }
]
​
max_tokens
integer
The maximum number of completion tokens returned by the API. Controls the length of the model's response. If the response would exceed this limit, it will be truncated. Higher values allow for longer responses but may increase processing time and costs.

​
temperature
numberdefault:0.2
The amount of randomness in the response, valued between 0 and 2. Lower values (e.g., 0.1) make the output more focused, deterministic, and less creative. Higher values (e.g., 1.5) make the output more random and creative. Use lower values for factual/information retrieval tasks and higher values for creative applications.

Required range: 0 <= x < 2
​
top_p
numberdefault:0.9
The nucleus sampling threshold, valued between 0 and 1. Controls the diversity of generated text by considering only the tokens whose cumulative probability exceeds the top_p value. Lower values (e.g., 0.5) make the output more focused and deterministic, while higher values (e.g., 0.95) allow for more diverse outputs. Often used as an alternative to temperature.

​
search_domain_filter
any[]
A list of domains to limit search results to. Currently limited to 10 domains for Allowlisting and Denylisting. For Denylisting, add a - at the beginning of the domain string. More information about this here.

​
return_images
booleandefault:false
Determines whether search results should include images.

​
return_related_questions
booleandefault:false
Determines whether related questions should be returned.

​
search_recency_filter
string
Filters search results based on time (e.g., 'week', 'day').

​
top_k
numberdefault:0
The number of tokens to keep for top-k filtering. Limits the model to consider only the k most likely next tokens at each step. Lower values (e.g., 10) make the output more focused and deterministic, while higher values allow for more diverse outputs. A value of 0 disables this filter. Often used in conjunction with top_p to control output randomness.

​
stream
booleandefault:false
Determines whether to stream the response incrementally.

​
presence_penalty
numberdefault:0
Positive values increase the likelihood of discussing new topics. Applies a penalty to tokens that have already appeared in the text, encouraging the model to talk about new concepts. Values typically range from 0 (no penalty) to 2.0 (strong penalty). Higher values reduce repetition but may lead to more off-topic text.

​
frequency_penalty
numberdefault:1
Decreases likelihood of repetition based on prior frequency. Applies a penalty to tokens based on how frequently they've appeared in the text so far. Values typically range from 0 (no penalty) to 2.0 (strong penalty). Higher values (e.g., 1.5) reduce repetition of the same words and phrases. Useful for preventing the model from getting stuck in loops.

​
response_format
object
Enables structured JSON output formatting.

​
web_search_options
object
Configuration for using web search in model responses.


Hide child attributes

​
web_search_options.search_context_size
enum<string>default:low
Determines how much search context is retrieved for the model. Options are: low (minimizes context for cost savings but less comprehensive answers), medium (balanced approach suitable for most queries), and high (maximizes context for comprehensive answers but at higher cost).

Available options: low, medium, high 
​
web_search_options.user_location
object
To refine search results based on geography, you can specify an approximate user location.


Hide child attributes

​
web_search_options.user_location.latitude
number
The latitude of the user's location.

​
web_search_options.user_location.longitude
number
The longitude of the user's location.

​
web_search_options.user_location.country
string
The two letter ISO country code of the user's location.

Example:
{ "search_context_size": "high" }
Response
200
application/json

application/json
OK
The response is of type any.