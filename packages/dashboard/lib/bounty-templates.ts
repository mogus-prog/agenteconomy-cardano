import type { BountyCategory, Difficulty } from "./types";

export interface ResultSchemaProperty {
  type: string;
  description: string;
}

export interface ResultSchema {
  type: "object";
  required: string[];
  properties: Record<string, ResultSchemaProperty>;
}

export interface BountyTemplate {
  id: string;
  name: string;
  category: BountyCategory;
  description: string;
  difficulty: Difficulty;
  suggestedReward: number; // in ADA
  tags: string[];
  descriptionTemplate: string;
  resultSchema: ResultSchema;
}

export const BOUNTY_TEMPLATES: BountyTemplate[] = [
  {
    id: "web-scraping",
    name: "Web Scraping",
    category: "DataExtraction",
    description: "Extract structured data from a website",
    difficulty: "medium",
    suggestedReward: 25,
    tags: ["scraping", "data", "automation"],
    descriptionTemplate:
      "Extract structured data from [TARGET_URL].\n\n" +
      "Requirements:\n" +
      "- Target URL: [specify the website or page to scrape]\n" +
      "- Data points to extract: [list the specific fields needed]\n" +
      "- Output format: JSON\n" +
      "- Handle pagination if applicable\n" +
      "- Respect robots.txt and rate limits",
    resultSchema: {
      type: "object",
      required: ["url", "dataPoints", "format", "extractedData"],
      properties: {
        url: { type: "string", description: "The URL that was scraped" },
        dataPoints: {
          type: "array",
          description: "List of data fields that were extracted",
        },
        format: {
          type: "string",
          description: "Output format of the extracted data (e.g. JSON, CSV)",
        },
        extractedData: {
          type: "object",
          description: "The actual extracted data payload",
        },
      },
    },
  },
  {
    id: "api-integration",
    name: "API Integration",
    category: "CodeGen",
    description: "Build an API integration or wrapper",
    difficulty: "hard",
    suggestedReward: 75,
    tags: ["api", "integration", "sdk"],
    descriptionTemplate:
      "Build an API integration for [SERVICE_NAME].\n\n" +
      "Requirements:\n" +
      "- Target API: [specify API docs URL]\n" +
      "- Language: [TypeScript/Python/etc.]\n" +
      "- Endpoints to cover: [list specific endpoints]\n" +
      "- Include error handling and retry logic\n" +
      "- Write unit tests for all methods\n" +
      "- Provide usage documentation",
    resultSchema: {
      type: "object",
      required: ["language", "repositoryUrl", "documentation", "testResults"],
      properties: {
        language: {
          type: "string",
          description: "Programming language used for the integration",
        },
        repositoryUrl: {
          type: "string",
          description: "URL to the code repository (GitHub, GitLab, etc.)",
        },
        documentation: {
          type: "string",
          description: "Usage documentation or README content",
        },
        testResults: {
          type: "string",
          description: "Summary of test execution results",
        },
      },
    },
  },
  {
    id: "market-research",
    name: "Market Research",
    category: "Research",
    description: "Research a topic and compile findings",
    difficulty: "medium",
    suggestedReward: 40,
    tags: ["research", "analysis", "report"],
    descriptionTemplate:
      "Research [TOPIC] and compile comprehensive findings.\n\n" +
      "Requirements:\n" +
      "- Topic: [specify the research subject]\n" +
      "- Scope: [define boundaries of the research]\n" +
      "- Minimum sources: 10 credible sources\n" +
      "- Include methodology description\n" +
      "- Provide key findings as actionable insights\n" +
      "- Deliver as a structured report",
    resultSchema: {
      type: "object",
      required: ["summary", "sources", "keyFindings", "methodology"],
      properties: {
        summary: {
          type: "string",
          description: "Executive summary of the research findings",
        },
        sources: {
          type: "array",
          description: "List of sources referenced in the research",
        },
        keyFindings: {
          type: "array",
          description: "List of key findings and actionable insights",
        },
        methodology: {
          type: "string",
          description: "Description of the research methodology used",
        },
      },
    },
  },
  {
    id: "content-writing",
    name: "Content Writing",
    category: "Content",
    description: "Write content on a specified topic",
    difficulty: "easy",
    suggestedReward: 15,
    tags: ["writing", "content", "copywriting"],
    descriptionTemplate:
      "Write content about [TOPIC].\n\n" +
      "Requirements:\n" +
      "- Topic: [specify the subject matter]\n" +
      "- Type: [blog post / article / documentation / etc.]\n" +
      "- Word count: [target word count]\n" +
      "- Tone: [professional / casual / technical]\n" +
      "- Include relevant sources and citations\n" +
      "- SEO-optimized if applicable",
    resultSchema: {
      type: "object",
      required: ["content", "wordCount", "format", "sources"],
      properties: {
        content: {
          type: "string",
          description: "The written content or IPFS CID pointing to it",
        },
        wordCount: {
          type: "number",
          description: "Total word count of the delivered content",
        },
        format: {
          type: "string",
          description: "Content format (e.g. Markdown, HTML, plain text)",
        },
        sources: {
          type: "array",
          description: "Sources and references used in the content",
        },
      },
    },
  },
  {
    id: "smart-contract-audit",
    name: "Smart Contract Audit",
    category: "OnChain",
    description: "Review and audit a smart contract",
    difficulty: "hard",
    suggestedReward: 100,
    tags: ["audit", "security", "smart-contract", "cardano"],
    descriptionTemplate:
      "Audit the smart contract at [CONTRACT_LOCATION].\n\n" +
      "Requirements:\n" +
      "- Contract language: [Aiken / Plutus / Solidity]\n" +
      "- Repository URL: [link to the contract code]\n" +
      "- Focus areas: [logic bugs, reentrancy, access control, etc.]\n" +
      "- Classify findings by severity (Critical/High/Medium/Low/Info)\n" +
      "- Provide remediation recommendations for each finding\n" +
      "- Deliver a formal audit report",
    resultSchema: {
      type: "object",
      required: ["findings", "severity", "recommendations", "auditReport"],
      properties: {
        findings: {
          type: "array",
          description:
            "List of security findings with descriptions and locations",
        },
        severity: {
          type: "string",
          description:
            "Overall severity assessment (Critical/High/Medium/Low)",
        },
        recommendations: {
          type: "string",
          description: "Remediation recommendations for identified issues",
        },
        auditReport: {
          type: "string",
          description: "Full audit report document or IPFS CID",
        },
      },
    },
  },
  {
    id: "translation",
    name: "Translation",
    category: "Translation",
    description: "Translate content between languages",
    difficulty: "easy",
    suggestedReward: 20,
    tags: ["translation", "localization", "language"],
    descriptionTemplate:
      "Translate content from [SOURCE_LANGUAGE] to [TARGET_LANGUAGE].\n\n" +
      "Requirements:\n" +
      "- Source language: [e.g. English]\n" +
      "- Target language: [e.g. Spanish]\n" +
      "- Content type: [documentation / UI strings / article]\n" +
      "- Maintain original formatting and structure\n" +
      "- Preserve technical terms where appropriate\n" +
      "- Native-level fluency required",
    resultSchema: {
      type: "object",
      required: [
        "sourceLanguage",
        "targetLanguage",
        "translatedContent",
        "wordCount",
      ],
      properties: {
        sourceLanguage: {
          type: "string",
          description: "The original language of the content",
        },
        targetLanguage: {
          type: "string",
          description: "The language the content was translated into",
        },
        translatedContent: {
          type: "string",
          description: "The translated content or IPFS CID pointing to it",
        },
        wordCount: {
          type: "number",
          description: "Word count of the translated content",
        },
      },
    },
  },
  {
    id: "data-analysis",
    name: "Data Analysis",
    category: "DataExtraction",
    description: "Analyze a dataset and produce insights",
    difficulty: "medium",
    suggestedReward: 50,
    tags: ["data", "analysis", "visualization", "insights"],
    descriptionTemplate:
      "Analyze the dataset at [DATASET_LOCATION] and produce insights.\n\n" +
      "Requirements:\n" +
      "- Dataset: [URL or description of the dataset]\n" +
      "- Analysis goals: [what questions to answer]\n" +
      "- Include statistical methodology description\n" +
      "- Produce at least 3 visualizations\n" +
      "- Summarize key findings with supporting data\n" +
      "- Deliver as a reproducible notebook or report",
    resultSchema: {
      type: "object",
      required: [
        "dataset",
        "methodology",
        "findings",
        "visualizations",
        "summary",
      ],
      properties: {
        dataset: {
          type: "string",
          description: "Reference to the dataset that was analyzed",
        },
        methodology: {
          type: "string",
          description: "Statistical and analytical methods used",
        },
        findings: {
          type: "array",
          description: "List of key findings with supporting data",
        },
        visualizations: {
          type: "string",
          description: "Visualizations or IPFS CID pointing to them",
        },
        summary: {
          type: "string",
          description: "Executive summary of the analysis results",
        },
      },
    },
  },
  {
    id: "code-review",
    name: "Code Review",
    category: "CodeGen",
    description: "Review code for bugs, security, and best practices",
    difficulty: "medium",
    suggestedReward: 35,
    tags: ["code-review", "security", "best-practices", "quality"],
    descriptionTemplate:
      "Review the code in [REPOSITORY_URL] for quality and security.\n\n" +
      "Requirements:\n" +
      "- Repository: [link to the code]\n" +
      "- Language(s): [TypeScript / Python / Rust / etc.]\n" +
      "- Focus areas: [bugs, security, performance, style]\n" +
      "- Check for common vulnerability patterns\n" +
      "- Suggest improvements with code examples\n" +
      "- Provide an overall quality score (1-10)",
    resultSchema: {
      type: "object",
      required: [
        "filesReviewed",
        "issues",
        "suggestions",
        "overallScore",
      ],
      properties: {
        filesReviewed: {
          type: "number",
          description: "Number of files reviewed",
        },
        issues: {
          type: "array",
          description:
            "List of issues found (bugs, vulnerabilities, anti-patterns)",
        },
        suggestions: {
          type: "array",
          description: "List of improvement suggestions with code examples",
        },
        overallScore: {
          type: "number",
          description: "Overall code quality score from 1 to 10",
        },
      },
    },
  },
];

/** Look up a template by its id */
export function getTemplateById(id: string): BountyTemplate | undefined {
  return BOUNTY_TEMPLATES.find((t) => t.id === id);
}

/** Get unique categories from templates */
export function getTemplateCategories(): string[] {
  return [...new Set(BOUNTY_TEMPLATES.map((t) => t.category))];
}
