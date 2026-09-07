const env =
  typeof import.meta !== "undefined" && import.meta.env
    ? import.meta.env
    : {};

const GEMINI_KEY = String(env.VITE_GEMINI_API_KEY || "").trim();
const GROQ_KEY = String(env.VITE_GROQ_API_KEY || "").trim();

const GEMINI_MODEL = String(
  env.VITE_GEMINI_MODEL || "gemini-2.5-flash"
).trim();

const GROQ_MODEL = String(
  env.VITE_GROQ_MODEL || "qwen/qwen3.6-27b"
).trim();

const GEMINI_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models";

const GROQ_ENDPOINT =
  "https://api.groq.com/openai/v1/chat/completions";

/* =========================================================
   BASIC HELPERS
========================================================= */

const cleanText = (value) =>
  String(value ?? "")
    .replace(/\u0000/g, "")
    .replace(/\s+/g, " ")
    .trim();

/* =========================================================
   REMOVE AI INTERNAL REASONING
========================================================= */

export const cleanAIResponse = (value) => {
  let text = String(value ?? "");

  if (!text) return "";

  /*
   * Remove complete reasoning blocks.
   */
  text = text.replace(
    /<think\b[^>]*>[\s\S]*?<\/think>/gi,
    ""
  );

  text = text.replace(
    /<thinking\b[^>]*>[\s\S]*?<\/thinking>/gi,
    ""
  );

  text = text.replace(
    /<reasoning\b[^>]*>[\s\S]*?<\/reasoning>/gi,
    ""
  );

  text = text.replace(
    /<analysis\b[^>]*>[\s\S]*?<\/analysis>/gi,
    ""
  );

  /*
   * Remove opening/closing reasoning tags if a provider
   * returned a malformed/truncated response.
   */
  text = text.replace(/<\/?think\b[^>]*>/gi, "");
  text = text.replace(/<\/?thinking\b[^>]*>/gi, "");
  text = text.replace(/<\/?reasoning\b[^>]*>/gi, "");
  text = text.replace(/<\/?analysis\b[^>]*>/gi, "");

  /*
   * Remove common reasoning prefixes.
   */
  text = text.replace(
    /^\s*(thinking process|thinking|reasoning process|reasoning|analysis)\s*:\s*/i,
    ""
  );

  /*
   * Some models return Markdown/code-like escaped tags.
   */
  text = text.replace(
    /\\?<think\b[^>]*>[\s\S]*?\\?<\/think>/gi,
    ""
  );

  /*
   * If a leaked "Thinking Process:" section remains,
   * keep only the likely final answer after it when possible.
   */
  const leakedMarkers = [
    "Thinking Process:",
    "Thinking process:",
    "Reasoning Process:",
    "Reasoning process:",
    "Analysis:",
  ];

  for (const marker of leakedMarkers) {
    const index = text.indexOf(marker);

    if (index !== -1) {
      const before = text.slice(0, index).trim();

      /*
       * If there is useful content before the reasoning,
       * keep that. Otherwise remove everything after marker.
       */
      if (before) {
        text = before;
      } else {
        text = "";
      }
    }
  }

  /*
   * Remove accidental bullet/step reasoning fragments.
   */
  text = text.replace(
    /^\s*\d+\.\s*\*\*?(analyze|analyse|consult|formulate|draft|review|refine|self-correction).*$/gim,
    ""
  );

  /*
   * Remove excessive Markdown formatting that can appear
   * from leaked model reasoning.
   */
  text = text.replace(/\*\*(.*?)\*\*/g, "$1");

  /*
   * Normalize whitespace again.
   */
  text = text
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return text;
};

const finalizeAIText = (value) => {
  const cleaned = cleanAIResponse(value);

  if (!cleaned) {
    throw new Error("AI returned an empty response.");
  }

  return cleaned;
};

/* =========================================================
   CAMERA DATA URL
========================================================= */

const dataUrlToPart = (dataUrl) => {
  const match = String(dataUrl || "").match(
    /^data:(image\/[\w.+-]+);base64,(.+)$/
  );

  if (!match) {
    throw new Error(
      "Camera frame is invalid. Capture a JPEG frame and try again."
    );
  }

  return {
    mimeType: match[1],
    data: match[2],
  };
};

