type EmailJobHandler = (data: any) => Promise<any>;

const handlers: Record<string, EmailJobHandler> = {};

export function registerEmailHandler(type: string, handler: EmailJobHandler) {
  console.log(`📧 Registering handler: ${type}`);
  handlers[type] = handler;
}

export function getEmailHandler(type: string): EmailJobHandler | undefined {
  return handlers[type];
}

export function getAllHandlers(): Record<string, EmailJobHandler> {
  return { ...handlers };
}

export function getHandlerTypes(): string[] {
  return Object.keys(handlers);
}
