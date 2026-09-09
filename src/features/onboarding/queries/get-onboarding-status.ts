import { onboardingRepository } from '@/repositories/onboarding-repository';
export function getOnboardingStatus(userId:string){return onboardingRepository.status(userId)}