/* =========================================================
   ERROR HELPERS
========================================================= */

const readErrorBody = async (response) => {
  try {
    const raw = await response.text();

    if (!raw) return "";

    try {
      const body = JSON.parse(raw);

      const message =
        body?.error?.message ||
        body?.message ||
        body?.error?.detail ||
        (typeof body?.error === "string" ? body.error : "") ||
        body?.detail ||
        body?.error_description;

      return cleanText(message || raw);
    } catch {
      return cleanText(raw);
    }
  } catch {
    return "";
  }
};

export const formatAIError = (error, provider = "AI") => {
  const status = Number(
    error?.status ||
      error?.response?.status ||
      0
  );

  const raw = cleanText(error?.message || error);

  if (status === 401) {
    return `${provider} API key is invalid or expired.`;
  }

  if (status === 403) {
    return `${provider} API access is not authorized.`;
  }

  if (status === 404) {
    return raw
      ? `${provider} model/endpoint was not found: ${raw}`
      : `${provider} model or endpoint was not found.`;
  }

  if (status === 429) {
    return `${provider} rate limit reached. Please try again soon.`;
  }

  if (status === 400) {
    return raw
      ? `${provider} request failed: ${raw}`
      : `${provider} request is invalid.`;
  }

  if (raw) {
    return raw;
  }

  return `${provider} API request failed.`;
};

const makeProviderError = (
  provider,
  response,
  detail
) => {
  const error = new Error(
    detail ||
      `${provider} request failed (${response.status}).`
  );

  error.provider = provider;
  error.status = response.status;

  return error;
};

/* =========================================================
   GEMINI RESPONSE PARSER
========================================================= */

export const parseGeminiResponse = (data) => {
  const parts =
    data?.candidates?.[0]?.content?.parts;

  if (!Array.isArray(parts)) {
    throw new Error(
      "Gemini returned an invalid response."
    );
  }

  /*
   * Ignore Gemini thought parts.
   */
  const text = parts
    .filter((part) => part?.thought !== true)
    .map((part) => part?.text || "")
    .join(" ");

  return finalizeAIText(text);
};

/* =========================================================
   GROQ RESPONSE PARSER
========================================================= */

export const parseGroqResponse = (data) => {
  const message =
    data?.choices?.[0]?.message;

  if (!message) {
    throw new Error(
      "Groq returned an invalid response."
    );
  }

  /*
   * IMPORTANT:
   *
   * Some reasoning models expose:
   * - content
   * - reasoning_content
   *
   * We ONLY want final content.
   */
  let text = message?.content || "";

  /*
   * Never use reasoning_content as the answer.
   */
  if (Array.isArray(text)) {
    text = text
      .map((item) => {
        if (typeof item === "string") {
          return item;
        }

        return item?.text || "";
      })
      .join(" ");
  }

  return finalizeAIText(text);
};

/* =========================================================
   GEMINI TEXT
========================================================= */

export async function callGemini(
  parts,
  options = {}
) {
  if (!GEMINI_KEY) {
    throw new Error(
      "No Gemini API key configured."
    );
  }

  if (!GEMINI_MODEL) {
    throw new Error(
      "No Gemini model configured."
    );
  }

  const response = await fetch(
    `${GEMINI_ENDPOINT}/${encodeURIComponent(
      GEMINI_MODEL
    )}:generateContent?key=${encodeURIComponent(
      GEMINI_KEY
    )}`,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        contents: [
          {
            parts,
          },
        ],

        generationConfig: {
          temperature:
            options.temperature ?? 0.2,

          maxOutputTokens:
            options.maxOutputTokens ?? 300,
        },
      }),
    }
  );

  if (!response.ok) {
    const detail =
      await readErrorBody(response);

    throw makeProviderError(
      "Gemini",
      response,
      detail ||
        `Gemini request failed (${response.status}).`
    );
  }

  return parseGeminiResponse(
    await response.json()
  );
}

/* =========================================================
   GROQ TEXT
========================================================= */

