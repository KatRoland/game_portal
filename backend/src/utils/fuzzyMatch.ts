export function levenshteinDistance(a: string, b: string): number {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;

    const matrix = [];

    for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i];
    }

    for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1
                );
            }
        }
    }

    return matrix[b.length][a.length];
}

export function isFuzzyMatch(guess: string, target: string, maxTypos = 2): boolean {
    const cleanGuess = guess.toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanTarget = target.toLowerCase().replace(/[^a-z0-9]/g, '');

    if (cleanGuess === cleanTarget) return true;
    if (cleanGuess.length === 0 || cleanTarget.length === 0) return false;

    const dist = levenshteinDistance(cleanGuess, cleanTarget);

    const dynamicThreshold = Math.max(1, Math.floor(cleanTarget.length / 5));
    const finalThreshold = Math.min(dynamicThreshold, maxTypos);

    return dist <= finalThreshold;
}
