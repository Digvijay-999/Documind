export const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'DocuMind AI API',
    version: '1.0.0',
    description:
      'Production-grade RESTful API for DocuMind AI — intelligent document retrieval, RAG streaming with Groq, OpenRouter Nemotron vector embeddings, Razorpay test payments, and real-time WebSocket notifications.',
    contact: {
      name: 'DocuMind Engineering Team',
      email: 'support@documind.ai',
    },
  },
  servers: [
    {
      url: 'http://localhost:5000',
      description: 'Local Development Server',
    },
  ],
  tags: [
    { name: 'Health & Stats', description: 'System health check and public platform statistics' },
    { name: 'Auth', description: 'User registration, login, and profile retrieval' },
    { name: 'Documents', description: 'PDF upload, ingestion, chunking, and semantic search' },
    { name: 'AI & RAG', description: 'RAG Q&A, SSE token streaming with Groq, and Autonomous Agent execution' },
    { name: 'Chat History', description: 'MongoDB persistent chat history per document' },
    { name: 'Payments', description: 'Razorpay Test Mode subscription ordering and HMAC verification' },
    { name: 'Admin', description: 'Role-based administrative monitoring and audits' },
  ],
  paths: {
    '/api/health': {
      get: {
        tags: ['Health & Stats'],
        summary: 'System health check',
        description: 'Returns API server status and connectivity indicator.',
        responses: {
          '200': {
            description: 'API is healthy and operational.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'DocuMind API is running' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/public/stats': {
      get: {
        tags: ['Health & Stats'],
        summary: 'Platform usage statistics',
        description: 'Public aggregate metrics (total users, total documents processed, AI tokens).',
        responses: {
          '200': {
            description: 'Aggregate platform statistics.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: {
                        totalUsers: { type: 'integer', example: 128 },
                        totalDocuments: { type: 'integer', example: 512 },
                        totalAIQueries: { type: 'integer', example: 2048 },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Register a new user',
        description: 'Creates a user record with bcrypt-hashed password in PostgreSQL.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'email', 'password'],
                properties: {
                  name: { type: 'string', example: 'Alex Developer' },
                  email: { type: 'string', format: 'email', example: 'alex@example.com' },
                  password: { type: 'string', format: 'password', example: 'password123' },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'User registered successfully.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'User registered successfully' },
                    data: { $ref: '#/components/schemas/User' },
                  },
                },
              },
            },
          },
          '400': { $ref: '#/components/responses/400ValidationError' },
          '409': { $ref: '#/components/responses/409Conflict' },
          '500': { $ref: '#/components/responses/500ServerError' },
        },
      },
    },
    '/api/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Log in to user account',
        description: 'Verifies credentials and returns a signed JSON Web Token (JWT).',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', format: 'email', example: 'alex@example.com' },
                  password: { type: 'string', format: 'password', example: 'password123' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Authentication successful. Returns JWT.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
                    data: { $ref: '#/components/schemas/User' },
                  },
                },
              },
            },
          },
          '400': { $ref: '#/components/responses/400ValidationError' },
          '401': { $ref: '#/components/responses/401Unauthorized' },
          '500': { $ref: '#/components/responses/500ServerError' },
        },
      },
    },
    '/api/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Get current user profile',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Current user profile.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/User' },
                  },
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/401Unauthorized' },
          '404': { $ref: '#/components/responses/404NotFound' },
          '500': { $ref: '#/components/responses/500ServerError' },
        },
      },
    },
    '/api/documents': {
      post: {
        tags: ['Documents'],
        summary: 'Upload and process PDF document',
        description: 'Uploads a PDF file (max 10MB) and triggers the background ingestion pipeline.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['file'],
                properties: {
                  file: { type: 'string', format: 'binary', description: 'PDF file to upload' },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'File accepted and ingestion pipeline triggered.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/Document' },
                  },
                },
              },
            },
          },
          '400': { $ref: '#/components/responses/400ValidationError' },
          '401': { $ref: '#/components/responses/401Unauthorized' },
          '413': { $ref: '#/components/responses/413PayloadTooLarge' },
          '500': { $ref: '#/components/responses/500ServerError' },
        },
      },
      get: {
        tags: ['Documents'],
        summary: 'List user documents',
        description: 'Retrieves all documents owned by the authenticated user.',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'List of documents.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Document' },
                    },
                  },
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/401Unauthorized' },
          '500': { $ref: '#/components/responses/500ServerError' },
        },
      },
    },
    '/api/documents/{id}': {
      get: {
        tags: ['Documents'],
        summary: 'Get single document details',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
            description: 'Document UUID',
          },
        ],
        responses: {
          '200': {
            description: 'Document metadata.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/Document' },
                  },
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/401Unauthorized' },
          '404': { $ref: '#/components/responses/404NotFound' },
          '500': { $ref: '#/components/responses/500ServerError' },
        },
      },
      delete: {
        tags: ['Documents'],
        summary: 'Delete document',
        description: 'Deletes document, vector embeddings in ChromaDB, and disk storage in a transaction.',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
            description: 'Document UUID',
          },
        ],
        responses: {
          '200': {
            description: 'Document deleted successfully.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Document deleted successfully' },
                  },
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/401Unauthorized' },
          '404': { $ref: '#/components/responses/404NotFound' },
          '500': { $ref: '#/components/responses/500ServerError' },
        },
      },
    },
    '/api/documents/{id}/search': {
      post: {
        tags: ['Documents'],
        summary: 'Semantic vector search on document',
        description: 'Queries ChromaDB using OpenRouter Nemotron-3 embeddings.',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
            description: 'Document UUID',
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['query'],
                properties: {
                  query: { type: 'string', example: 'What are the main performance metrics?' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Top relevant text chunks and cosine similarity scores.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    results: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          chunkIndex: { type: 'integer' },
                          text: { type: 'string' },
                          score: { type: 'number' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          '400': { $ref: '#/components/responses/400ValidationError' },
          '401': { $ref: '#/components/responses/401Unauthorized' },
          '404': { $ref: '#/components/responses/404NotFound' },
          '500': { $ref: '#/components/responses/500ServerError' },
        },
      },
    },
    '/api/ai/chat/stream': {
      post: {
        tags: ['AI & RAG'],
        summary: 'Stream RAG answer via SSE',
        description: 'Streams Groq LLM tokens using Server-Sent Events (SSE).',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['documentId', 'question'],
                properties: {
                  documentId: { type: 'string', format: 'uuid' },
                  question: { type: 'string', example: 'Explain the methodology used in this document.' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'SSE stream of text tokens.',
            content: {
              'text/event-stream': {
                schema: { type: 'string', example: 'data: {"text":"The methodology..."}\n\n' },
              },
            },
          },
          '400': { $ref: '#/components/responses/400ValidationError' },
          '401': { $ref: '#/components/responses/401Unauthorized' },
          '404': { $ref: '#/components/responses/404NotFound' },
          '429': { $ref: '#/components/responses/429RateLimited' },
          '500': { $ref: '#/components/responses/500ServerError' },
        },
      },
    },
    '/api/ai/agent': {
      post: {
        tags: ['AI & RAG'],
        summary: 'Run multi-step autonomous agent',
        description: 'Runs autonomous function-calling agent (summary, quiz generator, cross-search).',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['documentId', 'message'],
                properties: {
                  documentId: { type: 'string', format: 'uuid' },
                  message: { type: 'string', example: 'Summarize the document and generate a 5-question quiz.' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Agent execution results and tool call outputs.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    toolsUsed: { type: 'array', items: { type: 'string' } },
                    answer: { type: 'string' },
                    summary: { type: 'object' },
                    quiz: { type: 'object' },
                  },
                },
              },
            },
          },
          '400': { $ref: '#/components/responses/400ValidationError' },
          '401': { $ref: '#/components/responses/401Unauthorized' },
          '404': { $ref: '#/components/responses/404NotFound' },
          '429': { $ref: '#/components/responses/429RateLimited' },
          '500': { $ref: '#/components/responses/500ServerError' },
        },
      },
    },
    '/api/chat/sessions/{documentId}': {
      get: {
        tags: ['Chat History'],
        summary: 'Get chat history for document',
        description: 'Fetches persistent chat messages stored in MongoDB for the given document.',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'documentId',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
            description: 'Document UUID',
          },
        ],
        responses: {
          '200': {
            description: 'List of previous chat messages.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/ChatMessage' },
                    },
                  },
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/401Unauthorized' },
          '404': { $ref: '#/components/responses/404NotFound' },
          '500': { $ref: '#/components/responses/500ServerError' },
        },
      },
    },
    '/api/payments/create-order': {
      post: {
        tags: ['Payments'],
        summary: 'Create Razorpay payment order',
        description: 'Generates a server-side order in Razorpay (Test Mode) for ₹499 (49900 paise).',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: false,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  plan: { type: 'string', enum: ['PRO'], default: 'PRO' },
                  amount: { type: 'integer', default: 49900 },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Order created with Razorpay.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    order: { $ref: '#/components/schemas/PaymentOrder' },
                  },
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/401Unauthorized' },
          '500': { $ref: '#/components/responses/500ServerError' },
        },
      },
    },
    '/api/payments/verify': {
      post: {
        tags: ['Payments'],
        summary: 'Verify Razorpay payment signature',
        description: 'Verifies HMAC SHA-256 digital signature and upgrades user to PRO plan.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['razorpay_order_id', 'razorpay_payment_id', 'razorpay_signature'],
                properties: {
                  razorpay_order_id: { type: 'string', example: 'order_test_987654321' },
                  razorpay_payment_id: { type: 'string', example: 'pay_test_123456789' },
                  razorpay_signature: { type: 'string', example: '8f7a6b5c4d3e2f1...' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Payment signature verified. User upgraded to PRO.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Payment verified successfully.' },
                    data: { $ref: '#/components/schemas/User' },
                  },
                },
              },
            },
          },
          '400': { $ref: '#/components/responses/400ValidationError' },
          '401': { $ref: '#/components/responses/401Unauthorized' },
          '500': { $ref: '#/components/responses/500ServerError' },
        },
      },
    },
    '/api/admin/documents': {
      get: {
        tags: ['Admin'],
        summary: 'Get all platform documents (Admin only)',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'List of all system documents with user associations.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Document' },
                    },
                  },
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/401Unauthorized' },
          '403': { $ref: '#/components/responses/403Forbidden' },
          '500': { $ref: '#/components/responses/500ServerError' },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Provide your JSON Web Token in the format: Bearer <token>',
      },
    },
    schemas: {
      ErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string', example: 'Validation failed' },
          error: {
            type: 'object',
            properties: {
              code: {
                type: 'string',
                enum: [
                  'VALIDATION_ERROR',
                  'UNAUTHORIZED',
                  'FORBIDDEN',
                  'NOT_FOUND',
                  'CONFLICT',
                  'PAYLOAD_TOO_LARGE',
                  'RATE_LIMITED',
                  'INTERNAL_SERVER_ERROR',
                ],
                example: 'VALIDATION_ERROR',
              },
              message: { type: 'string', example: 'Validation failed' },
              details: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    field: { type: 'string', example: 'email' },
                    message: { type: 'string', example: 'Invalid email format' },
                  },
                },
              },
            },
          },
        },
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid', example: 'd142ea8c-c714-4a81-add1-3dade70b4104' },
          name: { type: 'string', example: 'Alex Developer' },
          email: { type: 'string', format: 'email', example: 'alex@example.com' },
          role: { type: 'string', enum: ['USER', 'ADMIN'], example: 'USER' },
          subscriptionPlan: { type: 'string', enum: ['FREE', 'PRO'], example: 'FREE' },
          subscriptionStatus: { type: 'string', enum: ['ACTIVE', 'INACTIVE', 'CANCELLED'], example: 'ACTIVE' },
        },
      },
      Document: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid', example: '2220a655-83b0-4792-b2d9-dbbf42c2a4d7' },
          name: { type: 'string', example: 'research_paper.pdf' },
          originalFileName: { type: 'string', example: 'research_paper.pdf' },
          fileSize: { type: 'integer', example: 1048576 },
          status: { type: 'string', enum: ['UPLOADED', 'PROCESSING', 'READY', 'FAILED'], example: 'READY' },
          createdAt: { type: 'string', format: 'date-time', example: '2026-08-20T04:00:00.000Z' },
        },
      },
      ChatMessage: {
        type: 'object',
        properties: {
          role: { type: 'string', enum: ['user', 'assistant', 'system'], example: 'user' },
          content: { type: 'string', example: 'Summarize key findings in Section 3.' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      PaymentOrder: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'order_test_987654321' },
          amount: { type: 'integer', example: 49900 },
          currency: { type: 'string', example: 'INR' },
          keyId: { type: 'string', example: 'rzp_test_documind_test_key' },
        },
      },
    },
    responses: {
      '400ValidationError': {
        description: 'Bad Request / Request Body Validation Failed',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
          },
        },
      },
      '401Unauthorized': {
        description: 'Unauthorized: Missing or invalid JWT Bearer token',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
          },
        },
      },
      '403Forbidden': {
        description: 'Forbidden: Insufficient role permissions (Admin required)',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
          },
        },
      },
      '404NotFound': {
        description: 'Resource Not Found or Unauthorized Resource Ownership',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
          },
        },
      },
      '409Conflict': {
        description: 'Conflict: Resource already exists (e.g. email registered)',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
          },
        },
      },
      '413PayloadTooLarge': {
        description: 'Payload Too Large: File exceeds maximum allowed 10MB limit',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
          },
        },
      },
      '429RateLimited': {
        description: 'Rate Limited: Maximum requests per hour exceeded',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
          },
        },
      },
      '500ServerError': {
        description: 'Internal Server Error',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
          },
        },
      },
    },
  },
};
