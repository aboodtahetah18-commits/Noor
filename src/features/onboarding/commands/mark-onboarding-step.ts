import { onboardingRepository } from '@/repositories/onboarding-repository';
import type { OnboardingStep } from '../types/onboarding';
export function markOnboardingStep(userId:string,step:OnboardingStep,flags?:{obligationsReviewed?:boolean;controlsReviewed?:boolean}){return onboardingRepository.markStep(userId,step,flags)}
export function completeOnboarding(userId:string){return onboardingRepository.complete(userId)}
