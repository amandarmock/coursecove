import { type CustomJwtSessionClaims } from "@clerk/types"

declare global {
  interface CustomJwtSessionClaims {
    metadata?: {
      onboardingComplete?: boolean
    }
  }
}

export {}