export async function callGroq(
  content,
  options = {}
) {
  if (!GROQ_KEY) {
    throw new Error(
      "No Groq API key configured."
    );
  }

  if (!GROQ_MODEL) {
    throw new Error(
      "No Groq model configured."
    );
  }

  const messages =
    options.messages || [
      {
        role: "system",
        content:
          "You are Daily Goal AI, a concise and friendly study coach.",
      },

      {
        role: "user",
        content,
      },
    ];

  const response = await fetch(
    GROQ_ENDPOINT,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",

        Authorization: `Bearer ${GROQ_KEY}`,
      },

      body: JSON.stringify({
        model: GROQ_MODEL,

        messages,

        /*
         * IMPORTANT:
         * Do NOT stream the response.
         *
         * This prevents reasoning chunks from
         * appearing in the UI before cleaning.
         */
        stream: false,

        temperature:
          options.temperature ?? 0.2,

        max_completion_tokens:
          options.maxCompletionTokens ?? 300,

        /*
         * Tell supported reasoning models to keep
         * reasoning out of the visible answer.
         */
        reasoning_effort:
          options.reasoningEffort ?? "none",
      }),
    }
  );

  if (!response.ok) {
    const detail =
      await readErrorBody(response);

    throw makeProviderError(
      "Groq",
      response,
      detail ||
        `Groq request failed (${response.status}).`
    );
  }

  return parseGroqResponse(
    await response.json()
  );
}

/* =========================================================
   GEMINI VISION
========================================================= */

export async function callGeminiVision(
  dataUrl,
  prompt
) {
  return callGemini(
    [
      {
        text: prompt,
      },

      {
        inlineData:
          dataUrlToPart(dataUrl),
      },
    ],
    {
      temperature: 0.15,
      maxOutputTokens: 220,
    }
  );
}

/* =========================================================
   GROQ VISION
========================================================= */

export async function callGroqVision(
  dataUrl,
  prompt
) {
  return callGroq(
    [
      {
        type: "text",
        text: prompt,
      },

      {
        type: "image_url",

        image_url: {
          url: dataUrl,
        },
      },
    ],
    {
      temperature: 0.15,
      maxCompletionTokens: 220,
      reasoningEffort: "none",
    }
  );
}

/* =========================================================
   CONFIG
========================================================= */

export function getAIConfig() {
  return {
    geminiConfigured: Boolean(
      GEMINI_KEY && GEMINI_MODEL
    ),

    groqConfigured: Boolean(
      GROQ_KEY && GROQ_MODEL
    ),

    geminiModel: GEMINI_MODEL,

    groqModel: GROQ_MODEL,
  };
}

export function checkAIConfiguration() {
  const config = getAIConfig();

  return {
    ...config,

    gemini: config.geminiConfigured
      ? "configured"
      : "missing",

    groq: config.groqConfigured
      ? "configured"
      : "missing",
  };
}

/* =========================================================
   CAMERA AI
========================================================= */

export async function analyzeCameraFrame(
  dataUrl,
  context = {}
) {
  const prompt = [
    "You are Daily Goal AI camera assistant.",

    "Analyze this single webcam frame for a study session.",

    "Return ONLY the final answer.",
    "Do not reveal reasoning.",
    "Do not output <think>, <thinking>, <reasoning>, or <analysis> tags.",

    "Return exactly one short sentence.",

    "Mention only clearly visible study observations.",

    "Useful observations may include:",
    "focused posture, looking away, phone visible, multiple people, or no person visible.",

    "Do not identify the person.",
    "Do not infer sensitive traits.",
    "Do not make medical claims.",

    `Current local focus score: ${Math.round(
      Number(context.focusScore) || 0
    )}/100.`,

    `Local attention state: ${
      context.attention || "unknown"
    }.`,
  ].join(" ");

  const errors = [];

  /* ---------------- GEMINI ---------------- */

  if (getAIConfig().geminiConfigured) {
    try {
      const text =
        await callGeminiVision(
          dataUrl,
          prompt
        );

      return {
        text,
        provider: "Gemini Vision",
        model: GEMINI_MODEL,
        fallback: false,
      };
    } catch (error) {
      errors.push({
        provider: "Gemini",
        error,
      });

      console.warn(
        "[Daily Goal AI] Provider: Gemini Vision",
        error
      );
    }
  } else {
    errors.push({
      provider: "Gemini",
      error: new Error(
        "No Gemini API key configured."
      ),
    });
  }

  /* ---------------- GROQ FALLBACK ---------------- */

  if (getAIConfig().groqConfigured) {
    try {
      const text =
        await callGroqVision(
          dataUrl,
          prompt
        );

      return {
        text,
        provider: "Groq Vision",
        model: GROQ_MODEL,
        fallback: true,
      };
    } catch (error) {
      errors.push({
        provider: "Groq",
        error,
      });

      console.warn(
        "[Daily Goal AI] Provider: Groq Vision",
        error
      );
    }
  } else {
    errors.push({
      provider: "Groq",
      error: new Error(
        "No Groq API key configured."
      ),
    });
  }

  const details = errors
    .map(
      ({ provider, error }) =>
        `${provider}: ${formatAIError(
          error,
          provider
        )}`
    )
    .filter(Boolean);

  const failure = new Error(
    details.length
      ? details.join(" | ")
      : "AI provider temporarily unavailable."
  );

  failure.providers = errors;

  throw failure;
}

