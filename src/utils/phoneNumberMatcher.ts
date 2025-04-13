interface PhoneNumber {
  phone_number: string;
  phone_number_pretty: string;
  nickname?: string;
}

interface MatchScore {
  score: number;
  outboundNumber: string;
}

export const getAreaCode = (phoneNumber: string): string => {
  // Remove any non-digit characters and get first 4 digits
  const cleaned = phoneNumber.replace(/\D/g, '');
  return cleaned.slice(0, 4);
};

export const calculateMatchScore = (
  contactNumber: string,
  outboundNumber: string
): number => {
  const contactArea = getAreaCode(contactNumber);
  const outboundArea = getAreaCode(outboundNumber);

  // Compare each digit of the first 4 digits
  let score = 0;
  for (let i = 0; i < 4; i++) {
    if (contactArea[i] === outboundArea[i]) {
      score++;
    } else {
      break; // Stop counting if digits don't match
    }
  }

  return score;
};

export const findBestMatchingNumber = (
  contactNumber: string,
  availableNumbers: PhoneNumber[]
): string | null => {
  if (!availableNumbers.length) return null;

  const matches: MatchScore[] = availableNumbers.map((num) => ({
    score: calculateMatchScore(contactNumber, num.phone_number),
    outboundNumber: num.phone_number,
  }));

  // Sort by score in descending order
  matches.sort((a, b) => b.score - a.score);

  return matches[0].outboundNumber;
};

export const createNumberMatchingGroups = (
  contacts: { phoneNumber: string }[],
  availableNumbers: PhoneNumber[]
): Map<string, string[]> => {
  // Create a map of outbound numbers to contact numbers
  const matchingGroups = new Map<string, string[]>();

  // Initialize groups for each available number
  availableNumbers.forEach((num) => {
    matchingGroups.set(num.phone_number, []);
  });

  // Assign each contact to the best matching outbound number
  contacts.forEach((contact) => {
    const bestMatch = findBestMatchingNumber(contact.phoneNumber, availableNumbers);
    if (bestMatch) {
      const group = matchingGroups.get(bestMatch);
      if (group) {
        group.push(contact.phoneNumber);
      }
    }
  });

  return matchingGroups;
};