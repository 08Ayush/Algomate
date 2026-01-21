export { Event, EventRegistration } from './domain/entities/Event';
export type { IEventRepository, IEventRegistrationRepository } from './domain/repositories/IEventRepository';
export { CreateEventUseCase } from './application/use-cases/CreateEventUseCase';
export { RegisterForEventUseCase } from './application/use-cases/RegisterForEventUseCase';
export type { CreateEventDto, RegisterForEventDto } from './application/dto/EventDto';
export { CreateEventDtoSchema, RegisterForEventDtoSchema } from './application/dto/EventDto';
export { SupabaseEventRepository, SupabaseEventRegistrationRepository } from './infrastructure/persistence/SupabaseEventRepository';
