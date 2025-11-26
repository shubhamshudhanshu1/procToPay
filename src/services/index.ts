// Services exports
export { configService } from './configService';
export type { OTPConfig, RateLimitConfig } from './configService';

import { contactService } from './contactService';
export { contactService };

export { otpService } from './otpService';

export { rateLimiterService } from './rateLimiterService';

export { emailService } from './emailService';

export { smsService } from './smsService';

export { authService } from './authService';

export default contactService;
