export interface ChecklistRequirements {
  camera: boolean;
  microphone: boolean;
  screen: boolean;
}

export function resolveChecklistRequirements(params: {
  antiCheatingEnabled: boolean;
  isPractice: boolean;
  voiceEnabled: boolean;
  chatEnabled: boolean;
}): ChecklistRequirements {
  const { antiCheatingEnabled, isPractice, voiceEnabled, chatEnabled } = params;

  if (antiCheatingEnabled) {
    return { camera: true, microphone: true, screen: true };
  }

  if (isPractice) {
    if (voiceEnabled) {
      return { camera: false, microphone: true, screen: false };
    }
    if (chatEnabled) {
      return { camera: false, microphone: false, screen: false };
    }
    return { camera: false, microphone: false, screen: false };
  }

  // Recruiter / general public interviews without anti-cheating: show all checks (skippable).
  return { camera: true, microphone: true, screen: true };
}

export function hasChecklistStep(requirements: ChecklistRequirements): boolean {
  return requirements.camera || requirements.microphone || requirements.screen;
}

export function isChecklistItemRequired(
  item: keyof ChecklistRequirements,
  requirements: ChecklistRequirements,
  antiCheatingEnabled: boolean,
  isPractice: boolean,
): boolean {
  if (!requirements[item]) return false;
  if (antiCheatingEnabled) return true;
  if (isPractice && item === "microphone") return true;
  return false;
}
