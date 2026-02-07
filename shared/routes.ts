import { z } from 'zod';
import { insertUserSchema, insertDocumentSchema, insertChatSchema, insertMessageSchema, loginSchema, verifyOtpSchema, resendOtpSchema } from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
  unauthorized: z.object({
    message: z.string(),
  }),
};

export const api = {
  auth: {
    signup: {
      method: 'POST' as const,
      path: '/api/auth/signup',
      input: insertUserSchema,
      responses: {
        201: z.object({ message: z.string(), email: z.string() }),
        400: errorSchemas.validation,
      },
    },
    login: {
      method: 'POST' as const,
      path: '/api/auth/login',
      input: loginSchema,
      responses: {
        200: z.object({
          user: z.object({ id: z.number(), email: z.string(), name: z.string(), isVerified: z.boolean() })
        }),
        401: errorSchemas.unauthorized,
      },
    },
    verifyOtp: {
      method: 'POST' as const,
      path: '/api/auth/verify-otp',
      input: verifyOtpSchema,
      responses: {
        200: z.object({ message: z.string() }),
        400: errorSchemas.validation,
      },
    },
    resendOtp: {
      method: 'POST' as const,
      path: '/api/auth/resend-otp',
      input: resendOtpSchema,
      responses: {
        200: z.object({ message: z.string() }),
        400: errorSchemas.validation,
      },
    },
    logout: {
      method: 'POST' as const,
      path: '/api/auth/logout',
      responses: {
        200: z.object({ message: z.string() }),
      },
    },
    me: {
      method: 'GET' as const,
      path: '/api/auth/me',
      responses: {
        200: z.object({ id: z.number(), email: z.string(), name: z.string(), isVerified: z.boolean() }),
        401: errorSchemas.unauthorized,
      },
    },
  },
  documents: {
    list: {
      method: 'GET' as const,
      path: '/api/documents',
      responses: {
        200: z.array(z.any()), // Frontend will type this properly
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/documents/:id',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
    // Upload is multipart/form-data, input schema validation handled manually in route
    upload: {
      method: 'POST' as const,
      path: '/api/documents',
      responses: {
        201: z.any(),
      },
    },
  },
  chats: {
    list: {
      method: 'GET' as const,
      path: '/api/chats',
      responses: {
        200: z.array(z.any()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/chats',
      input: insertChatSchema.pick({ documentId: true, title: true }),
      responses: {
        201: z.any(),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/chats/:id',
      responses: {
        200: z.any(), // Returns chat with messages
        404: errorSchemas.notFound,
      },
    },
    sendMessage: {
      method: 'POST' as const,
      path: '/api/chats/:id/messages',
      input: z.object({ content: z.string(), documentIds: z.array(z.number()).optional() }),
      responses: {
        200: z.any(), // Stream response
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/chats/:id',
      responses: {
        200: z.any(),
        404: errorSchemas.notFound,
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
