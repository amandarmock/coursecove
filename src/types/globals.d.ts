// eslint-disable-next-line @typescript-eslint/no-unused-vars -- Used for TypeScript interface augmentation
import { type CustomJwtSessionClaims } from "@clerk/types"

declare global {
  interface CustomJwtSessionClaims {
    metadata?: {
      onboardingComplete?: boolean
    }
  }
}

export {}
