document.addEventListener('DOMContentLoaded', () => {
    // Screens
    const setupScreen = document.getElementById('setup-screen');
    const gameScreen = document.getElementById('game-screen');

    // Setup Screen Elements
    const numPlayersInput = document.getElementById('num-players');
    const startGameBtn = document.getElementById('start-game-btn');

    // Game Screen Elements
    const currentPlayerDisplay = document.getElementById('current-player-display');
    const hostPlayerDisplay = document.getElementById('host-player-display');
    const currentLowDisplay = document.getElementById('current-low-display');
    const currentHighDisplay = document.getElementById('current-high-display');
    const optimalGuessDisplay = document.getElementById('optimal-guess-display');
    
    const playerGuessInput = document.getElementById('player-guess');
    const keypadButtons = document.querySelectorAll('#keypad .key');
    const submitGuessBtn = document.getElementById('submit-guess-btn');

    const hostFeedbackSection = document.getElementById('host-feedback-section');
    const submittedGuessValueDisplay = document.getElementById('submitted-guess-value');
    const feedbackLowerBtn = document.getElementById('feedback-lower-btn');
    const feedbackHigherBtn = document.getElementById('feedback-higher-btn');
    const feedbackCorrectBtn = document.getElementById('feedback-correct-btn');

    const guessHistoryList = document.getElementById('guess-history-list');
    const roundResultMessage = document.getElementById('round-result-message');
    const newRoundBtn = document.getElementById('new-round-btn');
    const resetGameBtn = document.getElementById('reset-game-btn');

    // Game State
    let numPlayers = 2;
    let currentPlayerIndex = 0; // Player 1 is 0, Player 2 is 1, etc.
    let hostPlayerIndex = 0; 
    let currentLow = 1;
    let currentHigh = 100;
    let actualSecretNumber = null; // Only known by the host in a real game, for simulation/dev can be set
    let guessHistory = []; // Stores {player, guess, newLow, newHigh, wasCorrect}
    let validRangeNumbers = []; // Numbers that formed previous ranges, cannot be guessed.
    let playersWhoHaveGuessedThisSubRound = new Set(); // Players who made a guess since last range update

    // --- SETUP ---
    startGameBtn.addEventListener('click', () => {
        numPlayers = parseInt(numPlayersInput.value);
        if (numPlayers >= 2 && numPlayers <= 10) {
            initializeGame();
            setupScreen.classList.remove('active');
            gameScreen.classList.add('active');
        } else {
            alert("Please enter a number of players between 2 and 10.");
        }
    });

    resetGameBtn.addEventListener('click', () => {
        gameScreen.classList.remove('active');
        setupScreen.classList.add('active');
        // Full reset of state needed here if re-initializing
        numPlayersInput.value = "2"; // Default back
        playerGuessInput.value = "";
        hostPlayerIndex = 0; // Reset host to Player 1
        // currentPlayerIndex will be set by initializeGame if we call it
        // or we can set it here: currentPlayerIndex = (hostPlayerIndex + 1) % (numPlayers || 2);
        playersWhoHaveGuessedThisSubRound.clear();
        // Consider calling initializeGame() or a more specific reset function
        // For now, just ensure critical state is reset for when setup screen leads to initializeGame
    });

    // --- INITIALIZATION ---
    function initializeGame() {
        hostPlayerIndex = 0;    // Player 1 is the first host
        currentPlayerIndex = (hostPlayerIndex + 1) % numPlayers; // Player to the left of host starts
        currentLow = 1;
        currentHigh = 100;
        guessHistory = [];
        validRangeNumbers = [1, 100]; // Initial range boundaries
        playersWhoHaveGuessedThisSubRound.clear();
        playerGuessInput.value = "";
        hostFeedbackSection.classList.add('hidden');
        roundResultMessage.classList.add('hidden'); // Hide result message
        roundResultMessage.textContent = "";
        submitGuessBtn.classList.remove('hidden');
        newRoundBtn.classList.add('hidden');
        updateGameDisplay();
        calculateAndDisplayOptimalGuess();
    }

    // --- KEYPAD LOGIC ---
    keypadButtons.forEach(button => {
        button.addEventListener('click', () => {
            const value = button.textContent;
            if (button.classList.contains('clear')) {
                playerGuessInput.value = "";
            } else if (button.classList.contains('enter')) {
                submitGuessBtn.click(); // Trigger submit
            } else {
                if (playerGuessInput.value.length < 3) { // Max 3 digits for 1-100
                    playerGuessInput.value += value;
                }
            }
        });
    });

    // --- GUESS SUBMISSION ---
    submitGuessBtn.addEventListener('click', () => {
        const guess = parseInt(playerGuessInput.value);

        if (isNaN(guess) || guess < currentLow || guess > currentHigh) {
            alert(`Invalid guess. Please enter a number between ${currentLow} and ${currentHigh}.`);
            return;
        }
        if (guess === currentLow || guess === currentHigh) {
             alert(`You cannot guess ${guess} as it's part of the current range boundary.`);
             return;
        }
        if (guessHistory.some(item => item.guess === guess) || validRangeNumbers.includes(guess)) {
            alert("This number has already been guessed or used as a range boundary. Try another.");
            return;
        }

        submittedGuessValueDisplay.textContent = guess;
        hostFeedbackSection.classList.remove('hidden');
        submitGuessBtn.classList.add('hidden'); // Hide submit until feedback
    });

    // --- HOST FEEDBACK HANDLING ---
    feedbackLowerBtn.addEventListener('click', () => processHostFeedback('lower'));
    feedbackHigherBtn.addEventListener('click', () => processHostFeedback('higher'));
    feedbackCorrectBtn.addEventListener('click', () => processHostFeedback('correct'));

    function processHostFeedback(feedback) {
        const guess = parseInt(playerGuessInput.value);
        let wasCorrect = false;

        const historyEntry = {
            player: currentPlayerIndex + 1,
            guess: guess,
            previousLow: currentLow,
            previousHigh: currentHigh,
        };

        if (feedback === 'lower') { // Secret number is lower than the guess
            currentHigh = guess;
            validRangeNumbers.push(guess);
            playersWhoHaveGuessedThisSubRound.clear(); // Range changed, reset who has guessed
        } else if (feedback === 'higher') { // Secret number is higher than the guess
            currentLow = guess;
            validRangeNumbers.push(guess);
            playersWhoHaveGuessedThisSubRound.clear(); // Range changed, reset who has guessed
        } else if (feedback === 'correct') {
            wasCorrect = true;
            // Player loses, game round ends
            roundResultMessage.textContent = `Player ${currentPlayerIndex + 1} guessed ${guess} and loses this round!`;
            roundResultMessage.classList.remove('hidden');
            // Potentially add $10 to pot, etc. (not implemented in UI)
            newRoundBtn.classList.remove('hidden');
            submitGuessBtn.classList.add('hidden'); // Hide submit button as round is over
        }
        
        historyEntry.newLow = currentLow;
        historyEntry.newHigh = currentHigh;
        historyEntry.wasCorrect = wasCorrect;
        guessHistory.push(historyEntry);

        playerGuessInput.value = ""; // Clear input for next guess
        hostFeedbackSection.classList.add('hidden');
        
        if (!wasCorrect) {
            if (currentPlayerIndex !== hostPlayerIndex) { // Don't add host to this list
                playersWhoHaveGuessedThisSubRound.add(currentPlayerIndex);
            }
            submitGuessBtn.classList.remove('hidden');
            advanceToNextPlayer();
            calculateAndDisplayOptimalGuess();
        }
        updateGameDisplay();
    }

    // --- NEW ROUND ---
    newRoundBtn.addEventListener('click', () => {
        // The loser becomes the new host
        hostPlayerIndex = currentPlayerIndex; 
        // Player to the left of the new host starts
        currentPlayerIndex = (hostPlayerIndex + 1) % numPlayers; 
        
        currentLow = 1;
        currentHigh = 100;
        guessHistory = []; // Clear history for the new round
        validRangeNumbers = [1, 100];
        playersWhoHaveGuessedThisSubRound.clear();
        
        roundResultMessage.classList.add('hidden'); // Hide for new round
        roundResultMessage.textContent = "";
        newRoundBtn.classList.add('hidden');
        submitGuessBtn.classList.remove('hidden');
        updateGameDisplay();
        calculateAndDisplayOptimalGuess();
    });

    // --- GAME LOGIC & UPDATES ---
    function advanceToNextPlayer() {
        // Handle edge case of single player
        if (numPlayers <= 1) {
            currentPlayerIndex = hostPlayerIndex;
            return;
        }
        
        // Get next player in sequence
        let nextPlayer = (currentPlayerIndex + 1) % numPlayers;
        
        // Check if next player would be the Host
        if (nextPlayer === hostPlayerIndex) {
            // Count non-host players who have guessed in this sub-round
            let nonHostPlayers = 0;
            let nonHostPlayersWhoGuessed = 0;
            
            // Loop through all player indices
            for (let i = 0; i < numPlayers; i++) {
                if (i !== hostPlayerIndex) {
                    nonHostPlayers++;
                    if (playersWhoHaveGuessedThisSubRound.has(i)) {
                        nonHostPlayersWhoGuessed++;
                    }
                }
            }
            
            // If all non-host players have guessed, it's Host's forced turn
            if (nonHostPlayersWhoGuessed >= nonHostPlayers) {
                currentPlayerIndex = hostPlayerIndex;
            } else {
                // Skip host and go to next player
                currentPlayerIndex = (hostPlayerIndex + 1) % numPlayers;
            }
        } else {
            // Standard case - next player is not the host
            currentPlayerIndex = nextPlayer;
        }
    }

    function updateGameDisplay() {
        let playerTurnText = `Player ${currentPlayerIndex + 1}`;
        
        // Check if it's the host's forced turn
        if (currentPlayerIndex === hostPlayerIndex) {
            // Count non-host players who have guessed
            let nonHostPlayers = 0;
            let nonHostPlayersWhoGuessed = 0;
            
            for (let i = 0; i < numPlayers; i++) {
                if (i !== hostPlayerIndex) {
                    nonHostPlayers++;
                    if (playersWhoHaveGuessedThisSubRound.has(i)) {
                        nonHostPlayersWhoGuessed++;
                    }
                }
            }
            
            // If all non-host players have guessed, it's a forced turn
            if (nonHostPlayersWhoGuessed >= nonHostPlayers && numPlayers > 1) {
                playerTurnText += " (Host's Forced Guess)";
            }
        }
        
        currentPlayerDisplay.textContent = playerTurnText;
        currentPlayerDisplay.classList.toggle('highlight', true); // Always highlight current player
        hostPlayerDisplay.textContent = `Player ${hostPlayerIndex + 1}`;
        currentLowDisplay.textContent = currentLow;
        currentHighDisplay.textContent = currentHigh;

        // Update guess history display
        guessHistoryList.innerHTML = ""; // Clear previous history
        [...guessHistory].reverse().forEach(item => {
            const listItem = document.createElement('li');
            let text = `P${item.player} guessed ${item.guess}. `;
            if (item.wasCorrect) {
                text += `Correct! P${item.player} loses.`;
            } else {
                text += `Range: ${item.newLow}-${item.newHigh}.`;
            }
            listItem.textContent = text;
            guessHistoryList.appendChild(listItem);
        });
    }

    function calculateAndDisplayOptimalGuess() {
        // Enhanced optimal guess calculation based on different strategies
        
        // Check if it's the host's forced turn
        if (currentPlayerIndex === hostPlayerIndex) {
            // Count non-host players who have guessed
            let nonHostPlayers = 0;
            let nonHostPlayersWhoGuessed = 0;
            
            for (let i = 0; i < numPlayers; i++) {
                if (i !== hostPlayerIndex) {
                    nonHostPlayers++;
                    if (playersWhoHaveGuessedThisSubRound.has(i)) {
                        nonHostPlayersWhoGuessed++;
                    }
                }
            }
            
            // If all non-host players have guessed, it's a forced turn
            if (nonHostPlayersWhoGuessed >= nonHostPlayers && numPlayers > 1) {
                const forcedGuess = calculateHostForcedGuess();
                if (forcedGuess) {
                    optimalGuessDisplay.innerHTML = `<strong>Host's Forced Guess:</strong> ${forcedGuess} (closest to secret number)`;
                    // Add a visual indicator to the game screen
                    const hostGuessIndicator = document.createElement('div');
                    hostGuessIndicator.className = 'host-guess-indicator';
                    hostGuessIndicator.textContent = `Auto-selecting for host: ${forcedGuess}`;
                    
                    // Insert the indicator before the guess input section
                    const guessInputSection = document.getElementById('guess-input-section');
                    if (guessInputSection.previousElementSibling.className !== 'host-guess-indicator') {
                        guessInputSection.parentNode.insertBefore(hostGuessIndicator, guessInputSection);
                    }
                    
                    // Auto-submit the host's guess if we have a valid forced guess
                    if (isValidGuess(forcedGuess)) {
                        playerGuessInput.value = forcedGuess;
                        submitGuessBtn.textContent = `Auto-submitting ${forcedGuess}...`;
                        setTimeout(() => {
                            submitGuessBtn.click();
                            // Reset button text after submission
                            setTimeout(() => {
                                submitGuessBtn.textContent = "Submit Guess";
                                // Remove the indicator after processing
                                const indicators = document.getElementsByClassName('host-guess-indicator');
                                while (indicators.length > 0) {
                                    indicators[0].parentNode.removeChild(indicators[0]);
                                }
                            }, 500);
                        }, 1500); // Slightly longer delay for better UI feedback
                    } else {
                        optimalGuessDisplay.innerHTML = "<strong>Host's Forced Guess:</strong> No valid guesses available!";
                    }
                } else {
                    optimalGuessDisplay.innerHTML = "<strong>Host's Forced Guess:</strong> Unable to calculate - need secret number.";
                }
                return; // Don't calculate optimal guess for host in this scenario
            }
        }

        const guessableSlots = currentHigh - currentLow - 1;
        let optimalGuess = "";
        let strategyExplanation = "";

        if (guessableSlots <= 0) {
            optimalGuess = "No valid guesses!";
        } else if (guessableSlots === 1) {
            optimalGuess = `Forced to guess ${currentLow + 1}`;
            strategyExplanation = "Only one possible guess.";
        } else {
            // Determine which strategy to use based on range size
            if (guessableSlots <= 5) {
                // Defensive strategy for small ranges
                const defensiveGuess = calculateDefensiveGuess();
                optimalGuess = defensiveGuess.guess;
                strategyExplanation = defensiveGuess.explanation;
            } else if (guessableSlots <= 20) {
                // Trap strategy for medium ranges
                const trapResult = calculateTrapGuess();
                if (trapResult.viable) {
                    optimalGuess = trapResult.guess;
                    strategyExplanation = trapResult.explanation;
                } else {
                    // Fallback to defensive if trap not viable
                    const defensiveGuess = calculateDefensiveGuess();
                    optimalGuess = defensiveGuess.guess;
                    strategyExplanation = "Trap not viable. " + defensiveGuess.explanation;
                }
            } else {
                // Aggressive/bisection strategy for large ranges
                const aggressiveGuess = calculateAggressiveGuess();
                optimalGuess = aggressiveGuess.guess;
                strategyExplanation = aggressiveGuess.explanation;
            }
        }
        
        // Display the optimal guess with strategy explanation
        if (optimalGuess && strategyExplanation) {
            optimalGuessDisplay.innerHTML = `<strong>${optimalGuess}</strong><br><small>${strategyExplanation}</small>`;
        } else {
            optimalGuessDisplay.innerHTML = optimalGuess;
        }
    }

    // Helper function to check if a number is a valid guess
    function isValidGuess(num) {
        return num > currentLow && 
               num < currentHigh && 
               !guessHistory.some(h => h.guess === num) && 
               !validRangeNumbers.includes(num);
    }

    // Calculate defensive guess - pick numbers close to boundaries to minimize risk
    function calculateDefensiveGuess() {
        // Try numbers close to boundaries (safer play)
        const lowerOption = currentLow + 1;
        const upperOption = currentHigh - 1;
        
        // Check if these options are valid
        const lowerValid = isValidGuess(lowerOption);
        const upperValid = isValidGuess(upperOption);
        
        if (lowerValid && upperValid) {
            // If both are valid, choose the one that's less likely to be the secret number
            // Simple heuristic: if more guesses have been higher than lower, guess high
            const higherGuesses = guessHistory.filter(h => h.guess > (currentLow + currentHigh) / 2).length;
            const lowerGuesses = guessHistory.filter(h => h.guess < (currentLow + currentHigh) / 2).length;
            
            if (higherGuesses >= lowerGuesses) {
                return {
                    guess: `Defensive: ${upperOption}`,
                    explanation: "Playing it safe near the upper boundary."
                };
            } else {
                return {
                    guess: `Defensive: ${lowerOption}`,
                    explanation: "Playing it safe near the lower boundary."
                };
            }
        } else if (lowerValid) {
            return {
                guess: `Defensive: ${lowerOption}`,
                explanation: "Playing it safe near the lower boundary."
            };
        } else if (upperValid) {
            return {
                guess: `Defensive: ${upperOption}`,
                explanation: "Playing it safe near the upper boundary."
            };
        }
        
        // If boundaries aren't valid, find closest valid number to a boundary
        let bestGuess = null;
        let minDistance = Infinity;
        
        for (let num = currentLow + 1; num < currentHigh; num++) {
            if (isValidGuess(num)) {
                const distanceToBoundary = Math.min(num - currentLow, currentHigh - num);
                if (distanceToBoundary < minDistance) {
                    minDistance = distanceToBoundary;
                    bestGuess = num;
                }
            }
        }
        
        if (bestGuess !== null) {
            return {
                guess: `Defensive: ${bestGuess}`,
                explanation: "Playing it safe near a boundary."
            };
        }
        
        // Fallback to bisection if no defensive options work
        return calculateAggressiveGuess();
    }

    // Calculate trap guess - attempt to force a target player into a no-win situation
    function calculateTrapGuess() {
        // Target player calculation - "opposite" player
        let targetPlayerIndex = (currentPlayerIndex + Math.floor(numPlayers / 2)) % numPlayers;
        
        // Adjust if target is host - we'll target the next player after host
        if (targetPlayerIndex === hostPlayerIndex) {
            targetPlayerIndex = (targetPlayerIndex + 1) % numPlayers;
        }
        
        // Calculate turns to target (k)
        let k; // Number of guesses before target player's turn
        
        // Calculate distance between current player and target
        if (targetPlayerIndex > currentPlayerIndex) {
            k = targetPlayerIndex - currentPlayerIndex;
        } else {
            k = numPlayers + targetPlayerIndex - currentPlayerIndex;
        }
        
        // Adjust for host skipping - if host is between current and target
        // and it's not host's forced turn, the host gets skipped
        let isHostBetween = false;
        let nonHostPlayersWhoGuessed = 0;
        let nonHostPlayers = 0;
        
        // Count players who have guessed
        for (let i = 0; i < numPlayers; i++) {
            if (i !== hostPlayerIndex) {
                nonHostPlayers++;
                if (playersWhoHaveGuessedThisSubRound.has(i)) {
                    nonHostPlayersWhoGuessed++;
                }
            }
        }
        
        // Check if host is between current player and target
        if (hostPlayerIndex > currentPlayerIndex && hostPlayerIndex < targetPlayerIndex) {
            isHostBetween = true;
        } else if (currentPlayerIndex > targetPlayerIndex && 
                 (hostPlayerIndex > currentPlayerIndex || hostPlayerIndex < targetPlayerIndex)) {
            isHostBetween = true;
        }
        
        // If host is between and it's not their forced turn, reduce k by 1
        if (isHostBetween && nonHostPlayersWhoGuessed < nonHostPlayers) {
            k--;
        }
        
        // Safety checks
        if (k <= 0) k = 1;
        if (k > numPlayers - 1) k = numPlayers - 1;

        // Calculate trap guesses
        // Trap Guess 1: if number is LOWER than our guess
        let G_trap1 = currentLow + k + 1;
        
        // Trap Guess 2: if number is HIGHER than our guess
        let G_trap2 = currentHigh - k - 1;
        
        // Find valid trap guesses
        let candidateGuesses = [];
        if (isValidGuess(G_trap1)) {
            candidateGuesses.push({
                guess: G_trap1,
                complementarySlots: currentHigh - (G_trap1 + 1) - 1
            });
        }
        if (isValidGuess(G_trap2) && G_trap2 !== G_trap1) {
            candidateGuesses.push({
                guess: G_trap2,
                complementarySlots: (G_trap2 - 1) - currentLow - 1
            });
        }

        if (candidateGuesses.length > 0) {
            // If we have multiple trap options, prefer the one that makes the other segment larger
            let bestTrap;
            if (candidateGuesses.length === 2) {
                bestTrap = candidateGuesses[0].complementarySlots >= candidateGuesses[1].complementarySlots 
                    ? candidateGuesses[0] 
                    : candidateGuesses[1];
            } else {
                bestTrap = candidateGuesses[0];
            }
            
            return {
                guess: `Trap: ${bestTrap.guess}`,
                explanation: `Setting trap for Player ${targetPlayerIndex + 1} with ${k-1} slots for intermediates.`,
                viable: true
            };
        }
        
        // No viable trap
        return { viable: false };
    }

    // Calculate aggressive/bisection guess - quickly narrow down the range
    function calculateAggressiveGuess() {
        // Find a guess close to the middle of the range
        const idealMid = Math.floor((currentLow + currentHigh) / 2);
        
        // Helper function to find next valid guess near a target
        function findNearestValidGuess(target) {
            if (isValidGuess(target)) return target;
            
            // Search outward from target
            for (let offset = 1; offset < (currentHigh - currentLow); offset++) {
                if (target - offset > currentLow && isValidGuess(target - offset)) {
                    return target - offset;
                }
                if (target + offset < currentHigh && isValidGuess(target + offset)) {
                    return target + offset;
                }
            }
            return null;
        }
        
        const midGuess = findNearestValidGuess(idealMid);
        
        if (midGuess !== null) {
            // Check if we're really close to midpoint or had to adjust a lot
            const midpointDeviation = Math.abs(midGuess - idealMid) / (currentHigh - currentLow);
            
            if (midpointDeviation <= 0.1) {
                return {
                    guess: `Aggressive: ${midGuess}`,
                    explanation: "Cutting the range in half for maximum information gain."
                };
            } else {
                return {
                    guess: `Semi-Aggressive: ${midGuess}`,
                    explanation: "Approximating a bisection strategy with available numbers."
                };
            }
        }
        
        // If we can't find a valid guess near the middle, try any valid guess
        for (let num = currentLow + 1; num < currentHigh; num++) {
            if (isValidGuess(num)) {
                return {
                    guess: `Fallback: ${num}`,
                    explanation: "No ideal guess available - this is the safest option."
                };
            }
        }
        
        // If we get here, there are no valid guesses (shouldn't happen, but handle it)
        return {
            guess: "No valid guesses!",
            explanation: "All numbers in range have been used or excluded."
        };
    }

    // Calculate the host's forced guess - closest to secret number
    function calculateHostForcedGuess() {
        // Find all valid guesses in the current range
        const validGuesses = [];
        for (let num = currentLow + 1; num < currentHigh; num++) {
            if (isValidGuess(num)) {
                validGuesses.push(num);
            }
        }
        
        if (validGuesses.length === 0) {
            return null; // No valid guesses available
        }
        
        // If we only have one valid guess, that's the forced guess
        if (validGuesses.length === 1) {
            return validGuesses[0];
        }
        
        // Use a heuristic to estimate the secret number based on the guessing history
        // We'll look at the narrowing of the range over time
        let estimatedSecret = Math.floor((currentLow + currentHigh) / 2);
        
        // If there's a significant guess history, refine our estimate
        if (guessHistory.length >= 2) {
            // Look at the pattern of range adjustments
            // If the range was narrowed more from one side, the secret number
            // is likely closer to that side
            const rangeHistory = guessHistory.map(h => ({
                lowerRange: h.newLow,
                upperRange: h.newHigh
            }));
            
            // Calculate how much each boundary has moved relative to original range (1-100)
            const lowerMovement = (rangeHistory[rangeHistory.length - 1].lowerRange - 1) / 99;
            const upperMovement = (100 - rangeHistory[rangeHistory.length - 1].upperRange) / 99;
            
            // If one boundary moved more, secret is likely closer to the other boundary
            if (lowerMovement > upperMovement + 0.1) {
                // Lower boundary moved more, secret likely closer to upper boundary
                estimatedSecret = Math.floor(currentLow + (currentHigh - currentLow) * 0.7);
            } else if (upperMovement > lowerMovement + 0.1) {
                // Upper boundary moved more, secret likely closer to lower boundary
                estimatedSecret = Math.floor(currentLow + (currentHigh - currentLow) * 0.3);
            }
        }
        
        // Find the valid guess closest to our estimated secret number
        let closestGuess = validGuesses[0];
        let minDistance = Math.abs(validGuesses[0] - estimatedSecret);
        
        for (let i = 1; i < validGuesses.length; i++) {
            const distance = Math.abs(validGuesses[i] - estimatedSecret);
            if (distance < minDistance) {
                minDistance = distance;
                closestGuess = validGuesses[i];
            }
        }
        
        return closestGuess;
    }

    // Initial call if needed (e.g. if game starts automatically without setup screen for dev)
    // initializeGame(); 
});