/* =========================================================
   SPECIAL USER QUESTIONS
========================================================= */

const isGreeting = (message) => {
  const value = cleanText(message).toLowerCase();

  return /^(hi|hello|hey|hii|hiii|hola|yo)[!. ]*$/i.test(
    value
  );
};

const asksAboutWebsiteCreator = (message) => {
  const value = cleanText(message).toLowerCase();

  return (
    /(who|which person|who's|whos).*(made|make|created|create|built|build|developed|developer)/i.test(
      value
    ) ||
    /(made|created|built|developed).*(this|the).*(site|website|app|application)/i.test(
      value
    ) ||
    /(site|website|app|application).*(made|created|built|developed|creator|developer)/i.test(
      value
    ) ||
    /(kisne|kisney).*(banaya|banayi|banaya hai|develop)/i.test(
      value
    ) ||
    /(developer|creator).*(kaun|who)/i.test(
      value
    )
  );
};

const asksAboutLogoDesigner = (message) => {
  const value = cleanText(message).toLowerCase();

  return (
    /(who|which person|who's|whos).*(made|make|created|create|designed|design)/i.test(
      value
    ) &&
    /logo/i.test(value)
  ) ||
    /(logo).*(made|created|designed|designer|creator)/i.test(
      value
    ) ||
    /(kisne|kisney).*(logo).*(banaya|banayi|design)/i.test(
      value
    ) ||
    /(logo).*(kisne|kisney)/i.test(value);
};

const asksAboutSuman = (message) => {
  const value = cleanText(message).toLowerCase();

  return (
    /\bwho is suman kumar\b/i.test(value) ||
    /\bsuman kumar kaun hai\b/i.test(value)
  );
};

const asksAboutBothCreators = (message) => {
  const value = cleanText(message).toLowerCase();

  const hasSuman =
    /suman kumar/i.test(value);

  const hasLogo =
    /logo/i.test(value);

  return hasSuman && hasLogo;
};

/* =========================================================
   LOCAL DATE/TIME
========================================================= */

const getLocalDateTimeContext = () => {
  try {
    const now = new Date();

    return {
      date: now.toLocaleDateString(
        undefined,
        {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        }
      ),

      time: now.toLocaleTimeString(
        undefined,
        {
          hour: "numeric",
          minute: "2-digit",
          second: "2-digit",
        }
      ),

      timezone:
        Intl.DateTimeFormat().resolvedOptions()
          .timeZone || "local",
    };
  } catch {
    return {
      date: "today",
      time: "local time",
      timezone: "local",
    };
  }
};

/* =========================================================
   STUDY COACH
========================================================= */

