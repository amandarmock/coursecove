import { router } from './init';
import { appointmentTypesRouter } from './routers/appointmentTypes';
import { appointmentsRouter } from './routers/appointments';
import { membershipRouter } from './routers/membership';
import { locationsRouter } from './routers/locations';

/**
 * Root tRPC router
 * Combines all feature routers into one
 */
export const appRouter = router({
  appointmentTypes: appointmentTypesRouter,
  appointments: appointmentsRouter,
  membership: membershipRouter,
  locations: locationsRouter,
});

// Export type for use in frontend
export type AppRouter = typeof appRouter;
