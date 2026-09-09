import { onboardingRepository } from '@/repositories/onboarding-repository';
export async function startOnboarding(userId:string){await onboardingRepository.ensureProgress(userId);await onboardingRepository.markStep(userId,2);return{success:true as const}}