export async function askStudyCoach(
  message,
  history = [],
  context = {}
) {
  const userMessage = cleanText(message);

  if (!userMessage) {
    return {
      text: "Tell me what you need help with.",
      provider: "Daily Goal",
      model: "local",
      fallback: false,
    };
  }

  /* =====================================================
     GUARANTEED CREATOR ANSWERS
  ===================================================== */

  if (asksAboutBothCreators(userMessage)) {
    return {
      text:
        "SUMAN KUMAR created and developed the Daily Goal website, while JATIN designed the logo.",

      provider: "Daily Goal",
      model: "local",
      fallback: false,
    };
  }

  if (
    asksAboutLogoDesigner(userMessage)
  ) {
    return {
      text:
        "The Daily Goal logo was designed by JATIN.",

      provider: "Daily Goal",
      model: "local",
      fallback: false,
    };
  }

  if (
    asksAboutWebsiteCreator(userMessage) ||
    asksAboutSuman(userMessage)
  ) {
    return {
      text:
        "SUMAN KUMAR is the creator and developer of the Daily Goal website and application.",

      provider: "Daily Goal",
      model: "local",
      fallback: false,
    };
  }

  /* =====================================================
     GREETING
  ===================================================== */

  if (isGreeting(userMessage)) {
    return {
      text:
        "Hi there! How can I help you reach your goals today?",

      provider: "Daily Goal",
      model: "local",
      fallback: false,
    };
  }

  /* =====================================================
     HISTORY
  ===================================================== */

  const safeHistory = Array.isArray(history)
    ? history.slice(-8).map((item) => ({
        role:
          item?.role === "assistant"
            ? "assistant"
            : "user",

        content: cleanText(
          item?.content
        ),
      }))
    : [];

  /* =====================================================
     TIME CONTEXT
  ===================================================== */

  const dateTime =
    getLocalDateTimeContext();

  const system = `
You are Daily Goal AI, a friendly study coach.

IMPORTANT OUTPUT RULES:
- Return ONLY the final answer.
- Never reveal internal reasoning.
- Never show a thinking process.
- Never output <think>...</think>.
- Never output <thinking>...</thinking>.
- Never output <reasoning>...</reasoning>.
- Never output <analysis>...</analysis>.
- Never describe how you generated the answer.
- Never output "Thinking Process:".
- Never output numbered reasoning steps.
- Answer directly.
- Keep normal answers to 1-4 short sentences.
- Be friendly, concise and useful.
- Do not pretend to see a camera unless an image was actually supplied.

CREATOR INFORMATION:
- The Daily Goal website/application was created and developed by SUMAN KUMAR.
- The Daily Goal logo was designed by JATIN.
- If asked who made, created, built or developed the website/app, answer SUMAN KUMAR.
- If asked who designed or made the logo, answer JATIN.
- If asked about both, mention SUMAN KUMAR for the website and JATIN for the logo.

CURRENT LOCAL DATE:
${dateTime.date}

CURRENT LOCAL TIME:
${dateTime.time}

LOCAL TIMEZONE:
${dateTime.timezone}
`.trim();

  const userContent = [
    `Focus score: ${Math.round(
      Number(context.focusScore) || 0
    )}/100.`,

    `Study state: ${
      context.sessionState || "unknown"
    }.`,

    `Current local date: ${dateTime.date}.`,

    `Current local time: ${dateTime.time}.`,

    ...safeHistory.map(
      (item) =>
        `${item.role}: ${item.content}`
    ),

    `user: ${userMessage}`,
  ].join("\n");

  const errors = [];

  /* =====================================================
     GEMINI FIRST
  ===================================================== */

  if (getAIConfig().geminiConfigured) {
    try {
      const text =
        await callGemini(
          [
            {
              text: `${system}\n\n${userContent}`,
            },
          ],
          {
            temperature: 0.2,
            maxOutputTokens: 300,
          }
        );

      return {
        text: finalizeAIText(text),

        provider: "Gemini",

        model: GEMINI_MODEL,

        fallback: false,
      };
    } catch (error) {
      errors.push({
        provider: "Gemini",
        error,
      });

      console.warn(
        "[Daily Goal AI] Provider: Gemini",
        error
      );
    }
  } else {
    errors.push({
      provider: "Gemini",
      error: new Error(
        "No Gemini API key configured."
      ),
    });
  }

  /* =====================================================
     GROQ FALLBACK
  ===================================================== */

  if (getAIConfig().groqConfigured) {
    try {
      const text =
        await callGroq(
          userMessage,
          {
            messages: [
              {
                role: "system",
                content: system,
              },

              ...safeHistory,

              {
                role: "user",
                content: userMessage,
              },
            ],

            temperature: 0.2,

            maxCompletionTokens: 300,

            reasoningEffort: "none",
          }
        );

      return {
        text: finalizeAIText(text),

        provider: "Groq",

        model: GROQ_MODEL,

        fallback: true,
      };
    } catch (error) {
      errors.push({
        provider: "Groq",
        error,
      });

      console.warn(
        "[Daily Goal AI] Provider: Groq",
        error
      );
    }
  } else {
    errors.push({
      provider: "Groq",
      error: new Error(
        "No Groq API key configured."
      ),
    });
  }

  /* =====================================================
     FAILURE
  ===================================================== */

  const details = errors
    .map(
      ({ provider, error }) =>
        `${provider}: ${formatAIError(
          error,
          provider
        )}`
    )
    .filter(Boolean);

  const failure = new Error(
    details.length
      ? details.join(" | ")
      : "AI provider temporarily unavailable."
  );

  failure.providers = errors;

  throw failure;
}

