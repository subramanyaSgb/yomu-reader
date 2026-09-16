// Onboarding-seen gate (FR-35). Pure so it's testable; the UI reads/writes the flag.
import { getSetting, setSetting } from '../../lib/db/repo'

const KEY = 'onboarding:seen'

export async function hasSeenOnboarding(): Promise<boolean> {
  return (await getSetting<boolean>(KEY)) === true
}

export async function markOnboardingSeen(): Promise<void> {
  await setSetting(KEY, true)
}

/** Decide whether to show onboarding given the stored flag. */
export function shouldShowOnboarding(seen: boolean | undefined): boolean {
  return seen !== true
}