/* =========================================================
   CURRENT PROVIDER
========================================================= */

export function getCurrentAIProvider() {
  const config = getAIConfig();

  if (config.geminiConfigured) {
    return "Gemini";
  }

  if (config.groqConfigured) {
    return "Groq";
  }

  return "Unavailable";
}

/* =========================================================
   CLOUD CONFIG
========================================================= */

export const cloudAIConfig = {
  get hasGemini() {
    return getAIConfig()
      .geminiConfigured;
  },

  get hasGroq() {
    return getAIConfig()
      .groqConfigured;
  },

  get geminiModel() {
    return GEMINI_MODEL;
  },

  get groqModel() {
    return GROQ_MODEL;
  },
};

/* =========================================================
   AI HEALTH
========================================================= */

export async function getAIHealth() {
  const config = getAIConfig();

  return {
    gemini: {
      configured:
        config.geminiConfigured,

      model:
        config.geminiModel,
    },

    groq: {
      configured:
        config.groqConfigured,

      model:
        config.groqModel,
    },
  };
}

/* =========================================================
   AI HEALTH CHECKS
========================================================= */

export async function runAIHealthChecks({
  visionDataUrl,
} = {}) {
  const checks = {
    geminiText: {
      ok: false,
      message: "Not configured",
    },

    geminiVision: {
      ok: false,
      message: "Not configured",
    },

    groqText: {
      ok: false,
      message: "Not configured",
    },

    groqVision: {
      ok: false,
      message: "Not configured",
    },
  };

  /* ---------------- GEMINI ---------------- */

  if (getAIConfig().geminiConfigured) {
    try {
      await callGemini(
        [
          {
            text:
              "Reply with exactly: OK",
          },
        ],
        {
          maxOutputTokens: 8,
        }
      );

      checks.geminiText = {
        ok: true,
        message: "OK",
      };
    } catch (error) {
      checks.geminiText = {
        ok: false,
        message:
          formatAIError(
            error,
            "Gemini"
          ),
      };
    }

    if (visionDataUrl) {
      try {
        await callGeminiVision(
          visionDataUrl,
          "Reply with exactly: OK"
        );

        checks.geminiVision = {
          ok: true,
          message: "OK",
        };
      } catch (error) {
        checks.geminiVision = {
          ok: false,
          message:
            formatAIError(
              error,
              "Gemini Vision"
            ),
        };
      }
    } else {
      checks.geminiVision = {
        ok: false,
        message:
          "Vision frame not supplied",
      };
    }
  }

  /* ---------------- GROQ ---------------- */

  if (getAIConfig().groqConfigured) {
    try {
      await callGroq(
        "Reply with exactly: OK",
        {
          maxCompletionTokens: 8,
          reasoningEffort: "none",
        }
      );

      checks.groqText = {
        ok: true,
        message: "OK",
      };
    } catch (error) {
      checks.groqText = {
        ok: false,
        message:
          formatAIError(
            error,
            "Groq"
          ),
      };
    }

    if (visionDataUrl) {
      try {
        await callGroqVision(
          visionDataUrl,
          "Reply with exactly: OK"
        );

        checks.groqVision = {
          ok: true,
          message: "OK",
        };
      } catch (error) {
        checks.groqVision = {
          ok: false,
          message:
            formatAIError(
              error,
              "Groq Vision"
            ),
        };
      }
    } else {
      checks.groqVision = {
        ok: false,
        message:
          "Vision frame not supplied",
      };
    }
  }

  return checks;
}